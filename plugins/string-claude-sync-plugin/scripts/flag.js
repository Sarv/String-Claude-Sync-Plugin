// BETA BUILD (published to the plugin repo's `beta` branch; docs/plugin-beta.md in the server repo).
//
// Since 1.9.0-beta.9 (2026-11-13, CORTEX-129) the plugin runs on every laptop that has it: next/ (the person's own
// token or the organisation's member list, workspace and project per folder, /cortex). legacy/ (1.5.3) never runs in
// the beta build. hooks.json only checks in the shell that `node` is there (no Node.js: the hooks exit 0 and print
// nothing).
//
// The old beta file is now an optional settings file for one laptop (testing, another server):
//   ~/Downloads/cortex-beta-plugin.txt        (STRING_CLAUDE_SYNC_BETA_FILE overrides the path, for tests)
// It may be missing or empty. If it holds JSON, it can set:
//   "url": "https://dev.cortex.stringhub.com"   the String Cortex server (beats the managed STRING_CLAUDE_SYNC_URL)
//   "required": true                            compulsory mode on this laptop (as STRING_CLAUDE_SYNC_REQUIRED=1)
//   "dir": "…"                                  next/'s own folder (default ~/.string-claude-sync-next, the same as
//                                               during the beta with the file, so a connected laptop stays connected)
const fs = require('fs');
const os = require('os');
const path = require('path');

const FILE = process.env.STRING_CLAUDE_SYNC_BETA_FILE || path.join(os.homedir(), 'Downloads', 'cortex-beta-plugin.txt');

/** The laptop's settings from the optional file: {} when it is missing, empty or not JSON. */
function read() {
  let text;
  try { text = fs.readFileSync(FILE, 'utf8'); } catch { return {}; }
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
