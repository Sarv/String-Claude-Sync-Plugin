// BETA BUILD (branch plugin-beta, published to the plugin repo's `beta` branch; docs/plugin-beta.md in the server
// repo). Remove this gate when the new code is released to everyone.
//
// The plugin does something only on a laptop that has the beta file:
//   ~/Downloads/cortex-beta-plugin.txt        (STRING_CLAUDE_SYNC_BETA_FILE overrides the path, for tests)
// No file: no hook, no tool, no pusher; Claude Code works exactly as without the plugin (hooks.json checks the file
// in the shell before node even starts). With it: next/ (the person's own token, workspace and project per folder,
// /cortex). legacy/ (1.5.3) never runs in the beta build.
//
// The file may be empty. If it holds JSON, it can set:
//   "url": "https://dev.cortex.stringhub.com"   the String Cortex server (beats the managed STRING_CLAUDE_SYNC_URL)
//   "required": true                            compulsory mode on this laptop (as STRING_CLAUDE_SYNC_REQUIRED=1)
//   "dir": "…"                                  next/'s own folder (default ~/.string-claude-sync-next)
const fs = require('fs');
const os = require('os');
const path = require('path');

const FILE = process.env.STRING_CLAUDE_SYNC_BETA_FILE || path.join(os.homedir(), 'Downloads', 'cortex-beta-plugin.txt');

/** The beta settings ({} when the file is empty or not JSON), or null: no file, so the plugin stays off. */
function read() {
  let text;
  try { text = fs.readFileSync(FILE, 'utf8'); } catch { return null; }
  try {
    const f = JSON.parse(text);
    return f && typeof f === 'object' && !Array.isArray(f) ? f : {};
  } catch {
    return {};
  }
}

/** The environment next/ runs with: its own folder, and the file's server. */
function nextEnv(flag, base = process.env) {
  const e = { ...base, STRING_CLAUDE_SYNC_DIR: flag.dir || path.join(os.homedir(), '.string-claude-sync-next') };
  delete e.CLAUDE_RECALL_DIR;
  if (flag.url) { e.STRING_CLAUDE_SYNC_URL = String(flag.url); delete e.CLAUDE_RECALL_URL; }
  if (flag.required === true) e.STRING_CLAUDE_SYNC_REQUIRED = '1';
  delete e.STRING_CLAUDE_SYNC_ENROLL_TOKEN; // legacy's; next/ signs in with the person's own token
  delete e.CLAUDE_RECALL_ENROLL_TOKEN;
  return e;
}

/** For code that runs next/ inside this process (the MCP server): sets process.env before next/ is loaded. */
function useNext(flag) {
  const e = nextEnv(flag);
  for (const k of Object.keys(process.env)) if (!(k in e)) delete process.env[k];
  Object.assign(process.env, e);
}

module.exports = { FILE, read, nextEnv, useNext };
