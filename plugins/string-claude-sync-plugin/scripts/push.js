#!/usr/bin/env node
// The pusher by hand (node scripts/push.js [--all|--status]), beta build: next/'s. The Stop hook starts it by itself; this is for people and docs.
const path = require('path');
const { spawnSync } = require('child_process');
const { nextEnv } = require('./env');

const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'next', 'scripts', 'push.js'), ...process.argv.slice(2)], { env: nextEnv(), stdio: 'inherit' });
process.exit(r.status || 0);
