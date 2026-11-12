// What the prompt hook (prompt.js) and the plugin's tools for Claude (../../scripts/mcp.js) both do with the server,
// always for the identity logged in now (one Claude account in one Claude organisation, push.js): connect it with
// the person's token, and the workspace and project of a folder. Never returns or logs a token.
const path = require('path');
const push = require('./push');

const TOKEN_RE = /^\s*(sct_[0-9a-f]{48})\s*$/;
const ANY_TOKEN_RE = /sct_[0-9a-f]{20,}/i; // a whole or cut-off token anywhere in a message
const CONNECT_RE = /^\/(?:[\w.-]+:)?cortex\s+connect\s+(sct_[0-9a-f]{48})\s*$/;

/**
 * What a prompt says about a token, for the prompt hook: { token } when the person sent one to connect with (the
 * token alone, or "/cortex connect <token>"), { stray: true } when a token is only part of a longer message (it must
 * not reach Claude either), else null. Apps add text of their own around the person's words: the Claude desktop app
 * puts a <system-reminder> block in front (a session with linked sessions), and a slash command may arrive as its
 * <command-name> / <command-args> record. Those are taken off first.
 */
function tokenIn(prompt) {
  let t = String(prompt || '').replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, ' ');
  const name = /<command-name>\s*([^<]*?)\s*<\/command-name>/.exec(t);
  if (name && /^\/?(?:[\w.-]+:)?cortex$/.test(name[1])) {
    const args = /<command-args>([\s\S]*?)<\/command-args>/.exec(t);
    t = `/cortex ${args ? args[1] : ''}`;
  }
  t = t.trim();
  const m = TOKEN_RE.exec(t) || CONNECT_RE.exec(t);
  if (m) return { token: m[1] };
  return ANY_TOKEN_RE.test(String(prompt || '')) ? { stray: true } : null;
}
const who = (acct) => `${acct.email || acct.account_uuid} (${acct.org_name || acct.org_uuid})`;
/** Why there is no identity to connect: for the person. */
const NO_IDENTITY = 'String Cortex: Claude Code is signed out or using an API key instead of an organisation account. Sign in with your organisation’s Claude account using /login, then try again.';

async function api(cfg, method, p, token, body) {
  return push.call(method, `${cfg.url}${p}`, { headers: { Authorization: `Bearer ${token}` }, body, timeout: 5000 });
}
/** With the identity's access token (traded when needed); a refused one is traded again once. */
async function asIdentity(cfg, key, method, p, body) {
  let r = await api(cfg, method, p, await push.accessToken(cfg, key), body);
  if (r.status === 401 && r.json.code === 'ACCESS_TOKEN_INVALID') r = await api(cfg, method, p, await push.accessToken(cfg, key, { force: true }), body);
  return r;
}

/**
 * Trades a token the person gave (as a message or in the form) for the identity logged in now: the server binds the
 * token to it (its organisation must be one of the company's) and gives a new refresh token, so the one they gave stops
 * working at once. Kept in the identity's folder. → { ok, text }, text for the person.
 */
async function connectWith(token) {
  const cfg = push.config();
  const id = push.current(cfg);
  if (!id) return { ok: false, text: NO_IDENTITY };
  const t = TOKEN_RE.exec(String(token || ''));
  if (!t) return { ok: false, text: 'String Cortex: This token is incomplete. It must start with sct_ followed by 48 letters or digits. Copy it again from String Cortex → avatar → Claude Code token.' };
  let x, r;
  try { x = await push.trade(cfg, t[1], id.account, 5000); } catch { return { ok: false, text: `String Cortex: Cannot reach ${cfg.url} to verify your token. Please try again shortly.` }; }
  if (x.status !== 200 || !x.json.access_token) {
    const code = x.json.code;
    if (code === 'ORG_NOT_ALLOWED') return { ok: false, text: `String Cortex: ${who(id.account)} is not in one of your organisation’s AI orgs, so this token cannot connect this account. Sign in with your organisation’s Claude account, or ask an admin to add the AI org under Organisation → Setup → AI platforms. The token itself is still valid.` };
    if (code === 'IDENTITY_IN_USE') return { ok: false, text: `String Cortex: Another person has already connected ${who(id.account)} with their token. Each Claude account belongs to one person. Contact your organisation’s admin.` };
    if (code === 'IDENTITY_MISMATCH') return { ok: false, text: `String Cortex: This token is linked to a different Claude account. Generate a new token for ${who(id.account)} from your avatar → Claude Code token.` };
    return { ok: false, text: 'String Cortex: This token is invalid. It may already have been used, replaced, or revoked. Generate a new token from your avatar → Claude Code token.' };
  }
  const saved = { token: x.json.refresh_token, access: x.json.access_token, access_until: new Date(Date.now() + (x.json.expires_in || 3600) * 1000).toISOString(), url: cfg.url, saved_at: new Date().toISOString() };
  push.saveToken(id.key, saved);
  try { r = await api(cfg, 'GET', '/api/plugin/me', saved.access); } catch { r = { status: 0, json: {} }; }
  push.saveToken(id.key, { ...saved, name: r.json.name || null, company: r.json.company || null, workspaces: r.json.workspaces || [] });
  const ident = push.readIdentity(id.key) || {};
  push.writeJson(path.join(push.DIR, 'identities', id.key, 'identity.json'), { ...ident, person: r.json.name || null, company: r.json.company || null });
  if (r.status !== 200) return { ok: true, text: `String Cortex: Connected for ${who(id.account)}. Your token stays on this laptop.` };
  return { ok: true, text: `String Cortex: Connected as ${r.json.name} at ${r.json.company} for ${who(id.account)}. Your token stays on this laptop.` };
}

/**
 * Connecting from the company's member list (server connect-requests.js, docs/roster-connect.md), for the identity
 * logged in now when it has no token. The first time, the plugin asks the server with a claim secret it keeps
 * (claim.json in the identity's folder, mode 600; only its sha256 is sent). The answer is only the company's mode.
 * In 'list' mode, later calls ask whether the person (or an admin) approved this laptop; once approved the server
 * hands over a token bound to this Claude account, which is traded like a pasted one.
 *
 * What it never does (CORTEX-125): take a failed ask (no answer, a timeout, a status other than 200) for "own token".
 * That is { mode: 'unknown', error } and nothing is saved, so the next prompt asks again and the person is told String
 * Cortex couldn't be reached. Also: a `token` answer is asked again after 10 minutes (the admin may switch to the list);
 * a waiting laptop asks again every hour with the same claim (a list fixed later then matches it), and asks for its
 * answer at most every 20 s; an expired request asks again by itself; a refused one stays refused until the person
 * asks again (`/cortex connect`: { again: true }).
 * → { mode: 'token' } (use the token form), { mode: 'list', status: 'pending' | 'refused', why? },
 *   { mode: 'unknown', error }, or { connected: true, text }. null: no identity, or it already has a token.
 */
const CLAIM_RECHECK_MS = 10 * 60e3; // a `token` answer: asked again after this (the admin may switch to the list)
const CLAIM_REASK_MS = 60 * 60e3; // waiting: the same claim asks again after this (a fixed list then matches it)
const STATUS_EVERY_MS = 20e3; // waiting: its answer is asked at most this often (an office's laptops share one address)
const ASK_TIMEOUT_MS = 8000;
const claimFile = (key) => path.join(push.DIR, 'identities', key, 'claim.json');
const age = (iso) => Date.now() - Date.parse(iso || 0);

async function listConnect({ again = false } = {}) {
  const cfg = push.config();
  const id = push.current(cfg);
  if (!id || push.readToken(cfg, id.key)) return null;
  const file = claimFile(id.key);
  let c = push.readJson(file, null);
  const crypto = require('crypto');
  const fresh = !c || again || c.status === 'refused';
  const due = fresh || (c.mode === 'token' && age(c.asked_at) > CLAIM_RECHECK_MS) || (c.mode === 'list' && c.status === 'pending' && age(c.asked_at) > CLAIM_REASK_MS);
  if (due && (!c || c.status !== 'refused' || again)) {
    const secret = fresh ? crypto.randomBytes(32).toString('hex') : c.secret;
    let r;
    try {
      r = await push.call('POST', `${cfg.url}/api/plugin/connect-request`, { timeout: ASK_TIMEOUT_MS, body: {
        identity: push.idBody(id.account), email: id.account.email || null,
        laptop: { name: require('os').hostname(), install_id: id.account.install_id || null },
        claim_hash: crypto.createHash('sha256').update(secret).digest('hex'),
      } });
    } catch (e) { r = { status: 0, error: e.name === 'AbortError' ? 'timeout' : (e.cause?.code || 'unreachable') }; }
    if (r.status !== 200) {
      // still waiting with a claim the server knows: go on waiting; otherwise nothing saved, asked again next prompt
      if (c?.mode === 'list' && c.status === 'pending' && !fresh) push.writeJson(file, { ...c, asked_at: new Date().toISOString() });
      else return { mode: 'unknown', error: r.error || `HTTP ${r.status}${r.json?.code ? ` ${r.json.code}` : ''}` };
    } else {
      c = { secret, mode: r.json.mode === 'list' ? 'list' : 'token', status: 'pending', asked_at: new Date().toISOString(), checked_at: fresh ? null : c?.checked_at || null };
      push.writeJson(file, c);
    }
  }
  if (c.mode !== 'list') return { mode: 'token' };
  if (c.status === 'refused') return { mode: 'list', status: 'refused', why: c.why || 'refused' };
  if (!again && c.checked_at && age(c.checked_at) < STATUS_EVERY_MS) return { mode: 'list', status: 'pending' };
  let s;
  try { s = await push.call('POST', `${cfg.url}/api/plugin/connect-status`, { timeout: ASK_TIMEOUT_MS, body: { claim: c.secret } }); } catch { return { mode: 'list', status: 'pending' }; }
  c = { ...c, checked_at: new Date().toISOString() };
  push.writeJson(file, c);
  if (s.status !== 200) return { mode: 'list', status: 'pending' };
  if (s.json.status === 'approved' && s.json.refresh_token) {
    const done = await connectWith(s.json.refresh_token);
    if (done.ok) { try { require('fs').unlinkSync(file); } catch {} return { connected: true, text: done.text }; }
    push.writeJson(file, { ...c, status: 'refused', why: 'failed' });
    return { mode: 'list', status: 'refused', why: 'failed' };
  }
  // expired (not answered in 14 days): ask again by itself, once
  if (s.json.status === 'refused' && s.json.why === 'expired' && !again) return listConnect({ again: true });
  if (s.json.status === 'refused' || s.json.status === 'delivered') {
    const why = s.json.status === 'delivered' ? 'delivered' : s.json.why || 'refused';
    push.writeJson(file, { ...c, status: 'refused', why });
    return { mode: 'list', status: 'refused', why };
  }
  return { mode: 'list', status: 'pending' };
}

/** What claim.json says, without asking the server or showing its secret (for /cortex status). */
function claimState() {
  const id = push.current(push.config());
  if (!id) return null;
  const c = push.readJson(claimFile(id.key), null);
  return c ? { mode: c.mode, status: c.status, why: c.why || null, asked_at: c.asked_at || null, checked_at: c.checked_at || null } : null;
}

function ancestors(dir) {
  const out = [];
  for (let d = path.resolve(dir); d && out.length < 32; d = path.dirname(d)) {
    out.push(d);
    if (d === path.dirname(d)) break;
  }
  return out;
}

/**
 * The setting of the folder Claude Code runs in, for the identity logged in now (its company: the one its Claude
 * organisation is linked to in String Cortex). Chosen: { id, key, chosen: { workspace, project } }. Else asks the
 * server for the person's workspaces, each with its projects, and the workspace their conversations of this folder
 * already went to → { id, key, have (a workspace chosen without a project, or null), workspaces, current, filing (the
 * company's setting: { required, default })}.
 * null: no identity or no token for it. Throws push.Stop when the server can't be reached.
 */
async function folder(cwd) {
  const cfg = push.config();
  const id = push.current(cfg);
  if (!id || !push.readToken(cfg, id.key)) return null;
  const key = push.folderKey(cwd);
  const set = push.settingFor(cwd, push.readFolders(id.key));
  if (set?.project) return { id: id.key, key: set.key, chosen: { workspace: set.workspace, project: set.project } };
  const home = require('os').homedir();
  // the folder and the ones above it, not the home folder or above (it never passes its workspace on)
  const folders = [...new Set([key, ...ancestors(cwd)])].filter((d) => d === key || (d.startsWith(home) && d !== home));
  const r = await asIdentity(cfg, id.key, 'POST', '/api/plugin/folder', { folders });
  if (r.status !== 200) return { id: id.key, key, http: r.status, have: null, workspaces: [] };
  const workspaces = (r.json.workspaces || []).map(({ id: wid, name, projects }) => ({ id: wid, name, projects: (projects || []).map((p) => ({ id: p.id, name: p.name })) }));
  const cur = push.readToken(cfg, id.key);
  if (cur) push.saveToken(id.key, { ...cur, workspaces }); // (the pusher holds a folder's lines only while there are workspaces to choose)
  const have = set ? workspaces.find((w) => w.id === set.workspace.id) || null : null;
  const current = have || workspaces.find((w) => w.id === r.json.current) || (workspaces.length === 1 ? workspaces[0] : null);
  // the company's setting (server filing.js): { required } (choosing is compulsory) or { default: { workspace, project } }
  const filing = r.json.filing && typeof r.json.filing === 'object' ? r.json.filing : {};
  return { id: id.key, key: set?.key || key, have, workspaces, current, filing };
}

/**
 * Saves a folder's workspace and project for the identity logged in now: one of the person's workspaces and an active
 * project of it, by id or exact name, as the server listed them last. project null: the workspace only, for now.
 * → { workspace, project } or { error }.
 */
function choose(folderKey, workspaceWhich, projectWhich) {
  const cfg = push.config();
  const id = push.current(cfg);
  const own = id && push.readToken(cfg, id.key);
  const find = (list, which) => {
    const want = String(which ?? '').trim().toLowerCase();
    return want ? (list || []).find((x) => x.id === which) || (list || []).find((x) => x.name.toLowerCase() === want) : null;
  };
  const ws = find(own?.workspaces, workspaceWhich);
  if (!ws) return { error: 'workspace' };
  const project = projectWhich == null || projectWhich === '' ? null : find(ws.projects, projectWhich);
  if (projectWhich != null && projectWhich !== '' && !project) return { error: 'project', workspace: ws };
  push.setFolder(id.key, folderKey, ws, project);
  return { workspace: ws, project };
}

/** Forgets the token of the identity logged in now (this laptop only; revoke it in String Cortex to end it there). */
function disconnect() {
  const cfg = push.config();
  const id = push.current(cfg);
  if (!id) return null;
  const had = !!push.readToken(cfg, id.key);
  push.dropToken(id.key);
  return { had, account: id.account };
}

module.exports = { TOKEN_RE, tokenIn, NO_IDENTITY, who, asIdentity, connectWith, listConnect, claimState, folder, choose, disconnect };
