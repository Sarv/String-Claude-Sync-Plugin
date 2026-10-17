// Lines pushed by the hook (POST /api/push): checked against what the server already has, then queued.
//
// Read positions: byte_offset (claude_chat_ingest_state) = what a worker has written; recv:<slug>/<session> (Redis)
// = what the API has queued. A push is accepted when it starts at or before max(recv, byte_offset) and ends after it:
//   end   <= have   duplicate: answered 200, nothing queued (the client already sent it)
//   start >  have   gap: 409 with the offset to resend from (the client lost its offset file, or the server its data)
// The overlap of an accepted push is dropped by the worker line by line, so a resend never duplicates.
const zlib = require('zlib');
const { es } = require('./es');
const queue = require('./queue');
const lock = require('./lock');
const ing = require('./ingest');
const { INDEX_STATE, PUSH_MAX_BYTES } = require('./config');

const SLUG_RE = /^(?!\.\.?$)[^/\\\0]{1,255}$/;
const SESSION_RE = /^[A-Za-z0-9_-]{1,100}$/;
const MAX_JOB_B64 = 15 * 1024 * 1024; // RabbitMQ refuses messages over 16 MiB
const recvKey = (slug, sessionId) => `recv:${slug}/${sessionId}`;

class HttpError extends Error {
  constructor(http, code, extra = {}) { super(code); this.http = http; this.code = code; this.extra = extra; }
}

/** Raw body (gzip or not), at most PUSH_MAX_BYTES either way. */
async function readJson(req) {
  const parts = [];
  let n = 0;
  for await (const c of req) {
    n += c.length;
    if (n > PUSH_MAX_BYTES) throw new HttpError(413, 'TOO_LARGE', { max: PUSH_MAX_BYTES });
    parts.push(c);
  }
  let buf = Buffer.concat(parts);
  if (/gzip/.test(req.headers['content-encoding'] || '')) {
    try { buf = zlib.gunzipSync(buf, { maxOutputLength: PUSH_MAX_BYTES }); } catch (e) {
      throw new HttpError(/maxOutputLength|buffer/i.test(e.message) ? 413 : 400, /maxOutputLength|buffer/i.test(e.message) ? 'TOO_LARGE' : 'BAD_GZIP', { max: PUSH_MAX_BYTES });
    }
  }
  try { return JSON.parse(buf.toString('utf8') || '{}'); } catch { throw new HttpError(400, 'BAD_JSON'); }
}

/** What the server has of one session: queued (Redis) or written (Elasticsearch), whichever is further. */
async function have(slug, sessionId) {
  const [recv, doc] = await Promise.all([
    lock.client().get(recvKey(slug, sessionId)),
    es('GET', `/${INDEX_STATE}/_doc/${encodeURIComponent(`${slug}/${sessionId}`)}`, undefined, { allow404: true }),
  ]);
  return Math.max(Number(recv) || 0, doc?.found ? doc._source.byte_offset || 0 : 0);
}

function where(q) {
  const slug = String(q.slug || '');
  const sessionId = String(q.session_id || '');
  if (!SLUG_RE.test(slug) || !SESSION_RE.test(sessionId)) throw new HttpError(400, 'BAD_SESSION');
  return { slug, sessionId };
}

/** GET /api/offset?slug=&session_id= → { offset, excluded } */
async function offset(q) {
  const { slug, sessionId } = where(q);
  return { offset: await have(slug, sessionId), excluded: ing.getSettings().excluded.includes(slug) };
}

// recv only moves forward
const ADVANCE = "local c = tonumber(redis.call('get', KEYS[1]) or '0') if c < tonumber(ARGV[1]) then redis.call('set', KEYS[1], ARGV[1]) end return 1";

/**
 * Body: { slug, session_id, start, end, data, skipped?, hook?, account?, cwd? }
 *   data     complete lines (each ending in \n) from byte `start` to `end` of the transcript
 *   skipped  the range is one line too big to send (data is ""): the server only moves past it
 *   hook     this push ends a Stop hook's lines: tag what's new with `account`
 */
async function push(body, auth) {
  const { slug, sessionId } = where(body);
  const start = Number(body.start);
  const end = Number(body.end);
  const data = typeof body.data === 'string' ? body.data : '';
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end <= start) throw new HttpError(400, 'BAD_RANGE');
  if (!body.skipped && (Buffer.byteLength(data) !== end - start || !data.endsWith('\n'))) throw new HttpError(400, 'BAD_RANGE', { reason: 'data must be complete lines, end - start bytes long' });
  if (ing.getSettings().excluded.includes(slug)) return { http: 200, code: 'EXCLUDED', offset: start };

  const got = await have(slug, sessionId);
  if (end <= got) return { http: 200, code: 'DUPLICATE', offset: got };
  if (start > got) throw new HttpError(409, 'OFFSET_MISMATCH', { offset: got });

  const gz = body.skipped ? '' : zlib.gzipSync(data).toString('base64');
  if (gz.length > MAX_JOB_B64) throw new HttpError(413, 'TOO_LARGE', { reason: 'send smaller chunks' });
  const job = await queue.publishJob('ingest', {
    type: 'push', label: body.hook ? 'hook' : 'push', tenant_id: auth.tenant_id, device_id: auth.device_id,
    slug, sessionId, start, end, gz, skipped: !!body.skipped, hook: !!body.hook, account: body.hook ? body.account || null : null,
    cwd: typeof body.cwd === 'string' ? body.cwd.slice(0, 1000) : null, bytes: end - Math.max(start, got),
  });
  // after the publish is confirmed: if this fails the client resends, and the worker drops the repeat
  await lock.client().eval(ADVANCE, 1, recvKey(slug, sessionId), end);
  return { http: 202, code: 'QUEUED', offset: end, job };
}

/** Delete with "bring it back": forget what was queued too, so the next push gets 409 and resends from 0. */
async function forgetReceived({ project, session }) {
  const r = lock.client();
  const keys = [];
  let cursor = '0';
  const glob = (s) => String(s).replace(/[*?[\]\\]/g, '\\$&');
  const match = project ? `recv:${glob(project)}/*` : `recv:*/${glob(session)}`;
  do {
    const [next, found] = await r.scan(cursor, 'MATCH', match, 'COUNT', 500);
    cursor = next;
    keys.push(...found);
  } while (cursor !== '0');
  if (keys.length) await r.del(...keys);
  return keys.length;
}

module.exports = { HttpError, readJson, offset, push, forgetReceived, recvKey };
