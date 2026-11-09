#!/usr/bin/env node
// Claude Code UserPromptSubmit hook (beta build): without the beta file
// (scripts/flag.js) it does nothing. With it, next/'s prompt hook answers for this prompt.
const path = require('path');
const { spawnSync } = require('child_process');
const flag = require('./flag');

const f = flag.read();
if (!f) process.exit(0);
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (input += c));
process.stdin.on('end', () => {
  try {
    const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'next', 'scripts', 'prompt.js')], { input, env: flag.nextEnv(f), encoding: 'utf8', timeout: 14000 });
    if (r.stdout) process.stdout.write(r.stdout);
  } catch {}
  process.exit(0);
});
