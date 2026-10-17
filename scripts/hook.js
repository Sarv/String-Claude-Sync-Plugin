#!/usr/bin/env node
// Stop hook for a single-machine install (node scripts/install-hook.js). The code lives in the plugin
// (plugins/string-claude-recall), which is how other machines get it.
require('../plugins/string-claude-recall/scripts/hook.js');
