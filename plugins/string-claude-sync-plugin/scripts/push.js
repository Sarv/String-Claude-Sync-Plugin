#!/usr/bin/env node
// The pusher by hand (node scripts/push.js [--all|--status]), beta build: next/'s, only on a laptop with the beta
// file (scripts/flag.js). The Stop hook starts it by itself; this is for people and docs.
const path = require('path');
const { spawnSync } = require('child_process');
const flag = require('./flag');

const f = flag.read();
if (!f) { console.log(`String Cortex beta is off on this laptop (no ${flag.FILE}).`); process.exit(0); }
const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'next', 'scripts', 'push.js'), ...process.argv.slice(2)], { env: flag.nextEnv(f), stdio: 'inherit' });
process.exit(r.status || 0);
