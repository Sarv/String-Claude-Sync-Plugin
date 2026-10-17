// Redis locks: one worker per session at a time (and one runner per maintenance task).
//   SET lock:<key> <token> NX PX <ttl>   take it only if free; frees itself if the holder dies
//   heartbeat every ttl/3                extend while the job runs
//   release / extend by Lua              only the holder (same token) can touch it
// A lock can still expire under a holder that stalled; writes are fenced separately (if_seq_no on the
// read-position doc), so a stale holder's write is rejected rather than trusted.
const Redis = require('ioredis');
const crypto = require('crypto');
const { REDIS_URL, LOCK_TTL_MS } = require('./config');

let redis = null;
const held = new Map(); // key → token, so a stopping process can free its locks at once
function client() {
  if (!redis) {
    redis = new Redis(REDIS_URL, { maxRetriesPerRequest: 3, enableOfflineQueue: true, lazyConnect: false });
    redis.on('error', (e) => console.error('Redis error:', e.message));
  }
  return redis;
}

const RELEASE = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";
const EXTEND = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('pexpire', KEYS[1], ARGV[2]) else return 0 end";

async function acquire(key, ttl = LOCK_TTL_MS) {
  const token = crypto.randomUUID();
  const ok = await client().set(`lock:${key}`, token, 'PX', ttl, 'NX');
  return ok === 'OK' ? token : null;
}
const release = (key, token) => client().eval(RELEASE, 1, `lock:${key}`, token);
const extend = (key, token, ttl = LOCK_TTL_MS) => client().eval(EXTEND, 1, `lock:${key}`, token, ttl);

/**
 * Runs fn(guard) holding the lock; returns null without running it when someone else holds it.
 * guard.lost becomes true if the lock could not be extended (fn should stop writing; guard.check() throws).
 */
async function withLock(key, fn, { ttl = LOCK_TTL_MS } = {}) {
  const token = await acquire(key, ttl);
  if (!token) return null;
  held.set(key, token);
  const guard = {
    lost: false,
    check() { if (this.lost) throw new Error(`lost the lock on ${key}`); },
  };
  const beat = setInterval(() => {
    extend(key, token, ttl).then((r) => { if (!r) guard.lost = true; }).catch(() => {});
  }, Math.max(1000, Math.floor(ttl / 3)));
  try {
    return { value: await fn(guard) };
  } finally {
    clearInterval(beat);
    held.delete(key);
    await release(key, token).catch(() => {});
  }
}

/** On shutdown: free every lock this process holds, so the re-delivered jobs don't wait out the TTL. */
async function releaseAll() {
  await Promise.all([...held].map(([k, t]) => release(k, t).catch(() => {})));
  held.clear();
}

/** Takes several locks (sorted, so two callers never deadlock), waiting up to `wait` ms for each. */
async function withLocks(keys, fn, { wait = 60000, ttl = LOCK_TTL_MS } = {}) {
  const mine = [];
  const sorted = [...new Set(keys)].sort();
  const beat = setInterval(() => { for (const [k, t] of mine) extend(k, t, ttl).catch(() => {}); }, Math.max(1000, Math.floor(ttl / 3)));
  try {
    for (const k of sorted) {
      const until = Date.now() + wait;
      let t = null;
      while (!(t = await acquire(k, ttl))) {
        if (Date.now() > until) throw new Error(`timed out waiting for ${k}`);
        await new Promise((r) => setTimeout(r, 250));
      }
      mine.push([k, t]);
    }
    return await fn();
  } finally {
    clearInterval(beat);
    for (const [k, t] of mine) await release(k, t).catch(() => {});
  }
}

const sessionKey = (slug, sessionId) => `session:${slug}/${sessionId}`;

module.exports = { client, acquire, release, withLock, withLocks, releaseAll, sessionKey };
