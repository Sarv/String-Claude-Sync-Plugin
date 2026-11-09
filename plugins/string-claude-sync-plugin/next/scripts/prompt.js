#!/usr/bin/env node
// Claude Code UserPromptSubmit hook for String Cortex (docs/plugin.md in the server repo).
// Started by ../../scripts/prompt.js on a laptop with the flag file (../../scripts/flag.js).
//
//   0. The turn register: a mark with the transcript's size and the identity logged in now (push.js `note`), first,
//      whatever else happens (lines are tied to an identity only between its own marks).
//   1. A token sent as a message: taken, traded with the server for the identity logged in now (so the one in the
//      message stops working at once), kept in that identity's folder, and the message is stopped: it never goes to
//      Claude. The only message this hook ever stops.
//   2. No token yet for the identity logged in now (a new laptop, a second company's account, …): the prompt goes on,
//      and Claude is told to open the plugin's form for the token first (connect_cortex: the token goes from the form
//      to the plugin, never to Claude). Once per session per identity; the form not shown (an app without forms):
//      Claude tells the person to send the token as a message (1). Its lines wait on the laptop until then.
//   3. A folder (by its path; a subfolder goes with the nearest folder above it that has one) with no project yet: the
//      server lists the person's workspaces in the company their Claude organisation is linked to, each with its
//      projects, and the workspace their conversations of this folder already went to. Claude is told to ask with its
//      options question, the workspace first and then one of its projects, and save both (set_cortex_folder). A
//      workspace with one project takes it by itself; one with none: the person (or an admin) makes one in String
//      Cortex. Asked on every prompt there until chosen; its lines wait on the laptop till then. Once chosen, never
//      asked again in that folder (`/cortex project` changes it).
//
// The company gate (STRING_CLAUDE_SYNC_REQUIRED=1, from the company's managed settings): the same steps, on every
// prompt, and Claude is told not to work on the person's request until String Cortex is connected and the folder has
// its project; only to help with that. The message still reaches Claude (a blocked prompt could leave the person
// stuck with no one to ask).
//
// Never slows Claude Code down for long: network calls time out in 5 s, and when the server can't be reached the
// prompt goes on (lines wait on the laptop until the folder has a project).
const path = require('path');
const push = require('./push');
const cortex = require('./cortex');

const NUDGED = path.join(push.DIR, 'nudged.json');
// the plugin's tools for Claude, by the name Claude Code loaded the plugin under (a test copy has its own name: a copy
// of the managed plugin's name is ignored)
const pluginName = () => {
  try { return require(path.join(process.env.CLAUDE_PLUGIN_ROOT || path.join(__dirname, '..', '..'), '.claude-plugin', 'plugin.json')).name; } catch { return 'string-claude-sync-plugin'; }
};
const TOOLS = `mcp__plugin_${pluginName()}_cortex__`;

const done = (obj) => { if (obj) process.stdout.write(JSON.stringify(obj)); process.exit(0); };
const block = (reason) => done({ decision: 'block', reason });
const note = (msg) => done({ systemMessage: msg });
const tell = (context, msg) => done({ ...(msg ? { systemMessage: msg } : {}), hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: context } });

async function main(input) {
  if ((process.env.STRING_CLAUDE_SYNC_ASK || '').toLowerCase() === 'off') return done();
  const cfg = push.config();
  const prompt = String(input.prompt || '');
  const cwd = input.cwd || process.cwd();

  // 0. the turn register (before anything can stop here)
  const id = push.note('start', { session_id: input.session_id, transcript_path: input.transcript_path, cwd });

  // 1. a token sent as a message
  if (cortex.TOKEN_RE.test(prompt)) {
    const r = await cortex.connectWith(prompt);
    return block(`${r.text} ${r.ok ? 'Your message was not sent to Claude. Please send it again.' : 'Your message was not sent to Claude.'}`);
  }

  if (!id) return done(); // no Claude account of an organisation (logged out, an API key): its lines are not sent
  const required = (process.env.STRING_CLAUDE_SYNC_REQUIRED || '') === '1';
  const hold = 'The person’s company makes String Cortex compulsory: until this is done, do not work on their request. '
    + 'Help them only with this (answer their questions about it, take what it needs), then ask them to send their request again.';

  // 2. no token yet for this identity: the form (once per session; with the gate, every prompt)
  if (!push.readToken(cfg, id.key)) {
    if (!required) {
      const seen = push.readJson(NUDGED, {});
      const k = `${input.session_id}:${id.key}`;
      if (input.session_id && seen[k]) return done();
      if (input.session_id) {
        seen[k] = new Date().toISOString();
        require('fs').mkdirSync(push.DIR, { recursive: true, mode: 0o700 }); // (a laptop's first prompt: not there yet)
        push.writeJson(NUDGED, Object.fromEntries(Object.entries(seen).sort((a, b) => (a[1] < b[1] ? 1 : -1)).slice(0, 50)));
      }
    }
    return tell(
      `String Cortex is not connected for ${cortex.who(id.account)}. Before replying, call ${TOOLS}connect_cortex to open a token form. `
      + 'The token goes directly to the plugin, not to you. Never ask for it in chat. Briefly explain the result. '
      + (required ? hold : 'Then answer the person’s message. If they close the form, answer their message anyway.'),
      `String Cortex: ${cortex.who(id.account)} is not connected yet. A form will open to enter your Claude Code token.`,
    );
  }

  // 3. the folder's workspace and project
  let f;
  try { f = await cortex.folder(cwd); } catch { return done(); } // can't reach it: ask later
  if (!f || f.chosen || !f.workspaces?.length) return done(); // chosen; or in no workspace: conversations are saved without one
  const ws = f.current; // the one already chosen for this folder, or where its conversations went, or the only one
  if (ws && ws.projects.length === 1) {
    cortex.choose(f.key, ws.id, ws.projects[0].id);
    return note(`String Cortex: Conversations in ${f.key} will use the ${ws.projects[0].name} project (${ws.name} workspace). To change it, type /cortex project.`);
  }
  if (ws && !f.have) cortex.choose(f.key, ws.id, null); // remember the workspace; the project is asked below
  const folderName = path.basename(f.key) || f.key;
  const make = `Only the projects they are a member of are offered. The workspace's owners and admins create projects and add their members in String Cortex (${cfg.url}/app/ → All projects): ask them to be added to the right one, then type /cortex project here.`;
  const then = `Then call ${TOOLS}set_cortex_folder with folder "${f.key}", the workspace id and the project id. `
    + (required ? hold : 'Then go on with their message. If they skip, go on with it (the conversation waits on this laptop until a project is chosen).');
  const opts = (list) => list.map((x) => `"${x.name}" (id ${x.id})`).join(', ');
  const four = (n) => (n > 4 ? ' If there are more than 4, show 4 and let the person enter another name under Other.' : '');
  if (ws) {
    if (!ws.projects.length) {
      return tell(
        `String Cortex: the folder ${f.key} is in the workspace "${ws.name}", which has no project yet, so its conversations wait on this laptop. `
        + `Tell the person in two lines: ${make} ${required ? hold : 'Then go on with their message.'}`,
      );
    }
    return tell(
      `String Cortex has no project selected for ${f.key} (workspace "${ws.name}"). Conversations are stored locally until one is selected. `
      + `Before replying, use AskUserQuestion: question "Which project is ${folderName} for?", header "Project", with each project name as an option: ${opts(ws.projects)}.${four(ws.projects.length)} `
      + `${then} Do not show ids to the person.`,
    );
  }
  const lists = f.workspaces.map((w) => `"${w.name}" (id ${w.id}): ${w.projects.length ? opts(w.projects) : 'no projects yet'}`).join('; ');
  return tell(
    `String Cortex has no workspace and project selected for ${f.key}. Conversations are stored locally until they are selected. `
    + `Before replying, use AskUserQuestion twice. First: question "Which String Cortex workspace is ${folderName} for?", header "Workspace", `
    + `one option per workspace: ${f.workspaces.map((w) => `"${w.name}"`).join(', ')}.${four(f.workspaces.length)} `
    + `Then: question "Which project is ${folderName} for?", header "Project", one option per project of the chosen workspace. `
    + `Workspaces and their projects: ${lists}. If the chosen workspace has no project yet, tell the person: ${make} `
    + `${then} Do not show ids to the person.`,
  );
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  let input = {};
  try { input = JSON.parse(raw || '{}'); } catch {}
  main(input).catch(() => done()); // never break Claude Code
});
