#!/usr/bin/env node
// The plugin's tools for Claude: a small MCP server over stdio (newline-delimited JSON-RPC; no dependencies).
// next/'s tools (settings from the optional file, scripts/flag.js):
//   connect_cortex        an organisation on its member list: this laptop asks (again, after a refusal) and waits for
//                         an approval. Otherwise opens a form (MCP elicitation) for the person's Claude Code token; the
//                         token goes from the form to this process, is traded with the server and kept on the laptop.
//                         Claude only sees "connected as …". An app without forms (or one that didn't show it before,
//                         remembered per app): tells Claude to have the person send it as a message.
//   cortex_status         connected or not (not: where the member-list request stands), a folder's workspace and
//                         project, the person's workspaces and their projects
//   set_cortex_folder     saves a folder's workspace and project (after Claude asked the person with its options question)
//   disconnect_cortex     forgets this laptop's token for the Claude account logged in (`/cortex disconnect`)
// The plugin's /cortex command (../commands/cortex.md) uses them.
const readline = require('readline');
const flag = require('./flag');

flag.useNext(flag.read());
const next = { push: require('../next/scripts/push'), cortex: require('../next/scripts/cortex') };
const VERSION = require('../.claude-plugin/plugin.json').version;

const send = (msg) => process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', ...msg })}\n`);
let clientCaps = {};
let clientName = ''; // the app (its name and version, from initialize): one that didn't show the form is remembered
let seq = 0;
const waiting = new Map(); // our requests to Claude Code (the form) → their answer
function request(method, params, timeoutMs = 10 * 60_000) {
  const id = `cortex-${++seq}`;
  send({ id, method, params });
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => { waiting.delete(id); reject(new Error('timeout')); }, timeoutMs);
    waiting.set(id, (m) => { clearTimeout(t); waiting.delete(id); m.error ? reject(new Error(m.error.message || 'error')) : resolve(m.result); });
  });
}

const TOOLS = [
  {
    name: 'connect_cortex',
    description: 'Connect Claude Code to String Cortex, where the organisation stores Claude Code conversations. Open a form for the person’s Claude Code token. The token goes to the plugin, never to Claude. Use when not connected or when asked to connect again. Never request the token in chat.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'cortex_status',
    description: 'String Cortex for this laptop: whether it is connected for the Claude account logged in, the workspace and project a folder’s conversations go to, and the person’s workspaces with their projects. Use when the person asks about String Cortex here, or wants to see or change a folder’s project; for a change, ask them with AskUserQuestion (workspace, then project) and call set_cortex_folder.',
    inputSchema: { type: 'object', properties: { folder: { type: 'string', description: 'Absolute path; default: the folder Claude Code runs in' } }, additionalProperties: false },
  },
  {
    name: 'set_cortex_folder',
    description: 'Save the String Cortex workspace and project the person selected for a folder and its subfolders.',
    inputSchema: {
      type: 'object',
      properties: {
        folder: { type: 'string', description: 'The folder as String Cortex named it (absolute path)' },
        workspace: { type: 'string', description: 'The chosen workspace’s id (or its exact name)' },
        project: { type: 'string', description: 'The chosen project’s id (or its exact name), one of that workspace' },
      },
      required: ['folder', 'workspace', 'project'],
      additionalProperties: false,
    },
  },
  {
    name: 'disconnect_cortex',
    description: 'Disconnect String Cortex on this laptop for the Claude account logged in: forget its token here. Only when the person asks for it (e.g. /cortex disconnect); confirm with them first. Their conversations stop going to String Cortex until they connect again.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
];

const text = (t, isError = false) => ({ content: [{ type: 'text', text: t }], ...(isError ? { isError: true } : {}) });
const here = () => process.env.CLAUDE_PROJECT_DIR || process.cwd();
const SERVER = process.env.STRING_CLAUDE_SYNC_URL || require('../next/defaults.json').url;
const PASTE = `Ask the person to open String Cortex (${SERVER}) → avatar → Claude Code token → Generate, then send the token in a separate message. The plugin will receive it before Claude does.`;
// apps that answered the form at once without showing it (the Claude desktop app's Code tab, 2026-11-09): asked
// straight away for a message next time (CORTEX-125), per app name and version, so an app that learns forms is tried again
const NO_FORMS = () => require('path').join(next.push.DIR, 'no-forms.json');
const formsOff = () => !!next.push.readJson(NO_FORMS(), {})[clientName];
const noteFormsOff = () => { try { const m = next.push.readJson(NO_FORMS(), {}); m[clientName] = new Date().toISOString(); next.push.writeJson(NO_FORMS(), m); } catch {} };
const ago = (iso) => { const m = Math.round((Date.now() - Date.parse(iso)) / 60000); return !iso ? '' : m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };
/** Not connected: what the member list says (cortex_status, CORTEX-125). */
function notConnected(id) {
  const st = next.cortex.claimState();
  const who = next.cortex.who(id.account);
  const how = !st ? 'Not asked yet: the next message asks how this laptop connects.'
    : st.mode === 'token' ? `The organisation connects with each person’s own token (checked ${ago(st.asked_at)}).`
      : st.status === 'refused' ? `This laptop’s request from the member list ${st.why === 'failed' || st.why === 'delivered' ? 'was approved, but its connection could not be completed' : 'was refused'}. /cortex connect asks again.`
        : `Asked to connect from the organisation’s member list ${ago(st.asked_at)}; waiting for an approval (the person: String Cortex → avatar → Claude Code token → This is me; an admin: Manage → Laptops). Last checked ${ago(st.checked_at) || 'not yet'}.`;
  return `Connected: no, for ${who}\nMember list: ${how}\nTo connect with your own token: /cortex connect.`;
}

async function call(name, args = {}) {
  const { push, cortex } = next;
  const id = push.current();
  if (name === 'connect_cortex') {
    if (!id) return text(cortex.NO_IDENTITY);
    // the organisation connects from its member list: this laptop asks (again, when refused) instead of a form
    if (!push.readToken(push.config(), id.key)) {
      const refused = cortex.claimState()?.status === 'refused';
      const lc = await cortex.listConnect({ again: refused });
      if (lc?.connected) return text(lc.text);
      if (lc?.mode === 'unknown') return text(`String Cortex: couldn’t reach ${SERVER} to connect this laptop (${lc.error}). Try again shortly; it also tries with each message.`, true);
      if (lc?.mode === 'list' && lc.status === 'pending') {
        return text(`String Cortex: this laptop ${refused ? 'asked again' : 'has asked'} to connect ${cortex.who(id.account)} from the organisation’s member list and waits for an approval: the person approves it in String Cortex (${SERVER}/app/ → avatar → Claude Code token → "This is me"), or an organisation admin does (Manage → Laptops). It connects by itself with a later message. To use their own token instead: ${PASTE}`);
      }
    }
    if (!clientCaps.elicitation) return text(`This app cannot open the token form. ${PASTE}`);
    if (formsOff()) return text(`This app doesn’t show the token form. ${PASTE}`);
    let r;
    const t0 = Date.now();
    try {
      r = await request('elicitation/create', {
        message: `Connect String Cortex for ${cortex.who(id.account)}. In String Cortex, open your avatar → Claude Code token → Generate. Paste the token below. It stays on this laptop and is not sent to Claude.`,
        requestedSchema: { type: 'object', properties: { token: { type: 'string', title: 'Claude Code token', description: 'Starts with sct_' } }, required: ['token'] },
      });
    } catch { return text(`The token form could not open. ${PASTE}`); }
    // Some apps say they have forms but answer at once without showing one (Claude desktop app's Code tab, 2026-11-09):
    // an answer within 3 s is no person closing a form, so give the other way in.
    if (r?.action !== 'accept' && Date.now() - t0 < 3000) { noteFormsOff(); return text(`This app did not show the token form. ${PASTE}`); }
    if (r?.action !== 'accept') return text('The form was closed, so String Cortex is still not connected. Continue with the person’s message.');
    const c = await cortex.connectWith(r.content?.token);
    return text(c.text, !c.ok);
  }
  if (!id) return text(cortex.NO_IDENTITY, true);
  if (name === 'cortex_status' && !push.readToken(push.config(), id.key)) return text(notConnected(id));
  if (name !== 'disconnect_cortex' && !push.readToken(push.config(), id.key)) return text(`String Cortex is not connected for ${cortex.who(id.account)}. Call connect_cortex first.`, true);
  if (name === 'disconnect_cortex') {
    const d = cortex.disconnect();
    return text(d?.had ? `String Cortex: Disconnected for ${cortex.who(d.account)} on this laptop. New conversations wait here until you connect again (/cortex connect). To end the token everywhere, revoke it in String Cortex → avatar → Claude Code token.` : `String Cortex was not connected for ${cortex.who(id.account)} on this laptop.`);
  }
  if (name === 'cortex_status') {
    const dir = args.folder || here();
    let fo;
    try { fo = await cortex.folder(dir); } catch { return text('String Cortex is currently unreachable.', true); }
    const own = push.readToken(push.config(), id.key);
    const list = (fo.workspaces?.length ? fo.workspaces : own?.workspaces || [])
      .map((w) => `- ${w.name} (id ${w.id}): ${(w.projects || []).length ? w.projects.map((p) => `${p.name} (id ${p.id})`).join(', ') : 'no projects yet'}`).join('\n') || '(none)';
    const now = fo.chosen ? `${fo.chosen.workspace.name} / ${fo.chosen.project.name}`
      : fo.have ? `${fo.have.name} / not selected` : fo.current ? `not selected (${fo.current.name} from earlier conversations)` : 'not selected';
    return text(`Connected: yes, as ${own?.name || '?'} at ${own?.company || '?'}, for ${cortex.who(id.account)}\nFolder: ${fo.key}\nWorkspace / project: ${now}\nAvailable workspaces and projects:\n${list}`);
  }
  if (name === 'set_cortex_folder') {
    if (!args.folder || !require('path').isAbsolute(args.folder)) return text('Enter the full folder path, starting from the root (an absolute path).', true);
    const r = cortex.choose(push.folderKey(args.folder), args.workspace, args.project);
    if (r.error === 'workspace') return text('That workspace is not available to this person. Call cortex_status to get the current list.', true);
    if (r.error === 'project') return text(`That project is not in the workspace ${r.workspace.name}. Call cortex_status to get the current list.`, true);
    return text(`Saved: ${push.folderKey(args.folder)} and its subfolders will use ${r.project.name} (${r.workspace.name} workspace). Waiting conversation lines will be sent with your next reply.`);
  }
  return text(`Unknown tool ${name}`, true);
}

async function handle(m) {
  if (m.id !== undefined && !m.method) { waiting.get(m.id)?.(m); return; } // an answer to our request
  if (m.method === 'initialize') {
    clientCaps = m.params?.capabilities || {};
    clientName = `${m.params?.clientInfo?.name || '?'} ${m.params?.clientInfo?.version || ''}`.trim();
    return send({ id: m.id, result: { protocolVersion: m.params?.protocolVersion || '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'string-cortex', version: VERSION } } });
  }
  if (m.id === undefined) return; // notifications (initialized, cancelled, …)
  if (m.method === 'ping') return send({ id: m.id, result: {} });
  if (m.method === 'tools/list') return send({ id: m.id, result: { tools: TOOLS } });
  if (m.method === 'tools/call') {
    if (!TOOLS.some((t) => t.name === m.params?.name)) return send({ id: m.id, error: { code: -32602, message: `Unknown tool ${m.params?.name}` } });
    let result;
    try { result = await call(m.params.name, m.params.arguments || {}); } catch (e) { result = text(`String Cortex: ${e.message}`, true); }
    return send({ id: m.id, result });
  }
  return send({ id: m.id, error: { code: -32601, message: `Method not found: ${m.method}` } });
}

readline.createInterface({ input: process.stdin }).on('line', (line) => {
  if (!line.trim()) return;
  let m;
  try { m = JSON.parse(line); } catch { return send({ id: null, error: { code: -32700, message: 'Parse error' } }); }
  handle(m).catch(() => {});
});
