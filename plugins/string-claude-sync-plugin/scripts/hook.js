#!/usr/bin/env node
// Claude Code Stop hook (beta build): runs next/'s hook, which marks the session and starts the pusher. legacy/ never runs here. Never blocks or fails Claude Code.
const path = require('path');
const { spawnSync } = require('child_process');
const { nextEnv } = require('./env');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (input += c));
process.stdin.on('end', () => {
  try { spawnSync(process.execPath, [path.join(__dirname, '..', 'next', 'scripts', 'hook.js')], { input, env: nextEnv(), stdio: ['pipe', 'ignore', 'ignore'], timeout: 2000 }); } catch {}
  process.exit(0);
});
