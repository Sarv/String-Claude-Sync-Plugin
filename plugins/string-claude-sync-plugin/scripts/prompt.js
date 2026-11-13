#!/usr/bin/env node
// Claude Code UserPromptSubmit hook (beta build): next/'s prompt hook answers for this prompt.
const path = require('path');
const { spawnSync } = require('child_process');
const { nextEnv } = require('./env');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (input += c));
process.stdin.on('end', () => {
  try {
    const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'next', 'scripts', 'prompt.js')], { input, env: nextEnv(), encoding: 'utf8', timeout: 14000 });
    if (r.stdout) process.stdout.write(r.stdout);
  } catch {}
  process.exit(0);
});
