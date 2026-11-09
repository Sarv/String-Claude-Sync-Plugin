#!/usr/bin/env node
// Claude Code Stop hook for String Cortex.
// Marks the session as having new lines (~/.string-claude-sync/pending/<session>.json, with the account Claude Code is
// logged in with right now) and starts scripts/push.js detached, which sends the lines to the server.
// Never blocks or fails Claude Code: no network here, always exits 0. If the server is down the marker stays and the
// next hook (of any session) sends it.
const path = require('path');
const { spawn } = require('child_process');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (input += c));
process.stdin.on('end', () => {
  try {
    const { mark, account } = require('./push');
    const p = JSON.parse(input || '{}');
    mark({ session_id: p.session_id, transcript_path: p.transcript_path, cwd: p.cwd || null, account: account(), hook: true });
    spawn(process.execPath, [path.join(__dirname, 'push.js')], { detached: true, stdio: 'ignore', env: process.env }).unref();
  } catch {}
  process.exit(0);
});
