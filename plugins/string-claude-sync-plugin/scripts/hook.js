#!/usr/bin/env node
// Claude Code Stop hook (beta build): only on a laptop with the beta file (scripts/flag.js) it runs next/'s hook,
// which marks the session and starts the pusher. legacy/ never runs here. Never blocks or fails Claude Code.
const path = require('path');
const { spawnSync } = require('child_process');
const flag = require('./flag');

const f = flag.read();
if (!f) process.exit(0);
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (input += c));
process.stdin.on('end', () => {
  try { spawnSync(process.execPath, [path.join(__dirname, '..', 'next', 'scripts', 'hook.js')], { input, env: flag.nextEnv(f), stdio: ['pipe', 'ignore', 'ignore'], timeout: 2000 }); } catch {}
  process.exit(0);
});
