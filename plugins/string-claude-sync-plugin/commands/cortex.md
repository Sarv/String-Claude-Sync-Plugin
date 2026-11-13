---
description: String Cortex for this laptop — status, connect, choose this folder's project, disconnect
argument-hint: "[status | connect [token] | project | disconnect]"
---

The person typed `/cortex $ARGUMENTS`. Handle it with the String Cortex plugin's tools (their names end in
`connect_cortex`, `cortex_status`, `set_cortex_folder` and `disconnect_cortex`). If none of those tools is available,
say in one line: "String Cortex can't run on this laptop: it needs Node.js (https://nodejs.org)." and stop.

Never ask for the Claude Code token in chat, and never show ids to the person.

- **No argument, or `status`**: call `cortex_status`. Tell the person in a few short lines: connected or not (as whom,
  at which organisation), this folder's workspace and project, and that `/cortex project` changes it. If it says not
  connected, say where the member-list request stands (as it says) and offer `/cortex connect`.
- **`connect`**: call `connect_cortex`. When the organisation connects people from its member list, it asks for this
  laptop (again, after a refusal) and says it waits for an approval; otherwise it opens a form for the token. Tell the
  person in one line what it answered.
  The plugin takes `/cortex connect <token>` (or the token sent on its own) before Claude sees it. If a token still
  reaches you, never use, repeat or show it: say that it reached the chat, that they should generate a new one and
  send it on its own in a message.
- **`project`** (also `workspace`): call `cortex_status` for this folder. Then use AskUserQuestion twice: first
  "Which String Cortex workspace is this folder for?" (header "Workspace", one option per workspace), then "Which
  project is this folder for?" (header "Project", one option per project of the chosen workspace). If the chosen
  workspace has no project for them, tell the person that the workspace's owners and admins create projects and add
  members (String Cortex → All projects), to ask them to be added, and to run `/cortex project` again. Otherwise call `set_cortex_folder` with the folder, the workspace and
  the project, and tell them in one line what was saved.
- **`disconnect`**: ask the person to confirm (AskUserQuestion: "Disconnect String Cortex on this laptop?", options
  "Disconnect" and "Keep connected"). Only on "Disconnect", call `disconnect_cortex` and tell them what it answered.
- **Anything else** (including `help`): list these four in one short line each.
