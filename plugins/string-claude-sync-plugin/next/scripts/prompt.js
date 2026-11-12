#!/usr/bin/env node
// Claude Code UserPromptSubmit hook for String Cortex (docs/plugin.md in the server repo).
// Started by ../../scripts/prompt.js on a laptop with the flag file (../../scripts/flag.js).
//
//   0. The turn register: a mark with the transcript's size and the identity logged in now (push.js `note`), first,
//      whatever else happens (lines are tied to an identity only between its own marks).
//   1. A token sent as a message: taken, traded with the server for the identity logged in now (so the one in the
//      message stops working at once), kept in that identity's folder, and the message is stopped: it never goes to
//      Claude (Claude Code shows it as "blocked"; the text says it went well). A token inside any other message stops
//      that message too. These are the only messages this hook ever stops. Claude in a session that was told
//      "not connected" (2) is told on its next prompt that it now is (2b), since it never saw the token message.
//   2. No token yet for the identity logged in now (a new laptop, a second company's account, …): the prompt goes on.
//      2a. The organisation connects people from its member list (cortex.listConnect): this laptop asks, then waits for
//      an approval and connects by itself; Claude is told so once per session. A refused request: told once, and
//      /cortex connect asks again. Couldn't ask (no answer, a timeout, a server error): told once that String Cortex
//      couldn't be reached, asked again next prompt; never taken for "own token" (CORTEX-125).
//      Otherwise (own token), Claude is told to open the plugin's form for the token first (connect_cortex: the token goes from the form
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
//   4. The company's setting in String Cortex (Company → Setup → Folder filing, server filing.js), from /api/plugin/folder:
//      `default`: a folder with no project takes the company's default workspace and project by itself (a line says
//      so; /cortex project changes it); `required`: choosing is compulsory, as with the gate below (for the folder step).
//
// The company gate (STRING_CLAUDE_SYNC_REQUIRED=1, from the company's managed settings): the same steps, on every
// prompt, and Claude is told not to work on the person's request until String Cortex is connected and the folder has
// its project; only to help with that. The message still reaches Claude (a blocked prompt could leave the person
// stuck with no one to ask).
//
// Never slows Claude Code down for long: network calls time out in 5 s (8 s for the member-list ask), and when the server can't be reached the
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

// a note for Claude that goes with whatever this prompt answers (not with a blocked prompt, which Claude never sees)
let carry = '';
let carryMsg = ''; // a line for the person that goes with whatever this prompt answers (connected from the member list)
const done = (obj) => {
  if (carry && !(obj && obj.decision === 'block')) {
    obj = obj || {};
    const h = obj.hookSpecificOutput || { hookEventName: 'UserPromptSubmit' };
    h.additionalContext = h.additionalContext ? `${carry} ${h.additionalContext}` : carry;
    obj.hookSpecificOutput = h;
  }
  if (carryMsg && !(obj && obj.decision === 'block')) {
    obj = obj || {};
    obj.systemMessage = obj.systemMessage ? `${carryMsg}\n${obj.systemMessage}` : carryMsg;
  }
  if (obj) process.stdout.write(JSON.stringify(obj));
  process.exit(0);
};
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

  // 1. a token sent as a message (alone, or "/cortex connect <token>"; whatever the app put around it taken off);
  // a token inside a longer message is held back too, so a token never reaches Claude
  const tk = cortex.tokenIn(prompt);
  if (tk?.token) {
    // Claude Code shows any stopped prompt as "blocked"; stopping it is the only way to keep the token from Claude,
    // so the text says plainly what happened
    const r = await cortex.connectWith(tk.token);
    return block(r.ok
      ? `✓ ${r.text} All set, nothing went wrong: Claude Code shows this as a blocked prompt only because your token was kept away from Claude. Carry on with your next message.`
      : `${r.text} (This message was kept away from Claude, so your token stays private.)`);
  }
  if (tk?.stray) {
    return block('String Cortex: Your message contains a Claude Code token, so it was not sent to Claude. To connect, send the token on its own (or /cortex connect followed by the token); for anything else, send your message without it.');
  }

  if (!id) return done(); // no Claude account of an organisation (logged out, an API key): its lines are not sent
  const required = (process.env.STRING_CLAUDE_SYNC_REQUIRED || '') === '1';
  const hold = 'The person’s organisation makes String Cortex compulsory: until this is done, do not work on their request. '
    + 'Help them only with this (answer their questions about it, take what it needs), then ask them to send their request again.';

  // 2. no token yet for this identity: the form (once per session; with the gate, every prompt). The session is noted
  // (nudged.json), so that once the token is there, Claude in that session is told so (2b).
  const nk = `${input.session_id}:${id.key}`;
  // 2a. the company connects people from its member list (server connect-requests.js): this laptop asks once, then
  // each prompt checks whether the person or an admin approved it; approved → connected here, no token to paste
  let viaList = null;
  if (!push.readToken(cfg, id.key)) viaList = await cortex.listConnect().catch(() => null);
  if (viaList?.connected) {
    carry = `String Cortex is now connected for ${cortex.who(id.account)}: the person’s organisation connected this laptop from its member list after an approval (no token was needed). `
      + 'What this conversation said earlier about String Cortex not being connected, or about a token, no longer applies. '
      + 'If the person asks what String Cortex is: their organisation’s place where their Claude Code conversations are saved and searchable, under their own name; they see their own there. '
      + 'Answer the person’s message.';
    carryMsg = `✓ ${viaList.text}`; // a line for the person, with whatever the folder step below answers
    const seenC = push.readJson(NUDGED, {});
    if (seenC[nk]) { delete seenC[nk]; push.writeJson(NUDGED, seenC); }
  }
  // once per session per identity (with the gate: every prompt), and noted so that 2b tells Claude once it connects
  const once = (kind) => {
    const seen = push.readJson(NUDGED, {});
    if (!required && input.session_id && seen[nk] === kind) return false;
    if (input.session_id) {
      delete seen[nk]; // (newest last: the file keeps the latest 50)
      seen[nk] = kind;
      require('fs').mkdirSync(push.DIR, { recursive: true, mode: 0o700 });
      push.writeJson(NUDGED, Object.fromEntries(Object.entries(seen).slice(-50)));
    }
    return true;
  };
  // couldn't ask (no answer, a timeout, a server error): never taken for "own token" (CORTEX-125); asked again on the
  // next prompt
  if (!push.readToken(cfg, id.key) && viaList?.mode === 'unknown') {
    if (!once('unknown')) return done();
    return tell(
      `String Cortex is not connected yet for ${cortex.who(id.account)}, and the plugin couldn't reach String Cortex (${cfg.url}) to ask how this laptop connects (${viaList.error}). `
      + 'It asks again with the person’s next message by itself. Tell the person this in one short line, and that /cortex status shows where it stands. Do not ask for a token in chat. '
      + (required ? hold : 'Then answer the person’s message.'),
      `String Cortex: couldn't reach ${cfg.url} to connect this laptop (${viaList.error}). It tries again with your next message.`,
    );
  }
  // refused by the person or an admin (or its token couldn't be taken): told once; /cortex connect asks again
  if (!push.readToken(cfg, id.key) && viaList?.mode === 'list' && viaList.status === 'refused') {
    if (!once('refused')) return done();
    const why = viaList.why === 'failed' || viaList.why === 'delivered' ? 'was approved, but its connection could not be completed' : 'was refused (by the person or an organisation admin)';
    return tell(
      `String Cortex is not connected for ${cortex.who(id.account)}: this laptop's request to connect from the organisation's member list ${why}. `
      + 'If that was a mistake, the person can ask again with /cortex connect (an admin approves it under String Cortex → Manage → Laptops), or connect with their own token: String Cortex → avatar → Claude Code token → Generate, then send the token on its own in a message. '
      + 'Tell the person this in two short lines. Do not ask for a token in chat. '
      + (required ? hold : 'Then answer the person’s message.'),
      `String Cortex: this laptop's request to connect ${why}. To ask again: /cortex connect.`,
    );
  }
  if (!push.readToken(cfg, id.key) && viaList?.mode === 'list' && viaList.status === 'pending') {
    if (!once('pending')) return done();
    return tell(
      `String Cortex is not connected yet for ${cortex.who(id.account)}. This laptop asked the person’s organisation to connect it from the organisation’s member list, and is waiting for an approval: `
      + `the person approves it in String Cortex (${cfg.url}/app/ → avatar → Claude Code token → "This is me"), or an organisation admin does (String Cortex → Manage → Laptops). `
      + 'Once approved it connects by itself on a later message; nothing is pasted. If the person is not on the organisation’s list, nothing will come: they connect with their own token instead (/cortex connect). '
      + 'Tell the person this in two short lines. Do not ask for a token in chat. '
      + (required ? hold : 'Then answer the person’s message.'),
      `String Cortex: this laptop asked to connect ${cortex.who(id.account)}. Approve it in String Cortex (avatar → Claude Code token → This is me), or ask your admin. Or connect with your own token: /cortex connect.`,
    );
  }
  if (!push.readToken(cfg, id.key)) {
    if (!once('token')) return done();
    return tell(
      `String Cortex is not connected for ${cortex.who(id.account)}. Before replying, call ${TOOLS}connect_cortex to open a token form. `
      + 'The token goes directly to the plugin, not to you. Never ask for it in chat. Briefly explain the result. '
      + (required ? hold : 'Then answer the person’s message. If they close the form, answer their message anyway.'),
      `String Cortex: ${cortex.who(id.account)} is not connected yet. A form will open to enter your Claude Code token; if none opens, send the token as a message on its own.`,
    );
  }

  // 2b. connected since Claude in this session was told it isn't (the token message itself was stopped, so Claude
  // never saw it): tell Claude once, with whatever this prompt answers below
  const seenNow = push.readJson(NUDGED, {});
  if (input.session_id && seenNow[nk]) {
    delete seenNow[nk];
    push.writeJson(NUDGED, seenNow);
    carry = `String Cortex is now connected for ${cortex.who(id.account)}: the person sent their token and the plugin took it (you never see it). `
      + 'What this conversation said earlier about String Cortex not being connected, or about sending a token, no longer applies: '
      + 'do not ask for a token or mention it again. Answer the person’s message.';
  }

  // 3. the folder's workspace and project
  let f;
  try { f = await cortex.folder(cwd); } catch { return done(); } // can't reach it: ask later
  if (!f || f.chosen || !f.workspaces?.length) return done(); // chosen; or in no workspace: conversations are saved without one
  // the company files folders without a choice into its default workspace and project (server filing.js): taken by itself
  const d = f.filing?.default;
  if (d?.workspace?.id && d?.project?.id && !cortex.choose(f.key, d.workspace.id, d.project.id).error) {
    return note(`String Cortex: Conversations in ${f.key} will use the ${d.project.name} project (${d.workspace.name} workspace), your organisation’s default. To change it, type /cortex project.`);
  }
  // the company makes choosing compulsory (its setting in String Cortex), as the managed STRING_CLAUDE_SYNC_REQUIRED does
  const requiredHere = required || f.filing?.required === true;
  const ws = f.current; // the one already chosen for this folder, or where its conversations went, or the only one
  if (ws && ws.projects.length === 1) {
    cortex.choose(f.key, ws.id, ws.projects[0].id);
    return note(`String Cortex: Conversations in ${f.key} will use the ${ws.projects[0].name} project (${ws.name} workspace). To change it, type /cortex project.`);
  }
  if (ws && !f.have) cortex.choose(f.key, ws.id, null); // remember the workspace; the project is asked below
  const folderName = path.basename(f.key) || f.key;
  const make = `Only the projects they are a member of are offered. The workspace's owners and admins create projects and add their members in String Cortex (${cfg.url}/app/ → All projects): ask them to be added to the right one, then type /cortex project here.`;
  const then = `Then call ${TOOLS}set_cortex_folder with folder "${f.key}", the workspace id and the project id. `
    + (requiredHere ? hold : 'Then go on with their message. If they skip, go on with it (the conversation waits on this laptop until a project is chosen).');
  const opts = (list) => list.map((x) => `"${x.name}" (id ${x.id})`).join(', ');
  const four = (n) => (n > 4 ? ' If there are more than 4, show 4 and let the person enter another name under Other.' : '');
  if (ws) {
    if (!ws.projects.length) {
      return tell(
        `String Cortex: the folder ${f.key} is in the workspace "${ws.name}", which has no project yet, so its conversations wait on this laptop. `
        + `Tell the person in two lines: ${make} ${requiredHere ? hold : 'Then go on with their message.'}`,
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
