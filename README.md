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
    "STRING_CLAUDE_SYNC_URL": "https://your-server.example.com",
    "STRING_CLAUDE_SYNC_ENROLL_TOKEN": "<your organisation's enrollment token>"
  }
}
```

Claude Code installs the plugin at the next session start and keeps it updated.

The server URL is taken from the first of: `STRING_CLAUDE_SYNC_URL` (managed settings, which users can't override, or the environment), the plugin's `defaults.json` (the URL most machines use, set once in git), `http://127.0.0.1:4000`. So managed settings only need the URL when it differs. The enrollment token has no default: it is per organisation.

## Install on one machine

```bash
claude plugin marketplace add Sarv/String-Claude-Sync-Plugin
claude plugin install string-claude-sync-plugin@string-tools
```

Set `STRING_CLAUDE_SYNC_URL` (default `http://127.0.0.1:4000`) and, for a shared server, `STRING_CLAUDE_SYNC_ENROLL_TOKEN` in the `env` block of `~/.claude/settings.json` (e.g. someone using it without an organisation).

## What happens on a machine

1. The first reply asks the server to let this machine push (`APPROVAL_PENDING`). An admin approves it on the server's Devices page. Until then nothing is sent; the lines wait on the machine.
2. After approval every reply's new lines are sent (gzip, up to 4 MB per request). If the server is down they wait and go with the next reply.
3. Rejected: nothing more is sent for those sessions; a new Claude Code session asks again.

Everything it keeps is in `~/.string-claude-sync/` (waiting sessions, read positions, the device id and token, `push.log`). It only reads Claude Code's transcripts, never changes them.

To see what it is doing, run the plugin's `scripts/push.js --status` (Claude Code keeps the plugin under `~/.claude/plugins/`), or read `~/.string-claude-sync/push.log`.

## Requirements

- Node.js 18 or newer on `PATH` (Claude Code's own installer doesn't bring it).
- Claude Code with plugin support.
