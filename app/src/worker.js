// Worker: fetches jobs from RabbitMQ and does the actual work (read transcript → embed → Elasticsearch).
// Run as many as you like (docker compose: WORKERS=n). Each session is written by one worker at a time
// (Redis lock) and every write of a read position is fenced (if_seq_no), so they never trip over each other.
//
// Jobs
//   ingest       { type: 'push', slug, sessionId, start, end, gz, hook, account, tenant_id }
//                                                       lines the hook pushed (gzip + base64), bytes start–end of the transcript
//                { type: 'hook', path, account }        local mode, older hook: read that session's new lines from the mount
//                { type: 'sync', slug, sessionId, batch } one file of a sync
//   maintenance  { type: 'sync', slugs|null }            plans a sync: one ingest job per file with unread bytes
//                { type: 'backfill-usage' | 'backfill-images' | 'recalc-costs' }
const { waitForEs, ensureIndices, es } = require('./es');
const { embed } = require('./embed');
const queue = require('./queue');
const lock = require('./lock');
const ing = require('./ingest');
const prices = require('./prices');
const { INDEX_LOG, WORKER_PREFETCH } = require('./config');

const { log, WORKER } = ing;
const redis = lock.client();
const BATCH_TTL_S = 86400;

/** Job context: progress + throttled `status` events (a sync's files all report under the sync's id). */
function context(job) {
  const statusId = job.batch?.id || job.id;
  let last = 0;
  const ctx = {
    id: job.id,
    statusId,
    label: job.label || job.type,
    progress: null,
    emit(force = false) {
      const now = Date.now();
      if (!force && now - last < 500) return;
      last = now;
      queue.publishEvent('status', { id: statusId, worker: WORKER, running: ctx.label, progress: ctx.progress });
    },
  };
  return ctx;
}

// ---------- sync batches (one sync = one progress bar, however many workers share its files) ----------
const batchKey = (id) => `batch:${id}`;
async function batchProgress(id) {
  const b = await redis.hgetall(batchKey(id));
  if (!b.total) return null;
  return {
    label: b.label, filesTotal: +b.total, filesDone: +b.done || 0, bytesTotal: +b.bytesTotal || 0, bytesDone: +b.bytesDone || 0,
    added: +b.added || 0, failed: +b.failed || 0, files: +b.files || 0, startedAt: b.startedAt, current: null,
  };
}
async function batchStep(batch, { added = 0, bytes = 0, failed = false }) {
  const k = batchKey(batch.id);
  const [[, done]] = await redis.multi()
    .hincrby(k, 'done', 1).hincrby(k, 'added', added).hincrby(k, 'bytesDone', bytes).hincrby(k, 'failed', failed ? 1 : 0)
    .exec();
  const p = await batchProgress(batch.id);
  if (!p) return;
  queue.publishEvent('status', { id: batch.id, worker: WORKER, running: p.label, progress: p });
  if (done === p.filesTotal) await finishSync(batch.id, p); // exactly one worker sees the last increment
}
async function finishSync(id, p) {
  const at = new Date().toISOString();
  log(`Sync done: +${p.added} messages from ${p.files} file(s)${p.failed ? `, ${p.failed} failed` : ''}`);
  await redis.set('recall:lastSyncAt', at);
  await redis.del(batchKey(id));
  queue.publishEvent('synced', { at });
  queue.publishEvent('done', { id, ok: true, result: { added: p.added, files: p.files, failed: p.failed } });
}

// ---------- ingest jobs ----------
async function handleIngest(job) {
  const where = job.path ? ing.parseHostPath(job.path) : { slug: job.slug, sessionId: job.sessionId };
  if (!where?.slug) return null;
  const ctx = context(job);
  if (job.batch) ctx.progress = await batchProgress(job.batch.id);
  const push = job.type === 'push';
  const opts = {
    ...where, account: job.account || null, hook: job.type === 'hook' || (push && job.hook),
    ...(push ? { chunk: ing.jobChunk(job), tenant: job.tenant_id || null, cwd: job.cwd || null } : {}),
  };
  let res;
  try {
    res = await lock.withLock(lock.sessionKey(where.slug, where.sessionId), (guard) => ing.ingestSession(opts, ctx, guard));
  } catch (e) {
    // an earlier push of this session is not written yet (two chunks on two workers, or it is being retried)
    if (e instanceof ing.GapError) return queue.BUSY;
    throw e;
  }
  if (!res) return queue.BUSY; // another worker has this session: try again in a moment
  const r = res.value;
  if (r.added || r.linked) {
    await es('POST', `/${INDEX_LOG}/_refresh`).catch(() => {}); // searchable before the UI is told
    queue.publishEvent('changed', [{ project: where.slug, session: where.sessionId, added: r.added }]);
  }
  if (job.type === 'hook' || (push && job.hook)) queue.publishEvent('hook', { at: new Date().toISOString() });
  if (job.batch) await batchStep(job.batch, { added: r.added, bytes: job.bytes || 0 });
  else queue.publishEvent('done', { id: ctx.statusId, ok: true, result: r });
  return r;
}

// ---------- maintenance jobs ----------
async function planSync(job) {
  await ing.loadSettings();
  const { files, todo } = await ing.planSync(job.slugs || null);
  if (!todo.length) {
    await finishSync(job.id, { added: 0, files, failed: 0 });
    return;
  }
  const startedAt = new Date().toISOString();
  await redis.multi()
    .hset(batchKey(job.id), { label: job.label || 'sync', total: todo.length, files, done: 0, added: 0, failed: 0, bytesTotal: todo.reduce((a, t) => a + t.bytes, 0), bytesDone: 0, startedAt })
    .expire(batchKey(job.id), BATCH_TTL_S)
    .exec();
  queue.publishEvent('status', { id: job.id, worker: WORKER, running: job.label || 'sync', progress: await batchProgress(job.id) });
  for (const t of todo) {
    await queue.publishJob('ingest', { type: 'sync', label: job.label || 'sync', slug: t.slug, sessionId: t.sessionId, bytes: t.bytes, batch: { id: job.id } });
  }
}

/**
 * Runs a one-off task on one worker at a time. If another worker holds it (or held it and died: the lock
 * runs out after a minute), the job comes back in 2 s; once the task is done its flag makes the rerun a no-op.
 */
async function once(name, job, fn) {
  const ctx = context(job);
  const res = await lock.withLock(`maint:${name}`, () => fn(ctx), { ttl: 60000 });
  if (!res) return queue.BUSY;
  queue.publishEvent('done', { id: job.id, ok: true, result: res.value ?? null });
  return res.value;
}

async function handleMaintenance(job) {
  switch (job.type) {
    case 'sync':
      return planSync(job);
    case 'backfill-usage':
      return once('backfill-usage', job, async (ctx) => {
        const s = await ing.loadSettings();
        if (s.usageBackfilled && s.usagePriced) return 0;
        const n = await ing.backfillUsage(ctx);
        await ing.saveSettings({ usageBackfilled: true, usagePriced: true });
        return n;
      });
    case 'backfill-images':
      return once('backfill-images', job, async (ctx) => {
        const s = await ing.loadSettings();
        if (s.imagesBackfilled) return 0;
        const n = await ing.backfillImages(ctx);
        await ing.saveSettings({ imagesBackfilled: true });
        return n;
      });
    case 'recalc-costs':
      // prices changed while another recalculation runs: run again after it, with the new prices
      return once('recalc-costs', job, async (ctx) => {
        ctx.progress = { label: ctx.label, filesTotal: 1, filesDone: 0, bytesTotal: 0, bytesDone: 0, added: 0, current: 'all API responses', startedAt: new Date().toISOString() };
        ctx.emit(true);
        prices.reset();
        return prices.recalculate(log);
      });
    default:
      log(`ERROR unknown maintenance job: ${job.type}`);
      return null;
  }
}

async function onDead(job, e) {
  log(`ERROR job ${job.label || job.type} failed for good, moved to the dead-letter queue: ${e.message}`);
  if (job.batch) await batchStep(job.batch, { failed: true }).catch(() => {});
  else queue.publishEvent('done', { id: job.id, ok: false, error: e.message });
}

// a failed try is not "running" any more (the retry reports again when it starts)
const onRetry = (job) => { if (!job.batch) queue.publishEvent('done', { id: job.id, ok: false, retrying: true }); };

// ---------- start ----------
(async () => {
  await queue.connect(log, { exitOnClose: true });
  log(`Worker ${WORKER} starting`);
  await waitForEs();
  // the API pulls the model; wait until it answers
  let dims = 0;
  for (let i = 0; !dims; i++) {
    try { dims = (await embed(['dimension probe']))[0].length; } catch (e) {
      if (i % 10 === 0) console.log('Waiting for the embedding model…', e.message);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  await ensureIndices(dims);
  await ing.loadSettings();
  await queue.subscribeEvents((type) => {
    if (type === 'settings') ing.loadSettings().catch(() => {});
    if (type === 'prices') prices.reset();
  });
  await queue.consume('ingest', handleIngest, { prefetch: WORKER_PREFETCH, onDead, onRetry, log });
  // maxBusy 1800: wait up to an hour for a long backfill on another worker
  await queue.consume('maintenance', handleMaintenance, { prefetch: 1, maxBusy: 1800, onDead, onRetry, log });
  log(`Worker ${WORKER} ready (${WORKER_PREFETCH} ingest job(s) at a time)`);
})().catch((e) => {
  console.error('Worker failed to start:', e);
  process.exit(1);
});

// docker stop: free our session locks so the jobs RabbitMQ hands to another worker don't wait out the TTL
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, async () => {
    await lock.releaseAll().catch(() => {});
    process.exit(0);
  });
}
