#!/usr/bin/env node
// Adds, updates, or removes (with --remove) the Claude Recall Stop hook in ~/.claude/settings.json.
// A timestamped backup of settings.json is written next to it before any change.
// The hook runs scripts/hook.js, which marks the session and starts scripts/push.js to send the new lines
// (plus the logged-in account) to the server; if the server is down they wait in ~/.claude-recall/pending.
//   --managed   print the managed-settings block for other machines instead (the string-claude-recall plugin + server URL + enrollment token)
const fs = require('fs');
const path = require('path');
const os = require('os');

const HOOK_SCRIPT = path.resolve(__dirname, 'hook.js');
const COMMAND = `"${process.execPath}" "${HOOK_SCRIPT}"`;
const file = path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'settings.json');
const remove = process.argv.includes('--remove');

if (process.argv.includes('--managed')) {
  // other machines get the hook as a plugin (plugins/string-claude-recall) from a private marketplace repo:
  // paste this into Organization settings → Claude Code → Managed settings (or managed-settings.json)
  const repo = process.env.CLAUDE_RECALL_REPO || 'Sarv/String-Claude-Recall';
  console.log(JSON.stringify({
    extraKnownMarketplaces: { 'string-tools': { source: { source: 'github', repo }, autoUpdate: true } },
    enabledPlugins: { 'string-claude-recall@string-tools': true },
    env: { CLAUDE_RECALL_URL: process.env.CLAUDE_RECALL_URL || 'https://recall.example.com', CLAUDE_RECALL_ENROLL_TOKEN: process.env.CLAUDE_RECALL_ENROLL_TOKEN || '<the token after "org:" in ENROLL_TOKENS>' },
  }, null, 2));
  console.error('\nCLAUDE_RECALL_REPO=<org>/<repo> sets the marketplace repo (every user needs read access to it). Each machine needs node on PATH.');
  process.exit(0);
}

const settings = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
settings.hooks = settings.hooks || {};
const stop = (settings.hooks.Stop = settings.hooks.Stop || []);
// ours = the current node hook, or the older curl-to-/api/hook version
const isOurs = (h) =>
  h.type === 'command' && typeof h.command === 'string' &&
  (h.command.includes(HOOK_SCRIPT) || (h.command.includes('127.0.0.1:') && h.command.includes('/api/hook')));
const ours = stop.flatMap((g) => (g.hooks || []).filter(isOurs));

if (!remove && ours.length === 1 && ours[0].command === COMMAND) {
  console.log('Hook already installed and up to date in', file);
  process.exit(0);
}
if (remove && !ours.length) {
  console.log('Hook not installed; nothing to change.');
  process.exit(0);
}

if (fs.existsSync(file)) {
  const backup = `${file}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  fs.copyFileSync(file, backup);
  console.log('Backup written:', backup);
}

for (const g of stop) g.hooks = (g.hooks || []).filter((h) => !isOurs(h));
settings.hooks.Stop = stop.filter((g) => (g.hooks || []).length);
if (!remove) settings.hooks.Stop.push({ hooks: [{ type: 'command', command: COMMAND, timeout: 5 }] });
if (!settings.hooks.Stop.length) delete settings.hooks.Stop;
if (!Object.keys(settings.hooks).length) delete settings.hooks;

fs.writeFileSync(file, JSON.stringify(settings, null, 2) + '\n');
console.log(remove ? 'Hook removed from' : ours.length ? 'Hook updated in' : 'Hook installed in', file);
