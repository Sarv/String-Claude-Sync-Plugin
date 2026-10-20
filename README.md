# String Cortex plugin

The Claude Code plugin for **String Cortex**, a StringHub service. After every Claude reply it sends the new part of the conversation to your String Cortex server, together with the Claude account that is logged in. Claude Code is never slowed down: the plugin's hook finishes in milliseconds and a background process does the sending.

This repo holds only the plugin. It is published from the (private) server repo; make changes there.

- Plugin: `string-claude-sync-plugin`
- Marketplace: `string-tools` (this repo, `Sarv/String-Claude-Sync-Plugin`)

## What the plugin needs

Two settings (environment variables), given to it by Claude Code:

| Setting | What it is | If it is not set |
|---|---|---|
| `STRING_CLAUDE_SYNC_URL` | The address of your String Cortex server, e.g. `https://cortex.stringhub.com` | The URL in this plugin's `defaults.json`; if that is empty, `http://127.0.0.1:4000` |
| `STRING_CLAUDE_SYNC_ENROLL_TOKEN` | Your company's **enrollment token** (`scs_…`). Your company admin generates it in String Cortex, on the **Company** page | The server refuses the laptop (`TOKEN_REQUIRED`) |

The URL is taken from the first of: `STRING_CLAUDE_SYNC_URL` (from your organisation's managed settings, which can't be overridden on the laptop, or from your own Claude Code settings), then `defaults.json`, then `http://127.0.0.1:4000`.

**Only your company's Claude organisations:** the server stores only conversations of a Claude account of one of the Claude organisations your company has listed in String Cortex. A laptop logged in to another organisation (for example a personal account) can't join, or, if already approved, its conversations of that account are not stored.

**About the enrollment token:** every company has its own (an individual user is a one-person company). It only lets a laptop *ask* to join; the company admin still approves each laptop on the **Devices** page. Keep it private: don't share it or put it in a repo.

## Case 1: you are in an organisation (Claude for Teams or Enterprise)

Your company admin does this once; employees do nothing. (StringHub creates your company's account and sends the admin a login.)

1. Log in to String Cortex, open **Company → Generate token**, and press **Copy settings**. The block already contains your token and the server's address.
2. Open **claude.ai → Organization settings → Claude Code → Managed settings** (you need the Owner role in Claude) and paste it. It looks like this:
   ```json
   {
     "extraKnownMarketplaces": {
       "string-tools": {
         "source": { "source": "github", "repo": "Sarv/String-Claude-Sync-Plugin" },
         "autoUpdate": true
       }
     },
     "enabledPlugins": { "string-claude-sync-plugin@string-tools": true },
     "env": {
       "STRING_CLAUDE_SYNC_URL": "https://cortex.stringhub.com",
       "STRING_CLAUDE_SYNC_ENROLL_TOKEN": "<your organisation's enrollment token>"
     }
   }
   ```
   - `extraKnownMarketplaces`: where Claude Code finds the plugin (this repo).
   - `enabledPlugins`: turns the plugin on for everyone. Employees can't turn it off.
   - `autoUpdate`: new plugin versions arrive by themselves.
   - `env`: the two settings. Leave out the URL line if it is the default.
3. Within about an hour Claude Code picks up the settings, and installs the plugin in each employee's next session. Claude Code may ask them once to allow the organisation's settings; declining closes Claude Code.
4. After an employee's first reply, their laptop appears on your **Devices** page as *Waiting for approval*. Approve it, and everything that waited is sent. Nothing is lost while waiting.
5. Optional: add employees under **Company → Users** (with their Claude account email) so they can log in and see their own conversations.

## Case 2: you are an individual user (no organisation, e.g. Claude Pro or Max)

You set it up yourself, once.

1. StringHub creates a one-person company for you (it needs your Claude account's organisation id: `~/.claude.json` → `oauthAccount.organizationUuid`) and sends you a login. Log in, open **Company → Generate token**, and copy the token.
2. Install the plugin, in a terminal:
   ```bash
   claude plugin marketplace add Sarv/String-Claude-Sync-Plugin
   claude plugin install string-claude-sync-plugin@string-tools
   ```
   Or inside Claude Code: `/plugin marketplace add Sarv/String-Claude-Sync-Plugin`, then `/plugin install string-claude-sync-plugin@string-tools`.
3. Open your Claude Code settings file: `~/.claude/settings.json` (Windows: `%USERPROFILE%\.claude\settings.json`). Create it if it doesn't exist. Add the two settings in an `"env"` block:
   ```json
   {
     "env": {
       "STRING_CLAUDE_SYNC_URL": "https://cortex.stringhub.com",
       "STRING_CLAUDE_SYNC_ENROLL_TOKEN": "<your enrollment token>"
     }
   }
   ```
   If the file already has content, put the `"env"` part inside its outer `{ }` (with a comma after the part before it). If it already has an `"env"`, add just the two lines to it. Leave out the URL line if it is the default.
4. Start a new Claude Code session and send a message. Your laptop appears on your **Devices** page; approve it. From then on every reply is sent.
5. Updates: open `/plugin` in Claude Code, where you can update the plugin or turn on auto-update for the `string-tools` marketplace.

## Requirements

- **Node.js 18 or newer**, so that `node` works in a terminal. Claude Code's own installer doesn't include it.
- A Claude Code version with plugin support.

## What happens on your laptop

Everything the plugin keeps is in the folder `~/.string-claude-sync/`:

| File | What it is |
|---|---|
| `pending/` | Sessions with new lines still to send (they wait here while the server is down or the laptop isn't approved yet) |
| `state.json` | How far each conversation has been sent |
| `device.json` | This laptop's id, secret and current token (readable only by you) |
| `push.log` | What the plugin did. The last lines usually explain a problem |

The plugin only reads Claude Code's conversation files; it never changes them.

| Message in `push.log` | Meaning | What to do |
|---|---|---|
| `APPROVAL_PENDING` | Your laptop asked; it isn't approved yet. Your conversations wait on the laptop. | Your company admin approves it on Devices |
| `device approved: pushing` | Approved; sending | Nothing |
| `APPROVAL_REJECTED` | Your laptop was rejected or revoked | Ask the admin; a new Claude Code session asks again |
| `ENROLL_TOKEN_INVALID` | The enrollment token is wrong or old (a newer one was generated) | Use the current token |
| `ORG_NOT_ALLOWED` | The Claude account logged in here is of another Claude organisation; nothing of it is stored | Log in to Claude with your company account, or ask your company admin to add the organisation |
| `COMPANY_DISABLED` | Your company's account is switched off | Contact StringHub |
| `TOKEN_REQUIRED` | No enrollment token is set | Set `STRING_CLAUDE_SYNC_ENROLL_TOKEN` (see above) |
| `server unreachable` | Wrong URL, no network, or the server is down | Nothing is lost; it is sent with a later reply |
