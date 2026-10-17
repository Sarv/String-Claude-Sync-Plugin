# String Claude Sync plugin

The Claude Code plugin for **String Claude Sync**. After every Claude reply its Stop hook sends the new lines of the session's transcript to your String Claude Sync server, together with the Claude account that is logged in. Claude Code is never slowed down: the hook exits in milliseconds and a background process does the sending.

This repo holds only the plugin. It is published from the server repo (private) with `scripts/publish-plugin.sh`; change it there.

## Install for everyone (managed settings)

Paste into claude.ai → Organization settings → Claude Code → Managed settings (Teams / Enterprise), or into `managed-settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "string-tools": { "source": { "source": "github", "repo": "Sarv/String-Claude-Sync-Plugin" }, "autoUpdate": true }
  },
  "enabledPlugins": { "string-claude-sync-plugin@string-tools": true },
  "env": {
    "CLAUDE_RECALL_URL": "https://your-server.example.com",
    "CLAUDE_RECALL_ENROLL_TOKEN": "<your organisation's enrollment token>"
  }
}
```

Claude Code installs the plugin at the next session start and keeps it updated.

## Install on one machine

```bash
claude plugin marketplace add Sarv/String-Claude-Sync-Plugin
claude plugin install string-claude-sync-plugin@string-tools
```

Set `CLAUDE_RECALL_URL` (default `http://127.0.0.1:4000`) and, for a shared server, `CLAUDE_RECALL_ENROLL_TOKEN` in the environment or in `~/.claude-recall/config.json` (`{ "url": "…", "enroll_token": "…" }`).

## What happens on a machine

1. The first reply asks the server to let this machine push (`APPROVAL_PENDING`). An admin approves it on the server's Devices page. Until then nothing is sent; the lines wait on the machine.
2. After approval every reply's new lines are sent (gzip, up to 4 MB per request). If the server is down they wait and go with the next reply.
3. Rejected: nothing more is sent for those sessions; a new Claude Code session asks again.

Everything it keeps is in `~/.claude-recall/` (waiting sessions, read positions, the device id and token, `push.log`). It only reads Claude Code's transcripts, never changes them.

To see what it is doing, run the plugin's `scripts/push.js --status` (Claude Code keeps the plugin under `~/.claude/plugins/`), or read `~/.claude-recall/push.log`.

## Requirements

- Node.js 18 or newer on `PATH` (Claude Code's own installer doesn't bring it).
- Claude Code with plugin support.
