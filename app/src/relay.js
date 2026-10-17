// API side of the events fanout: what the workers report, kept for the Sync page and passed to the browser.
//   log      → recent log (last 300 lines) and the last error
//   status   → jobs running now and their progress (a sync reports under one id for all its files)
//   done     → job finished; also wakes anyone waiting for it (price recalculation)
//   changed  → sessions with new data (open chats refresh)
//   hook / synced / settings
const { EventEmitter } = require('events');
const queue = require('./queue');
const lock = require('./lock');

const bus = new EventEmitter();
bus.setMaxListeners(0);
const recentLog = [];
const jobs = new Map(); // status id → { running, progress, at }
const waiters = new Map(); // job id → resolve
let lastError = null;
let lastHookAt = null;
let lastSyncAt = null;
const STALE_MS = 3 * 60_000; // a worker that died mid-job stops reporting; forget it after this

function onEvent(type, data) {
  switch (type) {
    case 'log':
      recentLog.push(data);
      if (recentLog.length > 300) recentLog.shift();
      if (/ERROR/.test(data.msg)) lastError = data;
      bus.emit('log', data);
      break;
    case 'status':
      jobs.set(data.id, { running: data.running, progress: data.progress, at: Date.now() });
      bus.emit('status');
      break;
    case 'done': {
      jobs.delete(data.id);
      const w = waiters.get(data.id);
      if (w) { waiters.delete(data.id); w(data); }
      bus.emit('status');
      break;
    }
    case 'changed': bus.emit('changed', data); break;
    case 'hook': lastHookAt = data.at; break;
    case 'synced': lastSyncAt = data.at; break;
    case 'settings': bus.emit('settings'); break;
    default:
  }
}

/** The job to show: the one that reported last. */
function current() {
  const now = Date.now();
  let best = null;
  for (const [id, j] of jobs) {
    if (now - j.at > STALE_MS) { jobs.delete(id); continue; }
    if (!best || j.at > best.at) best = j;
  }
  return best ? { running: best.running, progress: best.progress } : { running: null, progress: null };
}

const syncRunning = () => [...jobs.values()].some((j) => Date.now() - j.at < STALE_MS && j.progress?.filesTotal > 1);

/** Resolves with the job's `done` event, or null after `ms`. */
function awaitDone(id, ms = 60000) {
  return new Promise((resolve) => {
    const t = setTimeout(() => { waiters.delete(id); resolve(null); }, ms);
    waiters.set(id, (d) => { clearTimeout(t); resolve(d); });
  });
}

async function start() {
  lastSyncAt = await lock.client().get('recall:lastSyncAt').catch(() => null);
  await queue.subscribeEvents(onEvent);
}

module.exports = {
  bus, recentLog, start, current, syncRunning, awaitDone,
  getLastError: () => lastError,
  getLastHookAt: () => lastHookAt,
  getLastSyncAt: () => lastSyncAt,
};
