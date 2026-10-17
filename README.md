# Claude Recall

A personal knowledge base of your Claude Code conversations. Every prompt you type and every text reply Claude gives is stored in a separate Elasticsearch index with an embedding. You can scroll through it like a chat, or search it by meaning or keyword. Search never calls an LLM: it just shows the matching records.

Works for **every project and session**. Nothing is added to your projects.

```
Claude Code ─(Stop hook)─▶ hook.js ─▶ push.js ──POST /api/push (new lines, gzip)──▶ app :4000 ──publish──▶ RabbitMQ ──fetch──▶ worker × N
                 marks ~/.claude-recall/pending      own read position          ▲                                       │ Redis lock per session
                                                                                └──── live "changed" events (fanout) ───┤
      local mode only: ~/.claude/projects/*.jsonl (read-only mount) ──────────────────────────────────────────────────▶ │ Sync page / catch-up
                                                                               Ollama (nomic-embed-text) ◀──────────── │ embed
                                                                               Elasticsearch ◀──────────────────────── ┘ write (fenced)
```

## Start

```bash
docker compose up -d
```

Open http://localhost:4000. The first start downloads the embedding model (~270 MB) and then ingests your existing history automatically. Syncing runs on the workers; the Sync page shows its health (queue, workers, failed jobs), progress and log.

Then install the Stop hook once, so new messages are indexed as soon as Claude finishes a reply:

```bash
node scripts/install-hook.js
```

It backs up `~/.claude/settings.json` first and only adds (or updates) one hook entry, which runs `scripts/hook.js` (the same code as the `string-claude-recall` plugin, in `plugins/string-claude-recall/scripts/`). The hook marks the session in `~/.claude-recall/pending` with the account Claude Code is logged in with (from `~/.claude.json`: ids, name, email, organisation, role; no tokens), starts `scripts/push.js` in the background and exits; push.js sends the new transcript lines, so messages are linked to users and organisations. It takes effect in new Claude Code sessions. To take it out again: `node scripts/install-hook.js --remove`.

```bash
node scripts/push.js --status   # server, device approval, sessions waiting to be sent
node scripts/push.js --all      # send every transcript (first sync of a new machine)
```

## How the hook pushes

- **Client side** (`~/.claude-recall/`, `CLAUDE_RECALL_DIR`): `pending/<session>.json` per session with lines to send, `state.json` with its own read position per transcript, `device.json` (chmod 600), `push.log`. One pusher runs at a time; a hook that finds one running just leaves its marker.
- **What to send:** the lines after the client's read position, complete lines only, up to 4 MB per request (`CLAUDE_RECALL_CHUNK`), gzipped. A single line over 10 MB is skipped (the server is told to move past it). If `state.json` is lost or broken the client asks `GET /api/offset`.
- **Server check:** the API knows how far it has each session (`recv:<project>/<session>` in Redis = queued, `byte_offset` in Elasticsearch = written). Already have it → `200 DUPLICATE`; starts past it → `409` with the offset, and the client resends from there; otherwise a `push` job with the lines goes to RabbitMQ and the API answers `202`. Body limit 16 MB (`PUSH_MAX_BYTES`).
- **Worker:** under the session's Redis lock it drops lines it already has; if an earlier chunk of the session isn't written yet the job waits 2 s (BUSY). The read position is still fenced with `if_seq_no`, so at-least-once delivery never duplicates.
- **Server down:** push.js retries 4 times (~13 s) and keeps the markers; the next hook of any session sends everything that waited.

## Local mode and a shared server

`docker compose up -d` is **local mode** (`LOCAL_MODE=true`): the server also reads `~/.claude/projects` from a read-only mount, so the Sync page, auto-sync, the startup catch-up and the backfills work as before, and pushes without a token count as tenant `local` (`ALLOW_NO_AUTH=true`; the port is bound to 127.0.0.1).

A **shared server** has no mount and every machine must be approved:

```bash
ENROLL_TOKENS=acme:<long random> ADMIN_TOKEN=<long random> \
  docker compose -f docker-compose.yml -f docker-compose.server.yml up -d
```

1. Give every machine the hook as a **Claude Code plugin**: the hook and pusher live in `plugins/string-claude-recall/` and this repo is their marketplace (`.claude-plugin/marketplace.json`, `string-tools`). Push it to the GitHub repo ([Sarv/String-Claude-Recall](https://github.com/Sarv/String-Claude-Recall); every employee must be able to read it), then paste the block from `node scripts/install-hook.js --managed` into claude.ai → Organization settings → Claude Code → Managed settings (Teams / Enterprise; or `managed-settings.json` via MDM). It sets `extraKnownMarketplaces` (with `autoUpdate`), `enabledPlugins: { "string-claude-recall@string-tools": true }` and `env` (`CLAUDE_RECALL_URL`, `CLAUDE_RECALL_ENROLL_TOKEN`). Claude Code installs the plugin at the next session start; nobody copies files. To ship a change, raise `version` in `plugins/string-claude-recall/.claude-plugin/plugin.json`. Each machine needs Node.js 18+ on PATH and git read access to the repo (or use claude.ai org sync / an `archive` source). Check the files with `claude plugin validate .`.
2. On its first hook a machine makes up a device id and secret (`~/.claude-recall/device.json`; the server keeps only the secret's hash) and enrolls → `APPROVAL_PENDING`. Its lines wait on the machine.
3. An admin approves or rejects it on the **Devices** page (asks for `ADMIN_TOKEN`).
4. Approved → the next hook gets a device token (`TOKEN_TTL_S`, default a day) and sends everything that waited. In the token's second half the server returns a new one (`X-Recall-Token`); an expired one is replaced with the device secret, no new approval.
5. Rejected or revoked → its tokens stop at once, `APPROVAL_REJECTED`, and it sends nothing more for the sessions it knew; a new Claude Code session asks again as a new device.

Device status lives in Redis and in `claude_chat_devices`; tokens only in Redis, which is now persistent (append-only file, `redis-data` volume). Jobs, messages, images, usage and read positions carry `tenant_id`. Tenants are **not isolated** in search and stats yet. Put HTTPS in front before exposing the server.

## Jobs, workers and locks

The API never does the indexing itself. It **publishes jobs** to RabbitMQ and **workers fetch them**:

- **Push** → the API publishes `{ type: "push", slug, sessionId, start, end, gz, account, tenant_id }` to `recall.ingest` as a persistent message and answers 202 once RabbitMQ confirms it (a few ms). If RabbitMQ is down it answers 503 and the lines wait on the client. (`POST /api/hook` with only a path still works in local mode, for the older hook.)
- **Sync** (local mode: button, auto-sync timer, startup) → a job on `recall.maintenance` that lists files with unread lines and queues one ingest job per file, so all workers share it. Backfills and cost recalculation are maintenance jobs too.
- **At-least-once:** a job is acked only when it is done. A crashed worker's job goes to another worker. A failed job retries after 10 s, up to 3 times (`JOB_MAX_ATTEMPTS`), then waits in the dead-letter queue `recall.dlq` until you press *Try again* on the Sync page.
- **No two writers per session:** a worker takes `lock:session:<project>/<session>` in Redis (`SET NX PX 30000`, renewed every 10 s, released by token). If it's taken, the job comes back in 2 s. A lock can still run out under a stalled worker, so the read position is also **fenced**: it is saved with `if_seq_no` / `if_primary_term` and a stale write is rejected and retried. Message ids are transcript uuids, so a retry never duplicates.
- **Live updates:** workers publish `log`, `status`, `changed` events to the `recall.events` fanout; every API process relays them to the browser over SSE.
- **Scale:** `WORKERS=4 docker compose up -d`. `WORKER_PREFETCH` (default 2) is how many ingest jobs one worker runs at once; embedding is the bottleneck.
- The API stays up if RabbitMQ drops and reconnects by itself; a worker exits and Docker restarts it.

## Pages

| Page | What it does |
|---|---|
| **Chats** | The left sidebar is a project → sessions tree: click a project to expand its sessions, click a session to read it. Open up to 3 sessions side by side with **Split pane**, the pane icon next to a session, or Ctrl/⌘-click. Drag the line between panes to resize them (double-click it to make them equal). With 2–3 panes open, ← / → move to the neighbouring pane, and ↑ ↓ / Page keys then scroll it. Each pane opens at the latest message, follows new messages live, and has jump-to-top / jump-to-latest buttons. The sidebar collapses to an icon rail (button at the top left). |
| **Search** | Hybrid (semantic + keyword), Semantic only, or Keyword only. Filter by project and by who said it. Claude's replies show the prompt they answered. "Open in chat" jumps to that message in the timeline. |
| **Projects** | All projects with tokens and cost, searchable, sortable (incl. by cost) and paginated. The chat icon opens a project's latest session. Give a project a title; it's then shown everywhere instead of the folder name. Stats lists only the 10 most recently active. |
| **Devices** | Machines whose hook asked to push: who, machine, tenant, status. Approve, reject or revoke. Needs `ADMIN_TOKEN` when set. |
| **Accounts** | Two tabs, Users and Organisations: who the hook has seen, how they link, and their activity, token use and cost. Messages written before linking show as "Not linked". |
| **Stats** | Counters, messages per day, tokens and API-equivalent cost per day (input / output / cache write / cache read / cost), the hours you work, and tables per project, model and session. Filter by project and date range. |
| **Settings** | Chat text size (default 15 px) and theme, saved in this browser. **Model prices**: the price table used for cost (edit, add, or *Add known Claude prices*, which only fills missing models). Saving recalculates every response's cost. |
| **Guide** | The full concept in the app: how it works, key terms, requirements, ports, Elasticsearch structure, deleting, troubleshooting. |
| **Sync** | (Local mode) Sync all, sync selected projects, or sync one row. Exclude a project so it's never indexed. Turn auto-sync on or off and set its interval. Shows a live log. |

## How sync works

- Every transcript file's progress (byte offset) is saved in `claude_chat_ingest_state`. A push or a sync stores only what was added after that point, and the offset moves only after Elasticsearch accepts the batch. If the app or Docker was down, the next hook (or, in local mode, the next sync) continues from where it stopped.
- Each message is stored under its own transcript uuid, so re-reading never creates duplicates.
- What is kept: your prompts and Claude's text replies. Tool calls and results, thinking, sub-agent sidechains and slash-command plumbing are skipped.
- Images you paste into a prompt are stored too (in `claude_chat_images`) and shown under that prompt in the timeline and in search results. Screenshots that tools return are not kept.
- Token usage of every API response (including sub-agents) is recorded for the Stats page, with its **API-equivalent cost**: what it would cost on the Claude API at list prices. On a subscription you aren't billed per token, so it's a yardstick, not your bill.
  - Prices are USD per million tokens per model, in `claude_chat_prices`. The known Claude list prices (checked 17 Oct 2026, in `app/src/prices.js`) are added on first start; a price you enter always wins.
  - 5-minute and 1-hour cache writes are priced apart (1.25× / 2× input); Claude Code mostly writes 1-hour cache.
  - Claude Haiku 5.5 prompts over 100,000 tokens (counting cache) are priced higher as a whole; fast mode multiplies the price (2× on Opus 5.5, Opus 5, Opus 4.8); US-only inference adds 10%.
  - A dated id (`claude-sonnet-4-5-20250929`) uses the price of the id without the date. Responses of a model with no price are left out of costs and flagged.
- **Delete** (pane header for a session; Sync, Projects or Stats for a project) holds the locks of the affected sessions while it runs and removes Claude Recall's copy only: messages, images, token usage. Transcripts are never touched. Afterwards you choose: *Keep it out* (default, it doesn't come back on the next sync), *Bring it back on the next sync* (rebuilds it from the transcripts), or, for a project, *Stop saving this project* (also excludes it).
- Common secret shapes (API keys, tokens, JWTs, private keys, `password=…`, credentials in URLs) are masked before anything is stored.

## Indices (separate from everything else)

| Index | Holds |
|---|---|
| `claude_chat_log` | One doc per prompt or reply, plus a 768-dim `embedding` |
| `claude_chat_ingest_state` | Per-transcript offset, session title, project path |
| `claude_chat_images` | Images pasted into prompts (base64), linked from their message |
| `claude_chat_usage` | Token usage per Claude API response (input, output, 5-minute / 1-hour cache write, cache read, model, speed, cost) |
| `claude_chat_prices` | Price per model (USD per million tokens) |
| `claude_chat_projects` | Titles you gave projects |
| `claude_chat_users` | Claude accounts seen by the hook (email, name, ids) |
| `claude_chat_orgs` | Organisations |
| `claude_chat_memberships` | User ↔ organisation links with role |
| `claude_chat_devices` | Machines that asked to push: tenant, status, secret hash, who, last seen |
| `claude_chat_settings` | Auto-sync, interval, excluded projects |

## Ports (localhost only)

| Service | Host port | Override |
|---|---|---|
| App / UI | 4000 | `APP_PORT` |
| Elasticsearch | 9230 | `ES_PORT` |
| Ollama | 11440 | `EMBED_PORT` |
| RabbitMQ management UI | 15680 (login `recall` / `recall`) | `RABBIT_UI_PORT`, `RABBIT_PASS` |

Workers and Redis have no host port. Redis keeps its data in the `redis-data` volume. Memory when idle: ~1.5 GB in all (Elasticsearch ~1 GB, Ollama ~330 MB, RabbitMQ ~100 MB, the rest ~20 MB each).

If you change `APP_PORT`, set `CLAUDE_RECALL_PORT` (or `CLAUDE_RECALL_URL`) for the hook, e.g. in `~/.claude-recall/config.json`: `{ "url": "http://127.0.0.1:4100" }`.

## Changing the embedding model

Set `EMBED_MODEL` (any Ollama embedding model). A model with different dimensions needs a fresh index: the app stops with a message naming the indices to delete. Delete them yourself, then restart.

## UI

Built with the StringHub design system in `design-system/` (copied into the image at build time and served from `/ds/`). `app/public/app.css` only holds layout glue, and every value in it is a design-system token.
