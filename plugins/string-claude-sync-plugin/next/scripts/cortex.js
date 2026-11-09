// What the prompt hook (prompt.js) and the plugin's tools for Claude (../../scripts/mcp.js) both do with the server,
// always for the identity logged in now (one Claude account in one Claude organisation, push.js): connect it with
// the person's token, and the workspace and project of a folder. Never returns or logs a token.
const path = require('path');
const push = require('./push');

const TOKEN_RE = /^\s*(sct_[0-9a-f]{48})\s*$/;
const who = (acct) => `${acct.email || acct.account_uuid} (${acct.org_name || acct.org_uuid})`;
/** Why there is no identity to connect: for the person. */
const NO_IDENTITY = 'String Cortex: Claude Code is signed out or using an API key instead of an organisation account. Sign in with your company’s Claude account using /login, then try again.';

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
    if (code === 'ORG_NOT_ALLOWED') return { ok: false, text: `String Cortex: ${who(id.account)} is not in one of your company’s approved Claude organisations, so this token cannot connect this account. Sign in with your company’s Claude account, or ask an admin to add the organisation under Company → AI platforms. The token itself is still valid.` };
    if (code === 'IDENTITY_IN_USE') return { ok: false, text: `String Cortex: Another person has already connected ${who(id.account)} with their token. Each Claude account belongs to one person. Contact your company admin.` };
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
 * already went to → { id, key, have (a workspace chosen without a project, or null), workspaces, current }.
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
  return { id: id.key, key: set?.key || key, have, workspaces, current };
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

module.exports = { TOKEN_RE, NO_IDENTITY, who, asIdentity, connectWith, folder, choose, disconnect };
