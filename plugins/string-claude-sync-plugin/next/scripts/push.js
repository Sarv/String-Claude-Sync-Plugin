#!/usr/bin/env node
// String Cortex pusher: sends new transcript lines to the server (POST /api/push). Started by the Stop hook
// (detached, so Claude Code never waits), or by hand (in this repo, scripts/push.js runs this file):
//   node scripts/push.js            send what the hooks have marked
//   node scripts/push.js --status   server, identities and their tokens, what waits
//
// One identity = one Claude account in one Claude organisation (docs/plugin.md in the server repo). Each
// has its own token and its own folders' workspaces and projects, and lines go only with the token of the identity that wrote them:
//   the turn register  each prompt (UserPromptSubmit) and each reply's end (Stop) writes the transcript's size and the
//                      identity logged in at that moment. The bytes between two marks of the same identity are that
//                      identity's; between marks of different identities (an account switch in between), and before a
//                      session's first mark (history, before the plugin), they are of no known account. Chunks never
//                      cross a mark, so one push is never two identities.
//   where lines go     an identity's lines with its token, into the folder's workspace and project it chose; an identity
//                      without a token yet (or a folder without both): the session waits there, nothing after it is sent
//                      until it is given; lines of no known account are not sent (held.json, positions only: later
//                      they go to the person's own personal space as unmapped, plan phase 3).
//
// ~/.string-claude-sync-next/ (STRING_CLAUDE_SYNC_DIR)
//   identities/<hash of server + account + organisation>/
//     identity.json          the Claude account and organisation (ids, names, email), and once connected the person
//                            and company String Cortex knows it as
//     token.json             its Claude Code token: the refresh token and the access token it was traded for (chmod
//                            600); token.lock/ while one process trades it
//     folders.json           folder → the workspace and project its conversations go to (asked once per new folder)
//   sessions/<session>.json  the turn register of a session (the hooks write it; the pusher only reads it)
//   pending/<session>.json   one per session with lines to look at (written by the Stop hook; removed once done)
//   state.json               read position (bytes) per transcript: everything before it was sent, or held
//   held.json                ranges of no known account, not sent
//   push.lock/               only one pusher at a time; push.log  what it did
//
// Server: STRING_CLAUDE_SYNC_URL, else defaults.json next to scripts/, else http://127.0.0.1:4000. Pushes carry the
// identity's access token (an hour long), traded for its refresh token at POST /api/plugin/token together with the
// identity; the first trade binds the token to it (docs/stringhub-nucleus.md → Tokens and the plugin).
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const env = (name) => process.env[`STRING_CLAUDE_SYNC_${name}`] || process.env[`CLAUDE_RECALL_${name}`];
const DIR = env('DIR') || path.join(os.homedir(), '.string-claude-sync-next');
const PENDING = path.join(DIR, 'pending');
const SESSIONS = path.join(DIR, 'sessions');
const IDENTITIES = path.join(DIR, 'identities');
const STATE = path.join(DIR, 'state.json');
const HELD = path.join(DIR, 'held.json');
const LOCK = path.join(DIR, 'push.lock');
const LOG = path.join(DIR, 'push.log');
const CLAUDE_DIR = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const CLAUDE_JSON = process.env.CLAUDE_CONFIG_DIR ? path.join(process.env.CLAUDE_CONFIG_DIR, '.claude.json') : path.join(os.homedir(), '.claude.json');

const CHUNK = Number(env('CHUNK') || 4 * 1024 * 1024); // lines per push, before gzip
const MAX_LINE = 10 * 1024 * 1024; // one line bigger than this (a huge pasted image) is skipped, not even read
const MAX_TRIES = 5; // tries per session per run (a hook re-marking an active session); then the next run
const MAX_STALLS = 3; // answers in a row that move nothing (409, an ack that does not advance): give up for this run
const MAX_MARKS = 2000;

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function writeJson(file, value, mode = 0o600) {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), { mode });
  fs.renameSync(tmp, file); // atomic: a crash never leaves half a file
}
/**
 * Server URL, first one set wins: STRING_CLAUDE_SYNC_URL (managed settings, which a user cannot override; or the
 * environment) → the plugin's defaults.json (the URL most machines use, kept in git) → http://127.0.0.1:<port>.
 */
function config() {
  const defaults = env('NO_DEFAULTS') ? {} : readJson(path.join(__dirname, '..', 'defaults.json'), {});
  const port = env('PORT') || process.env.APP_PORT || 4000;
  return { url: (env('URL') || defaults.url || `http://127.0.0.1:${port}`).replace(/\/+$/, '') };
}
function log(msg) {
  const line = `${new Date().toISOString()} ${msg}\n`;
  if (process.stdout.isTTY) process.stdout.write(line);
  try { fs.mkdirSync(DIR, { recursive: true, mode: 0o700 }); } catch {}
  try { if (fs.statSync(LOG).size > 1e6) fs.renameSync(LOG, `${LOG}.1`); } catch {}
  try { fs.appendFileSync(LOG, line); } catch {}
}
const safeName = (s) => String(s).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 100);

// ---------- the account Claude Code is logged in with, and identities ----------
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

/** The identity of an account ({ key, account }), or null: not logged in, an API key, or no organisation. */
function identityOf(acct, cfg = config()) {
  if (!acct || acct.kind !== 'oauth' || !acct.account_uuid || !acct.org_uuid) return null;
  const key = crypto.createHash('sha256').update(`${cfg.url}|${acct.account_uuid}|${String(acct.org_uuid).toLowerCase()}`).digest('hex').slice(0, 16);
  return { key, account: acct };
}
/** The identity logged in now, kept in its folder (identity.json) so the pusher has its account later. */
function current(cfg = config()) {
  const id = identityOf(account(), cfg);
  if (!id) return null;
  const file = path.join(IDENTITIES, id.key, 'identity.json');
  const had = readJson(file, null);
  if (!had || had.account?.email !== id.account.email || had.account?.org_name !== id.account.org_name) {
    try { writeJson(file, { ...(had || {}), key: id.key, url: cfg.url, account: id.account, seen_at: new Date().toISOString() }); } catch {}
  }
  return id;
}
const idDir = (key) => path.join(IDENTITIES, key);
const readIdentity = (key) => readJson(path.join(idDir(key), 'identity.json'), null);
function listIdentities() {
  try { return fs.readdirSync(IDENTITIES).map(readIdentity).filter(Boolean); } catch { return []; }
}
/** What the server answers needs: the identity's ids. */
const idBody = (acct) => ({ account_uuid: acct.account_uuid, org_uuid: acct.org_uuid });

// ---------- an identity's token and folders' workspaces and projects ----------
const tokenFile = (key) => path.join(idDir(key), 'token.json');
/** The identity's Claude Code token for this server ({ token: refresh token, access, access_until, … }), or null. */
function readToken(cfg, key) {
  if (!key) return null;
  const t = readJson(tokenFile(key), null);
  return t?.token && (!t.url || t.url === cfg.url) ? t : null;
}
function saveToken(key, t) { writeJson(tokenFile(key), t); }
function dropToken(key) { fs.rmSync(tokenFile(key), { force: true }); }

/** The folder a setting is kept for: the folder itself, by its path (git or not, a folder is a folder). */
const folderKey = (cwd) => path.resolve(String(cwd || ''));
// folders.json, per identity: { "<folder>": { workspace: { id, name }, project: { id, name } | null, at } }
// (before projects: { id, name, at }, the workspace only; read as a workspace without a project)
const normal = (v) => (!v ? null : v.workspace ? { workspace: v.workspace, project: v.project || null, at: v.at } : { workspace: { id: v.id, name: v.name }, project: null, at: v.at });
const readFolders = (key) => (key ? readJson(path.join(idDir(key), 'folders.json'), {}) : {});
function saveFolders(key, map) { writeJson(path.join(idDir(key), 'folders.json'), map); }
/**
 * The setting of this folder: { key, workspace, project } (project null: not chosen yet), or null. Its own, or the
 * nearest folder above it that has one (a subfolder, such as a Claude Code worktree inside a project, goes with it).
 * The home folder and the root are never inherited from.
 */
function settingFor(cwd, map) {
  if (!cwd) return null;
  const home = os.homedir();
  const start = folderKey(cwd);
  for (let d = start; d && d !== path.dirname(d); d = path.dirname(d)) {
    if (map[d] && (d === start || d !== home)) return { key: d, ...normal(map[d]) };
  }
  return null;
}
/** Saves a folder's workspace and project (project null: the workspace only, for now). */
function setFolder(idKey, folder, workspace, project) {
  const map = readFolders(idKey);
  map[folderKey(folder)] = { workspace: { id: workspace.id, name: workspace.name }, project: project ? { id: project.id, name: project.name } : null, at: new Date().toISOString() };
  saveFolders(idKey, map);
}

/**
 * Plugin 1.8.0 before identities kept one token and one folders.json for the laptop: they go to the identity logged in
 * now, once (the server binds the token to it on its next trade).
 */
function migrateFlat() {
  const flat = path.join(DIR, 'token.json');
  if (!fs.existsSync(flat) && !fs.existsSync(path.join(DIR, 'folders.json'))) return;
  const id = current();
  if (!id) return;
  for (const name of ['token.json', 'folders.json']) {
    const from = path.join(DIR, name);
    const to = path.join(idDir(id.key), name);
    try { if (fs.existsSync(from) && !fs.existsSync(to)) { fs.mkdirSync(idDir(id.key), { recursive: true, mode: 0o700 }); fs.renameSync(from, to); } else fs.rmSync(from, { force: true }); } catch {}
  }
}

// ---------- the turn register ----------
const registerFile = (sessionId) => path.join(SESSIONS, `${safeName(sessionId)}.json`);
/**
 * Writes a mark: the transcript's size now and the identity logged in now (null: none, or an API key). The hooks call
 * it (prompt: a turn starts; Stop: a reply ended); never throws. Marks below what was already sent are dropped, all but
 * the last one (it says whose the bytes after it are).
 */
function note(kind, { session_id, transcript_path, cwd = null }) {
  try {
    if (!session_id || !transcript_path) return null;
    const id = current();
    let size = 0;
    try { size = fs.statSync(transcript_path).size; } catch {}
    const file = registerFile(session_id);
    const reg = readJson(file, null) || { session_id, path: transcript_path, marks: [] };
    reg.path = transcript_path;
    if (cwd) reg.cwd = cwd;
    let marks = Array.isArray(reg.marks) ? reg.marks : [];
    // the transcript got shorter (rewritten): what came before is not comparable any more
    if (marks.length && size < marks[marks.length - 1].size) marks = [];
    marks.push({ size, id: id?.key || null, kind, at: new Date().toISOString() });
    const done = readJson(STATE, { files: {} }).files?.[transcript_path]?.offset || 0;
    const lastBelow = marks.reduce((k, m, i) => (m.size <= done ? i : k), -1);
    if (lastBelow > 0) marks = marks.slice(lastBelow);
    reg.marks = marks.slice(-MAX_MARKS);
    writeJson(file, reg);
    return id;
  } catch {
    return null;
  }
}

/** Marks a session as having lines to look at (the Stop hook; cheap, never throws). */
function mark({ session_id, transcript_path, cwd = null }) {
  if (!session_id || !transcript_path) return false;
  try {
    writeJson(path.join(PENDING, `${safeName(session_id)}.json`), { session_id, path: transcript_path, cwd, at: new Date().toISOString() });
    return true;
  } catch { return false; }
}

/** The last '\n' + 1 at or before `pos` (not below `floor`): a mark in the middle of a line belongs to the next range. */
function lineEnd(fd, pos, floor) {
  const step = 1 << 16;
  for (let hi = pos; hi > floor;) {
    const lo = Math.max(floor, hi - step);
    const buf = Buffer.alloc(hi - lo);
    fs.readSync(fd, buf, 0, buf.length, lo);
    const i = buf.lastIndexOf(10);
    if (i !== -1) return lo + i + 1;
    hi = lo;
  }
  return floor;
}

/**
 * A session's ranges from `from` up to its last mark: [{ start, end, id }] in order, id null for no known account,
 * consecutive ranges of one identity joined, every boundary at a line's end.
 */
function rangesOf(reg, fd, from) {
  const marks = (reg.marks || []).filter((m) => Number.isSafeInteger(m.size));
  const out = [];
  let prevEnd = from;
  for (let i = 0; i < marks.length; i++) {
    const a = i === 0 ? { size: 0, id: null } : marks[i - 1];
    const b = marks[i];
    // the bytes before a session's first mark are of no known account
    const start = Math.max(prevEnd, i === 0 ? 0 : a.size);
    const end = Math.max(start, lineEnd(fd, b.size, start));
    if (end <= start) continue;
    const id = i > 0 && a.id && a.id === b.id ? a.id : null;
    const last = out[out.length - 1];
    if (last && last.id === id && last.end === start) last.end = end;
    else out.push({ start, end, id });
    prevEnd = end;
  }
  return out.filter((r) => r.end > from).map((r) => ({ ...r, start: Math.max(r.start, from) }));
}

function hold(file, start, end) {
  const held = readJson(HELD, []);
  const last = held[held.length - 1];
  if (last && last.path === file && last.end === start) last.end = end;
  else held.push({ path: file, start, end, at: new Date().toISOString() });
  writeJson(HELD, held.slice(-5000));
}

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
class Stop extends Error {} // stop this run, keep every marker (server down, …)

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
    return { status: res.status, json };
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
      if (i >= 3) throw new Stop(`Server error: ${r.status} ${r.json.code || r.json.error || ''}`.trim());
    } catch (e) {
      if (e instanceof Stop) throw e;
      if (i >= 3) throw new Stop(`Cannot reach server: ${e.cause?.code || (e.name === 'AbortError' ? 'timeout' : e.message)}`);
    }
    await new Promise((r) => setTimeout(r, 1000 * 3 ** i));
  }
}

function markerIds() {
  try { return fs.readdirSync(PENDING).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)); } catch { return []; }
}

// ---------- an identity's tokens ----------
/** Only one process trades an identity's refresh token at a time (a stale lock, over 30 s old, is taken over). */
async function withTokenLock(key, fn) {
  const lock = path.join(idDir(key), 'token.lock');
  fs.mkdirSync(idDir(key), { recursive: true, mode: 0o700 });
  for (let i = 0; ; i++) {
    try { fs.mkdirSync(lock); break; } catch {
      try { if (Date.now() - fs.statSync(lock).mtimeMs > 30000) { fs.rmSync(lock, { recursive: true, force: true }); continue; } } catch {}
      if (i > 100) throw new Stop('token lock busy');
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  try { return await fn(); } finally { fs.rmSync(lock, { recursive: true, force: true }); }
}

/**
 * Trades a refresh token for this identity: → { status, json }. The server binds a new token to the identity on its
 * first trade, and refuses another identity later (docs/stringhub-nucleus.md → Tokens and the plugin).
 */
function trade(cfg, refresh, acct, timeout = 10000) {
  return callRetry('POST', `${cfg.url}/api/plugin/token`, { headers: { Authorization: `Bearer ${refresh}` }, body: { identity: idBody(acct) }, timeout });
}

/**
 * An access token for the identity (traded for its refresh token when there is none, or it runs out within a minute,
 * or `force`). The trade's new refresh token replaces the old one. Refused for good (revoked, replaced, the person out
 * of the organisation, bound to another identity): the token is deleted and Claude Code asks for a new one.
 */
async function accessToken(cfg, key, { force = false } = {}) {
  const fresh = (t) => t?.access && Date.parse(t.access_until) > Date.now() + 60000;
  const first = readToken(cfg, key);
  if (!first) return null;
  if (!force && fresh(first)) return first.access;
  const acct = readIdentity(key)?.account;
  if (!acct) return null;
  return withTokenLock(key, async () => {
    for (let i = 0; i < 3; i++) {
      const own = readToken(cfg, key); // another process may have traded it while this one waited
      if (!own) return null;
      if (fresh(own) && (!force || own.access !== first.access)) return own.access;
      const r = await trade(cfg, own.token, acct);
      if (r.status === 200 && r.json.access_token) {
        saveToken(key, { ...own, token: r.json.refresh_token, access: r.json.access_token, access_until: new Date(Date.now() + (r.json.expires_in || 3600) * 1000).toISOString() });
        return r.json.access_token;
      }
      if (r.status === 409 && r.json.code === 'REFRESH_RACE') { await new Promise((ok) => setTimeout(ok, 1000)); continue; } // traded a moment ago elsewhere
      if (r.status === 401 || r.json.code === 'IDENTITY_MISMATCH') {
        dropToken(key);
        throw new Stop(`${r.json.code || 'REFRESH_TOKEN_INVALID'}: Token for ${acct.email || acct.account_uuid} (${acct.org_name || acct.org_uuid}) no longer works. Claude Code will ask for a new one.`);
      }
      throw new Stop(`Token rejected: ${r.status} ${r.json.code || ''}`.trim());
    }
    throw new Stop('Token exchange failed repeatedly elsewhere. Will retry on the next run.');
  });
}

// ---------- reading lines ----------
/** The next run of complete lines from `start` up to `limit`: { start, end, data, sizes? }, { start, end, skipped } or null. */
function nextChunk(fd, start, limit) {
  if (start >= limit) return null;
  const want = Math.min(CHUNK, limit - start);
  let buf = Buffer.alloc(want);
  let n = fs.readSync(fd, buf, 0, want, start);
  let nl = buf.lastIndexOf(10, n - 1);
  if (nl === -1) {
    // one line longer than CHUNK: find its end
    let pos = start + n;
    const step = Buffer.alloc(1 << 20);
    for (;;) {
      if (pos >= limit) return null; // not finished yet: next time
      const k = fs.readSync(fd, step, 0, Math.min(step.length, limit - pos), pos);
      const i = step.subarray(0, k).indexOf(10);
      if (i !== -1) { pos += i + 1; break; }
      pos += k;
    }
    if (pos - start > MAX_LINE) return { start, end: pos, skipped: true };
    buf = Buffer.alloc(pos - start);
    n = fs.readSync(fd, buf, 0, buf.length, start);
    nl = n - 1;
  }
  return { start, end: start + nl + 1, ...stripImages(hideTokens(buf.toString('utf8', 0, nl + 1))) };
}

/** A Claude Code token in a line (given in the form or as a message) never leaves the laptop: same length, so the
 * read position stays the file's. (Traded at once, it no longer works anyway.) */
const hideTokens = (text) => text.replace(/sct_[0-9a-f]{48}/g, (t) => `sct_${'x'.repeat(t.length - 4)}`);

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
const say = (() => { const said = new Set(); return (k, msg) => { if (!said.has(k)) { said.add(k); log(msg); } }; })();
const who = (acct) => `${acct?.email || acct?.account_uuid || '?'} (${acct?.org_name || acct?.org_uuid || '?'})`;

/**
 * Sends a session's lines up to its last mark, range by range: true when everything is sent or held, false when
 * something waits (the marker then stays). A range waits when its identity has no token yet, its folder no project,
 * or the server refused it; it is kept in state.json (`waiting`) and the read position moves on, so the ranges of
 * other identities after it still go. Later ranges of a waiting identity wait behind it (one identity's lines arrive
 * in order). Not covered: two identities of one company where the first waits; its lines, sent later, come after
 * the company already has the second's, and the server keeps only what is new (docs/plugin.md → Pending).
 */
async function pushSession(cfg, marker, state, access) {
  const reg = readJson(registerFile(marker.session_id), null);
  const file = reg?.path || marker.path;
  if (!reg || !file) return true; // no register: nothing is known to be anyone's (the hooks write one from now on)
  const slug = path.basename(path.dirname(file));
  const session_id = path.basename(file, '.jsonl');
  const cwd = reg.cwd || marker.cwd || null;
  let st;
  try { st = fs.statSync(file); } catch { log(`${session_id.slice(0, 8)}: Transcript was deleted. Nothing to send.`); return true; }
  const entry = (state.files[file] = state.files[file] || { offset: 0 });
  if (typeof entry.offset !== 'number' || entry.offset > st.size) { entry.offset = 0; entry.waiting = []; } // lost, or the transcript was rewritten
  const waits = (entry.waiting || []).filter((w) => w.end <= st.size);

  const fd = fs.openSync(file, 'r');
  const sent = new Map();
  const keep = [];
  const blocked = new Set();
  const wait = (range, from = range.start) => {
    const last = keep[keep.length - 1];
    if (last && last.id === range.id && last.end === from) last.end = range.end;
    else keep.push({ start: from, end: range.end, id: range.id });
    blocked.add(range.id);
  };
  let at = 0; // how many waiting ranges were looked at (a run stopped half way keeps the rest)
  try {
    const fresh = rangesOf(reg, fd, entry.offset).filter((r) => r.end <= st.size);
    for (const [i, range] of [...waits, ...fresh].entries()) {
      at = i;
      const isNew = i >= waits.length;
      const moveOn = () => { if (isNew) { entry.offset = Math.max(entry.offset, range.end); entry.waiting = keep; writeJson(STATE, state); } };
      if (!range.id) { hold(file, range.start, range.end); moveOn(); continue; } // of no known account: not sent (later: the person's personal space)
      const acct = readIdentity(range.id)?.account;
      const own = acct && readToken(cfg, range.id);
      const set = own && settingFor(cwd, readFolders(range.id));
      if (blocked.has(range.id)) { wait(range); moveOn(); continue; }
      if (!own) {
        say(`token:${range.id}`, `${slug} › ${session_id.slice(0, 8)}: Waiting for a Claude Code token for ${who(acct)}. Claude Code will ask for it when this account signs in.`);
        wait(range); moveOn(); continue;
      }
      // a folder goes into a workspace's project: until both are chosen its lines wait (a person in no workspace at all:
      // sent without one, into the company's default workspace)
      if (!set?.project && own.workspaces?.length) {
        say(`ws:${range.id}:${cwd}`, `${slug} › ${session_id.slice(0, 8)}: Waiting for a ${set ? 'project' : 'workspace and project'} for ${cwd ? folderKey(cwd) : 'its folder'} (${acct?.email || acct?.account_uuid || '?'}, ${acct?.org_name || acct?.org_uuid || '?'}). Claude Code will ask on the next prompt in this folder.`);
        wait(range); moveOn(); continue;
      }
      const r = await pushRange(cfg, { slug, session_id, cwd, fd, range, acct, key: range.id, set, entry, state, access, sent });
      if (!r.ok) wait(range, r.at);
      moveOn();
    }
    at = waits.length;
  } catch (e) {
    keep.push(...waits.slice(at));
    throw e;
  } finally {
    fs.closeSync(fd);
    entry.waiting = keep;
    writeJson(STATE, state);
  }
  for (const [key, n] of sent) if (n) log(`${slug} › ${session_id.slice(0, 8)}: Sent ${n < 10240 ? `${n} bytes` : `${(n / 1024).toFixed(0)} KB`} for ${who(readIdentity(key)?.account)}.`);
  return !keep.length;
}

/** One identity's range, chunk by chunk. */
async function pushRange(cfg, { slug, session_id, cwd, fd, range, acct, key, set, entry, state, access, sent }) {
  let cur = nextChunk(fd, range.start, range.end);
  let gap = true; // the bytes before a range are another identity's or of none: the server may move past them
  let stalls = 0;
  let requests = 0;
  const maxRequests = 2 * Math.ceil((range.end - range.start) / CHUNK) + 10;
  while (cur) {
    if (stalls >= MAX_STALLS || ++requests > maxRequests) {
      log(`ERROR ${slug} › ${session_id.slice(0, 8)}: Server did not advance the read position (at ${cur.start}). Data kept for the next run.`);
      return { ok: false, at: cur.start };
    }
    const send = async (force) => callRetry('POST', `${cfg.url}/api/push`, {
      gzip: true, headers: { Authorization: `Bearer ${await access(key, force)}` }, timeout: 120000,
      body: {
        slug, session_id, start: cur.start, end: cur.end, data: cur.data || '', skipped: !!cur.skipped,
        ...(cur.sizes ? { sizes: cur.sizes } : {}),
        account: acct, cwd: cwd || null, gap, ...(set ? { workspace_id: set.workspace.id, project_id: set.project?.id } : {}),
      },
    });
    let r = await send(false);
    if (r.json.code === 'ACCESS_TOKEN_INVALID') r = await send(true); // traded again once
    const code = r.json.code;
    if (code === 'QUEUED' || code === 'DUPLICATE') {
      if (cur.skipped) log(`${session_id.slice(0, 8)}: Skipped a line larger than the allowed size (${((cur.end - cur.start) / 1048576).toFixed(1)} MB).`);
      sent.set(key, (sent.get(key) || 0) + (code === 'QUEUED' ? cur.end - cur.start : 0));
      const to = Math.min(Math.max(r.json.offset, cur.start), range.end);
      stalls = to > cur.start ? 0 : stalls + 1;
      entry.offset = Math.max(entry.offset, to);
      writeJson(STATE, state);
      gap = false;
      cur = nextChunk(fd, to, range.end); // (the server may already have had more)
    } else if (code === 'OFFSET_MISMATCH') {
      // the server has less of this company's than sent (it lost some): from there, within this identity's range
      const from = Math.max(range.start, Math.min(r.json.offset, cur.start));
      log(`${session_id.slice(0, 8)}: Server position is ${r.json.offset} bytes; local position was ${cur.start}. Resending from ${from}.`);
      stalls++;
      gap = from === range.start;
      cur = nextChunk(fd, from, range.end);
    } else if (code === 'EXCLUDED') {
      return { ok: true, at: range.end }; // the company doesn't keep this project
    } else if (code === 'WORKSPACE_NOT_ALLOWED') {
      // no longer one of the person's workspaces: forget it, so the next prompt in that folder asks again; lines wait
      const map = readFolders(key);
      if (set) { delete map[set.key]; saveFolders(key, map); }
      log(`${slug} › ${session_id.slice(0, 8)}: You no longer have access to this folder’s workspace. Claude Code will ask you to choose another.`);
      return { ok: false, at: cur.start };
    } else if (code === 'PROJECT_NOT_ALLOWED') {
      // the project was archived or is gone: keep the workspace, ask for the project again; lines wait
      if (set) setFolder(key, set.key, set.workspace, null);
      log(`${slug} › ${session_id.slice(0, 8)}: This folder’s project is no longer available. Claude Code will ask you to choose another.`);
      return { ok: false, at: cur.start };
    } else if (code === 'ORG_NOT_ALLOWED') {
      say(`org:${key}`, `${slug} › ${session_id.slice(0, 8)}: Waiting because ${who(acct)} belongs to a Claude organisation no longer linked to the company in String Cortex.`);
      return { ok: false, at: cur.start };
    } else if (code === 'IDENTITY_MISMATCH') {
      log(`ERROR ${slug} › ${session_id.slice(0, 8)}: Token for ${who(acct)} belongs to another Claude account. Data kept for retry.`);
      return { ok: false, at: cur.start };
    } else {
      answer(r, slug, session_id, cur.sizes);
      return { ok: false, at: cur.start };
    }
  }
  return { ok: true, at: range.end };
}

/**
 * Any other answer: 429 stops the run (markers kept); any other refusal (400 BAD_RANGE, 413, …) is logged and the
 * session is left alone for the rest of this run: its marker stays, the next hook tries again.
 */
function answer(r, slug, session_id, sizes = null) {
  const code = r.json.code || r.json.error || '';
  if (r.status === 429) throw new Stop(`Server is busy: 429 ${code}`.trim());
  const old = r.status === 400 && code === 'BAD_RANGE' && sizes ? ' (lines with images need a server from 2026-10-18 or later)' : '';
  log(`ERROR ${slug} › ${session_id.slice(0, 8)}: ${r.status} ${code} ${r.json.reason || ''}`.trim() + `${old}. Data kept for the next run.`);
  return false;
}

// ---------- run ----------
/** Sends what is marked. `tries` (id → count) lives for the whole run: a session that failed, or was tried
 *  MAX_TRIES times, is not tried again until the next run, so no server answer can make the pusher spin. */
async function drain(cfg, tries) {
  const state = readJson(STATE, null);
  const st = state && typeof state.files === 'object' ? state : { version: 2, files: {} };
  const cache = new Map();
  const access = async (key, force) => {
    if (!force && cache.has(key)) return cache.get(key);
    const a = await accessToken(cfg, key, { force });
    cache.set(key, a);
    return a;
  };
  for (;;) {
    const ids = markerIds().filter((id) => (tries.get(id) || 0) < MAX_TRIES);
    if (!ids.length) return;
    let progressed = false;
    for (const id of ids) {
      const file = path.join(PENDING, `${id}.json`);
      const work = `${file}.work`;
      try { fs.renameSync(file, work); } catch { continue; } // a newer hook may re-create `file` meanwhile
      tries.set(id, (tries.get(id) || 0) + 1);
      const marker = readJson(work, null);
      let ok = false;
      try {
        ok = !marker?.session_id || (await pushSession(cfg, marker, st, access));
      } catch (e) {
        if (!fs.existsSync(file)) fs.renameSync(work, file); // keep it for the next run
        else fs.rmSync(work, { force: true });
        throw e;
      }
      if (ok) { fs.rmSync(work, { force: true }); progressed = true; } else {
        tries.set(id, MAX_TRIES); // waits or refused: not again this run
        if (!fs.existsSync(file)) fs.renameSync(work, file);
        else fs.rmSync(work, { force: true });
      }
    }
    if (!progressed) return; // what is left waits; the next hook tries again
  }
}

async function run() {
  migrateFlat();
  const cfg = config();
  const tries = new Map();
  const left = () => markerIds().filter((id) => (tries.get(id) || 0) < MAX_TRIES);
  for (;;) {
    if (!takeLock()) return; // another pusher is at it; it picks up our marker too
    try {
      await drain(cfg, tries);
    } catch (e) {
      if (!(e instanceof Stop)) throw e;
      log(e.message);
      return;
    } finally {
      dropLock();
    }
    // a hook may have marked a session after our last look and found the lock taken: look once more
    if (!left().length) return;
  }
}

function status() {
  migrateFlat();
  const cfg = config();
  const now = identityOf(account(), cfg);
  console.log(`Server:     ${cfg.url}`);
  console.log(`Signed in:  ${now ? who(now.account) : 'No Claude organisation account (signed out or using API key); lines are not sent'}`);
  const ids = listIdentities().filter((i) => !i.url || i.url === cfg.url);
  if (!ids.length) console.log('Accounts:   none yet');
  for (const i of ids) {
    const t = readToken(cfg, i.key);
    const folders = Object.entries(readFolders(i.key)).map(([k, v]) => { const n = normal(v); return `${k} → ${n.workspace.name} / ${n.project?.name || '(no project yet)'}`; }).join('; ') || 'none selected yet';
    console.log(`Account:    ${who(i.account)}${now?.key === i.key ? ' [currently signed in]' : ''}`);
    console.log(`  Token:    ${t ? `${t.name || '?'} at ${t.company || '?'}; ${t.access_until && Date.parse(t.access_until) > Date.now() ? `valid until ${t.access_until}` : 'Will be exchanged on next push'}; workspaces: ${(t.workspaces || []).map((w) => w.name).join(', ') || 'none'}` : 'None (create one in String Cortex → avatar → Claude Code token; Claude Code will open a form)'}`);
    console.log(`  Folders:  ${folders}`);
  }
  const held = readJson(HELD, []);
  console.log(`Pending:    ${markerIds().length} session(s) to check`);
  console.log(`Held:       ${held.length ? `${held.reduce((n, h) => n + (h.end - h.start), 0)} bytes in ${new Set(held.map((h) => h.path)).size} transcript(s) without a known account (not sent)` : 'None'}`);
  console.log(`Log:        ${LOG}`);
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--status')) return status();
  if (args.includes('--all')) {
    console.log('--all: Older conversations have no account information, so they cannot be sent yet. They will wait for a personal space.');
    return;
  }
  run().catch((e) => { log(`ERROR ${e.stack || e.message}`); process.exitCode = 1; });
}

if (require.main === module) main();

module.exports = {
  DIR, account, identityOf, current, readIdentity, listIdentities, idBody, readToken, saveToken, dropToken, trade,
  accessToken, folderKey, readFolders, saveFolders, settingFor, setFolder, note, mark, rangesOf, run, main, stripImages, config,
  call, readJson, writeJson, Stop, migrateFlat,
};
