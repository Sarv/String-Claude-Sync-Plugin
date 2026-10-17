// Devices: who may push transcripts, and as which tenant.
//
//   1. The hook sends the org's enrollment token (managed settings) + a device id and a secret it made up.
//      → a pending device (APPROVAL_PENDING). Only the secret's hash is kept.
//   2. An admin approves or rejects it on the Devices page (ADMIN_TOKEN).
//   3. The hook asks for a token with its device id + secret: APPROVAL_PENDING / APPROVAL_REJECTED / a token.
//   4. Every push carries the token (Bearer). It runs out after TOKEN_TTL_S; in its second half the API hands a
//      new one back (X-Recall-Token), and an expired one is replaced with step 3 (no new approval).
//
// Device status lives in Elasticsearch (claude_chat_devices, durable) and Redis (device:<id>, read on every
// request); tokens only in Redis (tok:<sha256>, with a TTL). Redis is persistent (AOF), and a missing device:<id>
// is filled again from Elasticsearch.
const crypto = require('crypto');
const os = require('os');
const { es } = require('./es');
const lock = require('./lock');
const { INDEX_DEVICES, ENROLL_TOKENS, ADMIN_TOKEN, ALLOW_NO_AUTH, TOKEN_TTL_S } = require('./config');

const LOCAL_TENANT = 'local';
const MAX_PENDING = 500; // per tenant, so a leaked enrollment token cannot flood the Devices page
const STATUS = { pending: 'APPROVAL_PENDING', rejected: 'APPROVAL_REJECTED' };

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
function same(a, b) {
  const x = Buffer.from(sha(a));
  const y = Buffer.from(sha(b));
  return crypto.timingSafeEqual(x, y);
}
const redis = () => lock.client();
const ID_RE = /^[A-Za-z0-9-]{8,64}$/;

/** "acme:tok1,beta:tok2" → tenant of the given enrollment token, or null. */
function tenantOfEnrollToken(token) {
  if (!token) return null;
  for (const pair of ENROLL_TOKENS.split(',').map((s) => s.trim()).filter(Boolean)) {
    const i = pair.indexOf(':');
    if (i > 0 && same(pair.slice(i + 1), token)) return pair.slice(0, i);
  }
  return null;
}

async function cacheDevice(d) {
  await redis().hset(`device:${d.device_id}`, { status: d.status, tenant_id: d.tenant_id, secret_hash: d.secret_hash });
}
async function getDevice(id) {
  const h = await redis().hgetall(`device:${id}`);
  if (h.status) return { device_id: id, ...h };
  const doc = await es('GET', `/${INDEX_DEVICES}/_doc/${encodeURIComponent(id)}`, undefined, { allow404: true });
  if (!doc?.found) return null;
  await cacheDevice(doc._source);
  return doc._source;
}

async function enroll({ enroll_token, device_id, device_secret, hostname, account, session_id }) {
  const tenant = tenantOfEnrollToken(enroll_token);
  if (!tenant) return { http: 401, code: 'ENROLL_TOKEN_INVALID' };
  if (!ID_RE.test(device_id || '') || !device_secret || String(device_secret).length < 32) return { http: 400, code: 'BAD_REQUEST' };
  const have = await getDevice(device_id);
  if (have) {
    if (have.secret_hash !== sha(device_secret)) return { http: 409, code: 'DEVICE_ID_TAKEN' };
    return statusAnswer(have);
  }
  const pending = await es('POST', `/${INDEX_DEVICES}/_count`, { query: { bool: { filter: [{ term: { tenant_id: tenant } }, { term: { status: 'pending' } }] } } });
  if (pending.count >= MAX_PENDING) return { http: 429, code: 'TOO_MANY_PENDING' };
  const d = {
    device_id, tenant_id: tenant, status: 'pending', secret_hash: sha(device_secret),
    hostname: String(hostname || '').slice(0, 200) || null, session_id: String(session_id || '').slice(0, 64) || null,
    email: account?.email || null, name: account?.full_name || account?.display_name || null,
    account_uuid: account?.account_uuid || null, org_uuid: account?.org_uuid || null, org_name: account?.org_name || null,
    created_at: new Date().toISOString(), decided_at: null, last_seen_at: new Date().toISOString(),
  };
  // op_type=create: two hooks enrolling the same id at once make one device
  await es('PUT', `/${INDEX_DEVICES}/_doc/${encodeURIComponent(device_id)}?op_type=create&refresh=true`, d).catch((e) => {
    if (!/-> 409/.test(e.message)) throw e;
  });
  await cacheDevice(d);
  return { http: 403, code: STATUS.pending, device_id };
}

function statusAnswer(d) {
  if (d.status === 'approved') return null;
  return { http: 403, code: STATUS[d.status] || STATUS.rejected, device_id: d.device_id };
}

async function issueToken(d) {
  const token = `rcl_${crypto.randomBytes(32).toString('base64url')}`;
  const h = sha(token);
  await redis().multi()
    .set(`tok:${h}`, JSON.stringify({ device_id: d.device_id, tenant_id: d.tenant_id }), 'EX', TOKEN_TTL_S)
    .sadd(`devtoks:${d.device_id}`, h)
    .expire(`devtoks:${d.device_id}`, TOKEN_TTL_S * 2)
    .exec();
  return { token, expires_at: new Date(Date.now() + TOKEN_TTL_S * 1000).toISOString() };
}

/** Device id + secret → a fresh token once approved. */
async function token({ device_id, device_secret }) {
  if (!ID_RE.test(device_id || '') || !device_secret) return { http: 400, code: 'BAD_REQUEST' };
  const d = await getDevice(device_id);
  if (!d) return { http: 404, code: 'DEVICE_UNKNOWN' };
  if (d.secret_hash !== sha(device_secret)) return { http: 401, code: 'DEVICE_SECRET_INVALID' };
  const no = statusAnswer(d);
  if (no) return no;
  touch(d.device_id);
  return { http: 200, ...(await issueToken(d)) };
}

function touch(id) {
  // last_seen_at at most every 5 minutes
  redis().set(`seen:${id}`, '1', 'EX', 300, 'NX').then((ok) => {
    if (ok) return es('POST', `/${INDEX_DEVICES}/_update/${encodeURIComponent(id)}`, { doc: { last_seen_at: new Date().toISOString() } });
  }).catch(() => {});
}

/**
 * Who is calling? { tenant_id, device_id, renewed? } or { http, code } to answer with.
 * renewed = a new token for the caller when the one it used is in its second half.
 */
async function authenticate(req) {
  const m = /^Bearer\s+(\S+)$/.exec(req.headers.authorization || '');
  if (!m) return ALLOW_NO_AUTH ? { tenant_id: LOCAL_TENANT, device_id: null } : { http: 401, code: 'TOKEN_REQUIRED' };
  const h = sha(m[1]);
  const [raw, ttl] = await redis().multi().get(`tok:${h}`).ttl(`tok:${h}`).exec().then((r) => r.map((x) => x[1]));
  if (!raw) return { http: 401, code: 'TOKEN_INVALID' }; // expired or never issued: ask for a new one
  const t = JSON.parse(raw);
  const d = await getDevice(t.device_id);
  if (!d || d.status !== 'approved') {
    await redis().del(`tok:${h}`);
    return { http: 403, code: STATUS[d?.status] || STATUS.rejected };
  }
  touch(d.device_id);
  const out = { tenant_id: d.tenant_id, device_id: d.device_id };
  if (ttl > 0 && ttl < TOKEN_TTL_S / 2) {
    // one renewal per token, even when several pushes run at once
    if (await redis().set(`renew:${h}`, '1', 'EX', ttl, 'NX')) out.renewed = await issueToken(d);
  }
  return out;
}

// ---------- admin ----------
function adminOk(req) {
  const given = req.headers['x-admin-token'] || '';
  if (!ADMIN_TOKEN) return ALLOW_NO_AUTH; // local install without an admin token: the UI is localhost-only anyway
  return !!given && same(given, ADMIN_TOKEN);
}

async function list() {
  const r = await es('POST', `/${INDEX_DEVICES}/_search`, { size: 1000, sort: [{ created_at: 'desc' }], _source: { excludes: ['secret_hash'] } });
  const tenants = [...new Set(ENROLL_TOKENS.split(',').map((p) => p.split(':')[0].trim()).filter(Boolean))];
  return { devices: r.hits.hits.map((h) => h._source), tenants, adminTokenSet: !!ADMIN_TOKEN, allowNoAuth: ALLOW_NO_AUTH, host: os.hostname() };
}

/** approve | reject. Rejecting (also an approved device) ends its tokens at once. */
async function decide(id, action) {
  const status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : null;
  if (!status || !ID_RE.test(id)) return null;
  const doc = await es('GET', `/${INDEX_DEVICES}/_doc/${encodeURIComponent(id)}`, undefined, { allow404: true });
  if (!doc?.found) return null;
  const d = { ...doc._source, status, decided_at: new Date().toISOString() };
  await es('PUT', `/${INDEX_DEVICES}/_doc/${encodeURIComponent(id)}?refresh=true&if_seq_no=${doc._seq_no}&if_primary_term=${doc._primary_term}`, d);
  await cacheDevice(d);
  if (status === 'rejected') {
    const toks = await redis().smembers(`devtoks:${id}`);
    if (toks.length) await redis().del(...toks.map((h) => `tok:${h}`));
    await redis().del(`devtoks:${id}`);
  }
  const { secret_hash, ...shown } = d;
  return shown;
}

module.exports = { LOCAL_TENANT, enroll, token, authenticate, adminOk, list, decide };
