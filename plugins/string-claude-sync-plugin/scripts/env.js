// The environment next/ runs with (BETA BUILD, published to the plugin repo's `beta` branch; docs/plugin-beta.md in the
// server repo). Since 1.9.0-beta.11 (CORTEX-143) there is no beta file at all: the server comes from the managed
// STRING_CLAUDE_SYNC_URL (else next/defaults.json), compulsory mode from STRING_CLAUDE_SYNC_REQUIRED, and next/'s
// folder is ~/.string-claude-sync-next (STRING_CLAUDE_SYNC_DIR overrides it, for tests). legacy/ never runs here.
const os = require('os');
const path = require('path');

/** next/'s environment: its own folder; nothing of legacy/'s. */
function nextEnv(base = process.env) {
  const e = { ...base, STRING_CLAUDE_SYNC_DIR: base.STRING_CLAUDE_SYNC_DIR || path.join(os.homedir(), '.string-claude-sync-next') };
  delete e.CLAUDE_RECALL_DIR;
  delete e.STRING_CLAUDE_SYNC_ENROLL_TOKEN; // legacy's; next/ signs in with the person's own token
  delete e.CLAUDE_RECALL_ENROLL_TOKEN;
  return e;
}

/** For code that runs next/ inside this process (the MCP server): sets process.env before next/ is loaded. */
function useNext() {
  const e = nextEnv();
  for (const k of Object.keys(process.env)) if (!(k in e)) delete process.env[k];
  Object.assign(process.env, e);
}

module.exports = { nextEnv, useNext };
