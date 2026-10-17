// RabbitMQ: jobs (publish → fetch, persistent, at-least-once) and events (fanout, live UI updates).
//
//   recall.jobs (direct) ──ingest──────▶ recall.ingest       (quorum)  one session's new lines
//                        └─maintenance─▶ recall.maintenance  (quorum)  sync fan-out, backfills, cost recalc
//   recall.retry.busy  ──▶ recall.retry.busy  (2 s TTL)  ──dead-letters back to recall.jobs (same routing key)
//   recall.retry.fail  ──▶ recall.retry.fail  (10 s TTL) ──dead-letters back to recall.jobs
//   recall.dlq                                 (classic)  jobs that failed JOB_MAX_ATTEMPTS times
//   recall.events (fanout) ──▶ one exclusive queue per API process (log, status, changed, done…)
//
// A job is acked only after it is done (or re-published to a retry queue / the DLQ with a publisher confirm),
// so a worker that dies mid-job leaves it in the queue for another worker.
const amqp = require('amqplib');
const crypto = require('crypto');
const { RABBIT_URL, WORKER_PREFETCH, JOB_MAX_ATTEMPTS } = require('./config');

const EX_JOBS = 'recall.jobs';
const EX_EVENTS = 'recall.events';
const EX_RETRY_BUSY = 'recall.retry.busy';
const EX_RETRY_FAIL = 'recall.retry.fail';
const Q = { ingest: 'recall.ingest', maintenance: 'recall.maintenance', dlq: 'recall.dlq' };
const BUSY_DELAY_MS = 2000;
const FAIL_DELAY_MS = 10000;
const MAX_BUSY = 150; // ~5 min of "session is locked" before it counts as a failed attempt

let conn = null;
let pub = null; // confirm channel for publishing
const setups = []; // consumers / subscriptions to set up again after a reconnect

/**
 * Connects (retrying until RabbitMQ answers). exitOnClose: a worker exits on a lost connection and Docker
 * restarts it; the API reconnects in place so the UI stays up, and sets its subscriptions up again.
 */
async function connect(log = console.log, { exitOnClose = false } = {}) {
  for (let i = 0; ; i++) {
    try {
      // amqplib asks for frame_max 4096 by default; RabbitMQ 4.1 refuses anything under 8192
      const url = /[?&]frameMax=/.test(RABBIT_URL) ? RABBIT_URL : `${RABBIT_URL}${RABBIT_URL.includes('?') ? '&' : '?'}frameMax=131072`;
      conn = await amqp.connect(url);
      break;
    } catch (e) {
      if (i % 5 === 0) log(`Waiting for RabbitMQ… (${e.message})`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  conn.on('error', (e) => console.error('RabbitMQ error:', e.message));
  conn.on('close', () => {
    pub = null;
    if (exitOnClose) { console.error('RabbitMQ connection closed; exiting so Docker restarts this worker'); process.exit(1); }
    log('ERROR RabbitMQ connection lost; reconnecting');
    setTimeout(() => connect(log, { exitOnClose }).then(async () => {
      for (const fn of setups) await fn();
      log('RabbitMQ reconnected');
    }).catch((e) => console.error('reconnect failed:', e.message)), 2000);
  });
  pub = await conn.createConfirmChannel();
  pub.on('error', () => {});
  await topology(pub);
  return conn;
}

async function topology(ch) {
  await ch.assertExchange(EX_JOBS, 'direct', { durable: true });
  await ch.assertExchange(EX_EVENTS, 'fanout', { durable: true });
  for (const [name, rk] of [[Q.ingest, 'ingest'], [Q.maintenance, 'maintenance']]) {
    await ch.assertQueue(name, { durable: true, arguments: { 'x-queue-type': 'quorum' } });
    await ch.bindQueue(name, EX_JOBS, rk);
  }
  // classic, not quorum: peeking (get + return) would count towards a quorum queue's delivery limit and drop jobs
  await ch.assertQueue(Q.dlq, { durable: true });
  for (const [ex, ttl] of [[EX_RETRY_BUSY, BUSY_DELAY_MS], [EX_RETRY_FAIL, FAIL_DELAY_MS]]) {
    await ch.assertExchange(ex, 'direct', { durable: true });
    // no consumer: messages wait out the TTL, then dead-letter to recall.jobs keeping their routing key
    await ch.assertQueue(ex, { durable: true, arguments: { 'x-message-ttl': ttl, 'x-dead-letter-exchange': EX_JOBS } });
    for (const rk of ['ingest', 'maintenance']) await ch.bindQueue(ex, ex, rk);
  }
}

function publishRaw(exchange, rk, job, headers = {}) {
  if (!pub) return Promise.reject(new Error('RabbitMQ not connected'));
  return new Promise((resolve, reject) => {
    pub.publish(exchange, rk, Buffer.from(JSON.stringify(job)), {
      persistent: true, contentType: 'application/json', messageId: job.id, headers,
    }, (err) => (err ? reject(err) : resolve(job.id)));
  });
}

/** Publishes a job and resolves once the broker has it on disk (publisher confirm). */
function publishJob(rk, job) {
  const j = { id: crypto.randomUUID(), at: new Date().toISOString(), ...job };
  return publishRaw(EX_JOBS, rk, j, { 'x-attempts': 0 });
}

/** Fire-and-forget live event to every API process (not persistent: nobody needs a missed one later). */
function publishEvent(type, data) {
  if (!pub) return;
  try { pub.publish(EX_EVENTS, '', Buffer.from(JSON.stringify({ type, data })), { contentType: 'application/json' }); } catch {}
}

async function subscribeEvents(onEvent) {
  setups.push(() => subscribeOnce(onEvent));
  return subscribeOnce(onEvent);
}
async function subscribeOnce(onEvent) {
  const ch = await conn.createChannel();
  const { queue } = await ch.assertQueue('', { exclusive: true, autoDelete: true });
  await ch.bindQueue(queue, EX_EVENTS, '');
  await ch.consume(queue, (m) => {
    if (!m) return;
    try { const { type, data } = JSON.parse(m.content.toString()); onEvent(type, data); } catch {}
  }, { noAck: true });
}

const BUSY = Symbol('busy');

/**
 * Fetches jobs from a queue. handler(job) → result, or BUSY when the session is locked by another worker
 * (re-queued after 2 s). A thrown error retries after 10 s; after JOB_MAX_ATTEMPTS it goes to the DLQ and
 * onDead(job, error) is called.
 */
async function consume(rk, handler, { prefetch = WORKER_PREFETCH, maxBusy = MAX_BUSY, onDead = () => {}, onRetry = () => {}, log = console.log } = {}) {
  const ch = await conn.createChannel();
  await ch.prefetch(prefetch);
  await ch.consume(Q[rk], async (m) => {
    if (!m) return;
    const headers = m.properties.headers || {};
    let job;
    try { job = JSON.parse(m.content.toString()); } catch { ch.ack(m); return; } // unreadable: drop
    const attempts = Number(headers['x-attempts'] || 0);
    const busy = Number(headers['x-busy'] || 0);
    try {
      const r = await handler(job, { attempts, redelivered: m.fields.redelivered });
      if (r === BUSY && busy < maxBusy) {
        await publishRaw(EX_RETRY_BUSY, rk, job, { ...headers, 'x-busy': busy + 1 });
      } else if (r === BUSY) {
        throw new Error(`stayed locked for ${Math.round((maxBusy * BUSY_DELAY_MS) / 60000)} min`);
      }
      ch.ack(m);
    } catch (e) {
      try {
        if (attempts + 1 >= JOB_MAX_ATTEMPTS) {
          await publishRaw('', Q.dlq, job, { ...headers, 'x-attempts': attempts + 1, 'x-routing-key': rk, 'x-error': String(e.message).slice(0, 500), 'x-failed-at': new Date().toISOString() });
          await Promise.resolve(onDead(job, e)).catch(() => {});
        } else {
          log(`ERROR job ${job.label || rk} (try ${attempts + 1} of ${JOB_MAX_ATTEMPTS}, retrying in ${FAIL_DELAY_MS / 1000} s): ${e.message}`);
          await publishRaw(EX_RETRY_FAIL, rk, job, { ...headers, 'x-attempts': attempts + 1, 'x-busy': 0 });
          await Promise.resolve(onRetry(job, e)).catch(() => {});
        }
        ch.ack(m);
      } catch (e2) {
        // could not park it anywhere: give it back to the broker as is
        log(`ERROR could not re-queue job: ${e2.message}`);
        ch.nack(m, false, true);
      }
    }
  }, { noAck: false });
}

/** Waiting / in-flight jobs per queue and how many workers are fetching. */
async function stats() {
  const out = {};
  for (const [k, name] of Object.entries(Q)) {
    const r = await pub.checkQueue(name);
    out[k] = { waiting: r.messageCount, workers: r.consumerCount };
  }
  for (const [k, name] of [['retrying', EX_RETRY_FAIL], ['locked', EX_RETRY_BUSY]]) out[k] = { waiting: (await pub.checkQueue(name)).messageCount };
  return out;
}

/** Moves every dead job back to its queue with a fresh attempt count. */
async function retryDead() {
  let n = 0;
  for (;;) {
    const m = await pub.get(Q.dlq, { noAck: false });
    if (!m) break;
    const h = m.properties.headers || {};
    try {
      const job = JSON.parse(m.content.toString());
      await publishRaw(EX_JOBS, h['x-routing-key'] || 'ingest', job, { 'x-attempts': 0 });
      pub.ack(m);
      n++;
    } catch {
      pub.nack(m, false, true);
      break;
    }
  }
  return n;
}

/** The dead jobs, newest last, without taking them off the queue. */
async function peekDead(limit = 20) {
  const ch = await conn.createChannel();
  const out = [];
  try {
    for (let i = 0; i < limit; i++) {
      const m = await ch.get(Q.dlq, { noAck: false });
      if (!m) break;
      const h = m.properties.headers || {};
      let job = {};
      try { job = JSON.parse(m.content.toString()); } catch {}
      out.push({ id: job.id, label: job.label, type: job.type, session: job.sessionId || (job.path ? String(job.path).split('/').pop().replace(/\.jsonl$/, '') : null), error: h['x-error'] || null, failedAt: h['x-failed-at'] || null, attempts: h['x-attempts'] || null });
    }
  } finally {
    await ch.close().catch(() => {}); // closing without ack puts them all back
  }
  return out;
}

const connected = () => !!pub;

module.exports = { connect, publishJob, publishEvent, subscribeEvents, consume, stats, retryDead, peekDead, connected, BUSY, Q };
