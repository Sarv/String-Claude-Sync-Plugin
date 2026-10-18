#!/usr/bin/env node
// String Claude Sync pusher: sends new transcript lines to the server (POST /api/push). Started by the Stop hook
// (detached, so Claude Code never waits), or by hand (in this repo, scripts/push.js runs this file):
//   node scripts/push.js            send what the hooks have marked
//   node scripts/push.js --all      first sync: mark every transcript under ~/.claude/projects, then send
//   node scripts/push.js --status   server, device approval, pending sessions
//
// ~/.string-claude-sync/ (STRING_CLAUDE_SYNC_DIR; moved from ~/.claude-recall, its old name, on first run)
//   pending/<session>.json   one per session with lines to send (written by the hook; removed once sent)
//   state.json               read position (bytes) per transcript; if lost, the server is asked (GET /api/offset)
//   device.json              device id + secret, approval status, current token (chmod 600)
//   push.lock/               only one pusher at a time; push.log  what it did
// (Not the plugin's own folder: that one is replaced on every update. The same folder is shared by the plugin
// and a hand-installed hook, so both on one machine still make one pusher and one read position.)
//
// Server: STRING_CLAUDE_SYNC_URL, else config.json, else defaults.json next to scripts/, else http://127.0.0.1:4000. With STRING_CLAUDE_SYNC_ENROLL_TOKEN set (e.g. from managed
// settings) the device asks to be approved first and then pushes with its own short-lived token.
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

// STRING_CLAUDE_SYNC_<NAME>; the older CLAUDE_RECALL_<NAME> still works
const env = (name) => process.env[`STRING_CLAUDE_SYNC_${name}`] || process.env[`CLAUDE_RECALL_${name}`];
const DIR = env('DIR') || path.join(os.homedir(), '.string-claude-sync');
const OLD_DIR = path.join(os.homedir(), '.claude-recall'); // its name before String Claude Sync
const PENDING = path.join(DIR, 'pending');
const STATE = path.join(DIR, 'state.json');
const DEVICE = path.join(DIR, 'device.json');
const LOCK = path.join(DIR, 'push.lock');
const LOG = path.join(DIR, 'push.log');
const CLAUDE_DIR = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const CLAUDE_JSON = process.env.CLAUDE_CONFIG_DIR ? path.join(process.env.CLAUDE_CONFIG_DIR, '.claude.json') : path.join(os.homedir(), '.claude.json');

const CHUNK = Number(env('CHUNK') || 4 * 1024 * 1024); // lines per push, before gzip
const MAX_LINE = 10 * 1024 * 1024; // one line bigger than this (a huge pasted image) is skipped, not even read
const EXCLUDED_RECHECK_MS = 3600_000;

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function writeJson(file, value, mode = 0o600) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), { mode });
  fs.renameSync(tmp, file); // atomic: a crash never leaves half a file
}
/**
 * Server URL, first one set wins: STRING_CLAUDE_SYNC_URL (managed settings, which a user cannot override; or the
 * environment) → the plugin's defaults.json (the URL most machines use, kept in git) → http://127.0.0.1:<port>.
 * Nothing on the machine itself can redirect it. The enrollment token has no default: it is per organisation.
 */
function config() {
  const defaults = env('NO_DEFAULTS') ? {} : readJson(path.join(__dirname, '..', 'defaults.json'), {});
  const port = env('PORT') || process.env.APP_PORT || 4000;
  return {
    url: (env('URL') || defaults.url || `http://127.0.0.1:${port}`).replace(/\/+$/, ''),
    enrollToken: env('ENROLL_TOKEN') || '',
  };
}
function log(msg) {
  const line = `${new Date().toISOString()} ${msg}\n`;
  if (process.stdout.isTTY) process.stdout.write(line);
  try {
    if (fs.statSync(LOG).size > 1e6) fs.renameSync(LOG, `${LOG}.1`);
  } catch {}
  try { fs.appendFileSync(LOG, line); } catch {}
}

/** The account Claude Code is logged in with right now (ids, names, email, org, role; no tokens live there). */
function account() {
  try {
    const cfg = JSON.parse(fs.readFileSync(CLAUDE_JSON, 'utf8'));
    const a = cfg.oauthAccount;
    if (!a || !a.accountUuid) return { kind: 'api_key', install_id: cfg.userID || null };
    return {
      kind: 'oauth',
      install_id: cfg.userID || null,
      account_uuid: a.accountUuid,
      email: a.emailAddress || null,
      display_name: a.displayName || null,
      full_name: a.fullName || null,
      account_created_at: a.accountCreatedAt || null,
      billing_type: a.billingType || null,
      org_uuid: a.organizationUuid || null,
      org_name: a.organizationName || null,
      org_type: a.organizationType || null,
      org_billing_type: a.organizationBillingType || null,
      org_role: a.organizationRole || null,
      workspace_role: a.workspaceRole || null,
      seat_tier: a.seatTier || null,
    };
  } catch {
    return null;
  }
}

/**
 * Moves ~/.claude-recall (the folder's old name) to ~/.string-claude-sync once, keeping the device approval, read
 * positions and waiting sessions. Two hooks at once: whichever is second moves what the first left. Nothing is deleted.
 */
function migrate() {
  if (env('DIR') || !fs.existsSync(OLD_DIR)) return;
  try { fs.renameSync(OLD_DIR, DIR); return; } catch {}
  try {
    fs.mkdirSync(DIR, { recursive: true, mode: 0o700 });
    for (const name of fs.readdirSync(OLD_DIR)) {
      const from = path.join(OLD_DIR, name);
      const to = path.join(DIR, name);
      if (name === 'pending' && fs.existsSync(to)) {
        for (const m of fs.readdirSync(from)) if (!fs.existsSync(path.join(to, m))) fs.renameSync(path.join(from, m), path.join(to, m));
      } else if (!fs.existsSync(to)) fs.renameSync(from, to);
    }
    fs.rmdirSync(path.join(OLD_DIR, 'pending'), { recursive: false });
  } catch {}
  try { fs.rmdirSync(OLD_DIR); } catch {} // only if it is empty now
}
migrate();

/** Marks a session as having lines to send (the hook calls this; it is cheap and never throws). */
function mark({ session_id, transcript_path, cwd = null, account: acct = null, hook = false }) {
  if (!session_id || !transcript_path) return false;
  fs.mkdirSync(PENDING, { recursive: true, mode: 0o700 });
  writeJson(path.join(PENDING, `${safeName(session_id)}.json`), { session_id, path: transcript_path, cwd, account: acct, hook, at: new Date().toISOString() });
  return true;
}
const safeName = (s) => String(s).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 100);

// ---------- lock (one pusher at a time) ----------
function takeLock() {
  fs.mkdirSync(DIR, { recursive: true, mode: 0o700 });
  for (let i = 0; i < 2; i++) {
    try {
      fs.mkdirSync(LOCK);
      fs.writeFileSync(path.join(LOCK, 'pid'), String(process.pid));
      return true;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      let pid = 0;
      try { pid = Number(fs.readFileSync(path.join(LOCK, 'pid'), 'utf8')) || 0; } catch {}
      let alive = false;
      try { if (pid) { process.kill(pid, 0); alive = true; } } catch (err) { alive = err.code === 'EPERM'; }
      let age = 0;
      try { age = Date.now() - fs.statSync(LOCK).mtimeMs; } catch {}
      if (alive || (!pid && age < 10000)) return false; // (no pid yet: it is being taken right now)
      fs.rmSync(LOCK, { recursive: true, force: true }); // its pusher died
    }
  }
  return false;
}
const dropLock = () => fs.rmSync(LOCK, { recursive: true, force: true });

// ---------- http ----------
class Stop extends Error {} // stop this run, keep every marker (server down, not approved, …)

async function call(method, url, { body, headers = {}, gzip = false, timeout = 30000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    let payload;
    if (body !== undefined) {
      payload = JSON.stringify(body);
      headers = { ...headers, 'Content-Type': 'application/json' };
      if (gzip) { payload = zlib.gzipSync(payload); headers['Content-Encoding'] = 'gzip'; }
    }
    const res = await fetch(url, { method, headers, body: payload, signal: ctrl.signal });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, json, renewed: res.headers.get('x-recall-token') };
  } finally {
    clearTimeout(t);
  }
}

/** call() with retries for a server that is down or restarting (1 s, 3 s, 9 s), then Stop. */
async function callRetry(method, url, opts) {
  for (let i = 0; ; i++) {
    try {
      const r = await call(method, url, opts);
      if (r.status < 500) return r;
      if (i >= 3) throw new Stop(`server answered ${r.status} ${r.json.code || r.json.error || ''}`.trim());
    } catch (e) {
      if (e instanceof Stop) throw e;
      if (i >= 3) throw new Stop(`server unreachable (${e.cause?.code || (e.name === 'AbortError' ? 'timeout' : e.message)})`);
    }
    await new Promise((r) => setTimeout(r, 1000 * 3 ** i));
  }
}

// ---------- device approval ----------
function markerIds() {
  try { return fs.readdirSync(PENDING).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)); } catch { return []; }
}

/**
 * Headers to push with, or Stop. Without an enrollment token: none (a local server that allows that).
 *   no device         → enroll (APPROVAL_PENDING until an admin approves it)
 *   pending           → ask for a token: still pending, rejected, or a token
 *   rejected          → nothing is sent for the sessions known when it was rejected; a new session enrolls afresh
 */
async function authHeaders(cfg, { refresh = false } = {}) {
  if (!cfg.enrollToken) return {};
  let dev = readJson(DEVICE, null);
  if (dev?.status === 'rejected') {
    const fresh = markerIds().filter((id) => !(dev.rejected_sessions || []).includes(id));
    if (!fresh.length) throw new Stop('APPROVAL_REJECTED: this device was rejected; a new Claude Code session asks again');
    log(`new session after a rejection: asking for approval again`);
    dev = null;
  }
  if (!dev?.device_id) {
    dev = { device_id: crypto.randomUUID(), device_secret: crypto.randomBytes(32).toString('hex'), status: 'new', created_at: new Date().toISOString() };
    writeJson(DEVICE, dev);
    const r = await callRetry('POST', `${cfg.url}/api/device/enroll`, {
      body: { enroll_token: cfg.enrollToken, device_id: dev.device_id, device_secret: dev.device_secret, hostname: os.hostname(), account: account(), session_id: markerIds()[0] || null },
    });
    if (r.json.code === 'APPROVAL_PENDING') {
      writeJson(DEVICE, { ...dev, status: 'pending' });
      throw new Stop('APPROVAL_PENDING: asked to push; an admin has to approve this device on the Devices page');
    }
    if (r.json.code === 'APPROVAL_REJECTED') return rejected(dev);
    fs.rmSync(DEVICE, { force: true }); // e.g. ENROLL_TOKEN_INVALID: try again from scratch next time
    if (r.json.code === 'ORG_NOT_ALLOWED') {
      throw new Stop(`ORG_NOT_ALLOWED: the Claude account logged in here (organisation ${r.json.org_uuid || 'none'}) is not of this company's Claude organisations`);
    }
    throw new Stop(`enrollment refused: ${r.status} ${r.json.code || r.json.error || ''}`);
  }
  if (!refresh && dev.token && Date.parse(dev.expires_at) > Date.now() + 60000) return { Authorization: `Bearer ${dev.token}` };
  const r = await callRetry('POST', `${cfg.url}/api/device/token`, { body: { device_id: dev.device_id, device_secret: dev.device_secret } });
  if (r.status === 200 && r.json.token) {
    if (dev.status !== 'approved') log('device approved: pushing');
    writeJson(DEVICE, { ...dev, status: 'approved', token: r.json.token, expires_at: r.json.expires_at });
    return { Authorization: `Bearer ${r.json.token}` };
  }
  if (r.json.code === 'APPROVAL_PENDING') {
    writeJson(DEVICE, { ...dev, status: 'pending', token: null });
    throw new Stop('APPROVAL_PENDING: still waiting for an admin to approve this device');
  }
  if (r.json.code === 'APPROVAL_REJECTED') return rejected(dev);
  if (r.json.code === 'DEVICE_UNKNOWN' || r.json.code === 'DEVICE_SECRET_INVALID') {
    fs.rmSync(DEVICE, { force: true }); // the server lost it: enroll again next run
    throw new Stop(`${r.json.code}: will ask for approval again`);
  }
  throw new Stop(`token refused: ${r.status} ${r.json.code || ''}`);
}
function rejected(dev) {
  writeJson(DEVICE, { ...dev, status: 'rejected', token: null, rejected_at: new Date().toISOString(), rejected_sessions: markerIds() });
  throw new Stop('APPROVAL_REJECTED: an admin rejected this device; nothing is sent for these sessions');
}
function saveRenewed(raw) {
  if (!raw) return;
  try {
    const t = JSON.parse(raw);
    const dev = readJson(DEVICE, null);
    if (dev && t.token) writeJson(DEVICE, { ...dev, token: t.token, expires_at: t.expires_at });
  } catch {}
}

// ---------- reading lines ----------
/** The next run of complete lines from `start`: { start, end, data, sizes? } (up to CHUNK), { start, end, skipped } or null. */
function nextChunk(fd, start, size) {
  if (start >= size) return null;
  const want = Math.min(CHUNK, size - start);
  let buf = Buffer.alloc(want);
  let n = fs.readSync(fd, buf, 0, want, start);
  let nl = buf.lastIndexOf(10, n - 1);
  if (nl === -1) {
    // one line longer than CHUNK: find its end
    let pos = start + n;
    const step = Buffer.alloc(1 << 20);
    for (;;) {
      if (pos >= size) return null; // not finished yet: next time
      const k = fs.readSync(fd, step, 0, step.length, pos);
      const i = step.subarray(0, k).indexOf(10);
      if (i !== -1) { pos += i + 1; break; }
      pos += k;
    }
    if (pos - start > MAX_LINE) return { start, end: pos, skipped: true };
    buf = Buffer.alloc(pos - start);
    n = fs.readSync(fd, buf, 0, buf.length, start);
    nl = n - 1;
  }
  return { start, end: start + nl + 1, ...stripImages(buf.toString('utf8', 0, nl + 1)) };
}

/**
 * Only the chats are synced: images (pasted ones, screenshots in tool results, anything base64) never leave the
 * laptop. Each line holding base64 data is sent with that data emptied, still valid JSON. The read position stays
 * the transcript's own: { data, sizes } where sizes = each line's byte length in the file (only when a line got
 * shorter; without it every line is as long as in the file).
 */
function stripImages(text) {
  const lines = text.split('\n');
  lines.pop(); // text ends with \n
  let changed = false;
  const sizes = [];
  const out = lines.map((line) => {
    sizes.push(Buffer.byteLength(line) + 1);
    if (!line.includes('"base64"')) return line;
    let obj;
    try { obj = JSON.parse(line); } catch { return line; }
    if (!dropBase64(obj)) return line;
    changed = true;
    return JSON.stringify(obj);
  });
  return changed ? { data: out.join('\n') + '\n', sizes } : { data: text };
}
/** Empties base64 data in place ({ type: 'base64', data } image/document sources, { base64 } file results). */
function dropBase64(v) {
  if (!v || typeof v !== 'object') return false;
  let hit = false;
  if (v.type === 'base64' && typeof v.data === 'string' && v.data) { v.data = ''; hit = true; }
  if (typeof v.base64 === 'string' && v.base64) { v.base64 = ''; hit = true; }
  for (const k in v) if (v[k] && typeof v[k] === 'object' && dropBase64(v[k])) hit = true;
  return hit;
}

// ---------- one session ----------
async function pushSession(cfg, marker, state, headers, again = false) {
  const file = marker.path;
  const slug = path.basename(path.dirname(file));
  const session_id = path.basename(file, '.jsonl');
  let st;
  try { st = fs.statSync(file); } catch { log(`${session_id.slice(0, 8)}: transcript gone, nothing to send`); return true; }
  const entry = (state.files[file] = state.files[file] || {});
  if (entry.excluded_checked_at && Date.now() - Date.parse(entry.excluded_checked_at) < EXCLUDED_RECHECK_MS) return true;

  const q = `slug=${encodeURIComponent(slug)}&session_id=${encodeURIComponent(session_id)}`;
  if (typeof entry.offset !== 'number' || entry.excluded_checked_at) {
    // no offset of our own (first push, state.json lost or corrupt) or excluded last time: ask the server
    const r = await callRetry('GET', `${cfg.url}/api/offset?${q}`, { headers: headers() });
    if (r.status !== 200) return answer(r, slug, session_id);
    entry.offset = r.json.offset;
    delete entry.excluded_checked_at;
    if (r.json.excluded) entry.excluded_checked_at = new Date().toISOString();
    writeJson(STATE, state);
    if (r.json.excluded) return true;
  }
  if (st.size < entry.offset) {
    if (!again) {
      log(`${session_id.slice(0, 8)}: transcript is shorter than what was sent; asking the server`);
      delete entry.offset;
      return pushSession(cfg, marker, state, headers, true);
    }
    // the server has more than the file holds too: the transcript was rewritten. Lines past its old end are sent.
    log(`${session_id.slice(0, 8)}: transcript was rewritten (${st.size} bytes, server has ${entry.offset}); only lines past ${entry.offset} are sent`);
    return true;
  }

  const fd = fs.openSync(file, 'r');
  let sent = 0;
  let notAllowedSaid = false;
  try {
    let cur = nextChunk(fd, entry.offset, st.size);
    while (cur) {
      const nxt = nextChunk(fd, cur.end, st.size);
      const last = !nxt;
      const r = await callRetry('POST', `${cfg.url}/api/push`, {
        gzip: true, headers: headers(), timeout: 120000,
        body: {
          slug, session_id, start: cur.start, end: cur.end, data: cur.data || '', skipped: !!cur.skipped,
          ...(cur.sizes ? { sizes: cur.sizes } : {}),
          // the account goes with every push (the server only keeps lines of the company's Claude organisations);
          // on the last push of a Stop hook it also tags this turn's lines
          hook: last && !!marker.hook, account: marker.account || account(), cwd: marker.cwd || null,
        },
      });
      saveRenewed(r.renewed);
      const code = r.json.code;
      if (code === 'ORG_NOT_ALLOWED' && !notAllowedSaid) {
        notAllowedSaid = true;
        log(`${session_id.slice(0, 8)}: not saved: the Claude account here (organisation ${r.json.org_uuid || 'none'}) is not of this company's Claude organisations`);
      }
      if (code === 'QUEUED' || code === 'DUPLICATE' || code === 'ORG_NOT_ALLOWED') {
        if (cur.skipped) log(`${session_id.slice(0, 8)}: skipped one line of ${((cur.end - cur.start) / 1048576).toFixed(1)} MB (too big)`);
        sent += code === 'QUEUED' ? cur.end - cur.start : 0;
        entry.offset = Math.min(r.json.offset, st.size);
        writeJson(STATE, state);
        cur = entry.offset === cur.end ? nxt : nextChunk(fd, entry.offset, st.size); // the server already had more
      } else if (code === 'OFFSET_MISMATCH') {
        log(`${session_id.slice(0, 8)}: server has ${r.json.offset} bytes, we were at ${cur.start}; resending from there`);
        entry.offset = Math.min(r.json.offset, st.size);
        writeJson(STATE, state);
        cur = nextChunk(fd, entry.offset, st.size);
      } else if (code === 'EXCLUDED') {
        entry.excluded_checked_at = new Date().toISOString();
        writeJson(STATE, state);
        return true;
      } else {
        return answer(r, slug, session_id);
      }
    }
  } finally {
    fs.closeSync(fd);
  }
  if (sent) log(`${slug} › ${session_id.slice(0, 8)}: sent ${sent < 10240 ? `${sent} bytes` : `${(sent / 1024).toFixed(0)} KB`}`);
  return true;
}

/** Any other answer: auth problems stop the run (markers kept); a refused push is logged and kept for later. */
function answer(r, slug, session_id) {
  const code = r.json.code || r.json.error || '';
  if (r.status === 401 && /TOKEN_INVALID/.test(code)) { const e = new Stop('token expired'); e.refresh = true; throw e; }
  if (r.status === 401 || r.status === 403) throw new Stop(`${code || r.status}`);
  log(`ERROR ${slug} › ${session_id.slice(0, 8)}: ${r.status} ${code} ${r.json.reason || ''}`.trim());
  return false;
}

// ---------- run ----------
async function drain(cfg) {
  const state = readJson(STATE, null);
  const st = state && typeof state.files === 'object' ? state : { version: 1, files: {} };
  if (state === null && fs.existsSync(STATE)) log('state.json unreadable: asking the server for each read position');
  let hdr = {};
  const headers = () => hdr;
  for (let round = 0; ; round++) {
    const ids = markerIds();
    if (!ids.length) return;
    hdr = await authHeaders(cfg);
    let progressed = false;
    for (const id of ids) {
      const file = path.join(PENDING, `${id}.json`);
      const work = `${file}.work`;
      try { fs.renameSync(file, work); } catch { continue; } // a newer hook may re-create `file` meanwhile
      const marker = readJson(work, null);
      let ok = false;
      try {
        ok = !marker?.path || (await pushSession(cfg, marker, st, headers));
      } catch (e) {
        if (e.refresh) {
          try { hdr = await authHeaders(cfg, { refresh: true }); ok = await pushSession(cfg, marker, st, headers); } catch (e2) { e = e2; }
        }
        if (!ok) {
          if (!fs.existsSync(file)) fs.renameSync(work, file); // keep it for the next run
          else fs.rmSync(work, { force: true });
          throw e;
        }
      }
      if (ok) { fs.rmSync(work, { force: true }); progressed = true; }
      else if (!fs.existsSync(file)) fs.renameSync(work, file);
      else fs.rmSync(work, { force: true });
    }
    if (!progressed) return; // what is left failed this time; the next hook tries again
  }
}

async function run() {
  const cfg = config();
  for (;;) {
    if (!takeLock()) return; // another pusher is at it; it picks up our marker too
    try {
      await drain(cfg);
    } catch (e) {
      if (!(e instanceof Stop)) throw e;
      log(e.message);
      return;
    } finally {
      dropLock();
    }
    // a hook may have marked a session after our last look and found the lock taken: look once more
    if (!markerIds().length) return;
  }
}

function markAll() {
  const root = path.join(CLAUDE_DIR, 'projects');
  const state = readJson(STATE, { files: {} });
  const acct = account(); // whoever is logged in now: the server checks its Claude organisation
  let n = 0;
  for (const d of fs.readdirSync(root, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    for (const f of fs.readdirSync(path.join(root, d.name))) {
      if (!f.endsWith('.jsonl')) continue;
      const full = path.join(root, d.name, f);
      if (fs.statSync(full).size === state.files?.[full]?.offset) continue;
      const id = f.slice(0, -6);
      if (fs.existsSync(path.join(PENDING, `${safeName(id)}.json`))) continue; // a hook's marker (with its account) wins
      mark({ session_id: id, transcript_path: full, account: acct });
      n++;
    }
  }
  return n;
}

function status() {
  const cfg = config();
  const dev = readJson(DEVICE, null);
  console.log(`server:   ${cfg.url}`);
  console.log(`auth:     ${cfg.enrollToken ? `enrollment token set; device ${dev?.device_id || '(not enrolled yet)'}: ${dev?.status || '-'}${dev?.expires_at ? `, token until ${dev.expires_at}` : ''}` : 'none (local server)'}`);
  console.log(`pending:  ${markerIds().length} session(s) with lines to send`);
  console.log(`log:      ${LOG}`);
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--status')) status();
  else {
    if (args.includes('--all')) log(`--all: ${markAll()} transcript(s) marked`);
    run().then(() => { if (args.includes('--all')) status(); }).catch((e) => { log(`ERROR ${e.stack || e.message}`); process.exitCode = 1; });
  }
}

if (require.main === module) main();

module.exports = { mark, account, run, main, DIR, stripImages };
