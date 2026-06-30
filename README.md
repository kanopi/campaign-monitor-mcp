# Campaign Monitor MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io) server that exposes the **full
Campaign Monitor (createsend) v3.3 API** — 117 tools across 9 resource categories — to
MCP-compatible clients like Claude Desktop, Claude Code, and the MCP Inspector.

Authenticates via **OAuth 2.0** with an auto-refreshing access token (API-key auth
supported as a fallback). Runs locally over stdio.

## Features

- **Complete API coverage** — account, clients, campaigns, lists, segments, subscribers,
  templates, transactional email, and journeys. Includes destructive/sending operations
  (send campaign, send transactional email, delete) — these are flagged with ⚠️ in their
  descriptions and tagged with the MCP `destructiveHint` annotation.
- **OAuth with token rotation** — Campaign Monitor rotates refresh tokens on every refresh.
  The server persists the latest token to a local store (`~/.campaign-monitor-mcp/tokens.json`)
  so it keeps working across restarts.
- **Category filtering** — expose only the categories you need via `CM_ENABLED_CATEGORIES`
  to keep the tool surface small.

## Requirements

- Node.js 20+
- A Campaign Monitor account, and an [OAuth application](https://www.campaignmonitor.com/api/v3-3/getting-started/#oauthflow)
  (Client ID + Client Secret) **or** an API key.

## Install & build

```bash
npm install      # also builds via the prepare hook
npm run build    # or build manually
```

## Register a Campaign Monitor OAuth application

To use OAuth you first need a **Client ID** and **Client Secret** from Campaign Monitor.
These are issued when you register an OAuth application in your account:

1. Log in to your [Campaign Monitor account](https://login.createsend.com/).
2. In the top navigation, open **Integrations**. (You may need to select a client first.)
3. In the right-hand sidebar, choose **OAuth Registration**.
4. Fill in the registration form:
   - **Application name** — e.g. `Campaign Monitor MCP`.
   - **Description** — a short summary (e.g. "Local MCP server for API access").
   - **Redirect / Callback URI** — set this to **`http://127.0.0.1:53682/callback`**.
     It must match `CM_REDIRECT_URI` in your `.env` exactly, or the `npm run auth` step
     will fail. (If you change one, change both.)
5. Submit. Campaign Monitor shows your **Client ID** and **Client Secret** — copy both
   into `.env` as `CM_CLIENT_ID` and `CM_CLIENT_SECRET`. Treat the secret like a password.

> Don't want to use OAuth? You can skip this entirely and use an API key instead — see
> [API key (fallback)](#api-key-fallback) below.

## Configure

Copy the example env file and fill it in:

```bash
cp .env.example .env
```

### OAuth (recommended)

1. Make sure you've [registered an OAuth application](#register-a-campaign-monitor-oauth-application)
   and put `CM_CLIENT_ID` and `CM_CLIENT_SECRET` in `.env`.
2. Confirm `CM_REDIRECT_URI` in `.env` matches the redirect URI you registered
   (default `http://127.0.0.1:53682/callback`).
3. Run the one-time bootstrap:

   ```bash
   npm run auth
   ```

   This opens your browser, you approve the requested scopes, and a refresh token is stored
   (and printed so you can also paste `CM_REFRESH_TOKEN` into `.env` as a backup seed).

### API key (fallback)

Set `CM_API_KEY` in `.env` (found under **Account Settings → API keys**). Used only if no
OAuth refresh token is available.

## Verify

```bash
npm run smoke        # auth + GET /clients + GET /billingdetails (no writes)
npm run inspector    # build + open the MCP Inspector against the server
```

## Registering the MCP server

The server is a local **stdio** process: an MCP client launches `node dist/index.js` and
talks to it over stdin/stdout. You register it once per client by pointing the client at
the built entry file and supplying credentials as environment variables.

**Before registering:** run `npm run build` (creates `dist/`) and `npm run auth` once to
obtain a refresh token. Note the **absolute path** to the project — every client needs it:

```bash
npm run build
npm run auth
pwd   # copy this; your entry point is <that path>/dist/index.js
```

The credentials block is the same for every client:

```jsonc
"env": {
  "CM_CLIENT_ID": "your-client-id",
  "CM_CLIENT_SECRET": "your-client-secret",
  "CM_REFRESH_TOKEN": "your-refresh-token"   // from `npm run auth`
}
```

> Tip: you can omit `env` entirely if you keep credentials in the project's `.env` file —
> the server loads it on startup. The refresh token is also cached in
> `~/.campaign-monitor-mcp/tokens.json` (override with `CM_TOKEN_STORE`) and rotated
> automatically, so once `npm run auth` has run, the stored token alone is enough.

### Claude Desktop

Edit `claude_desktop_config.json` (create it if missing):

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "campaign-monitor": {
      "command": "node",
      "args": ["/absolute/path/to/campaign-monitor-mcp/dist/index.js"],
      "env": {
        "CM_CLIENT_ID": "your-client-id",
        "CM_CLIENT_SECRET": "your-client-secret",
        "CM_REFRESH_TOKEN": "your-refresh-token"
      }
    }
  }
}
```

Save and **fully quit and reopen** Claude Desktop. The tools appear under the 🔌 (MCP)
icon in the chat input.

### Claude Code (CLI)

Register with one command (no manual JSON editing):

```bash
claude mcp add campaign-monitor \
  --env CM_CLIENT_ID=your-client-id \
  --env CM_CLIENT_SECRET=your-client-secret \
  --env CM_REFRESH_TOKEN=your-refresh-token \
  -- node /absolute/path/to/campaign-monitor-mcp/dist/index.js
```

Add `--scope user` to make it available in every project (default is the current project
only). Verify with `claude mcp list`, and inside a session run `/mcp` to see the tools.
Remove with `claude mcp remove campaign-monitor`.

### Cursor / Windsurf / other MCP clients

Any client that supports local stdio MCP servers uses the same shape. Add to the client's
MCP config (e.g. Cursor's `~/.cursor/mcp.json` or a project `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "campaign-monitor": {
      "command": "node",
      "args": ["/absolute/path/to/campaign-monitor-mcp/dist/index.js"],
      "env": {
        "CM_CLIENT_ID": "your-client-id",
        "CM_CLIENT_SECRET": "your-client-secret",
        "CM_REFRESH_TOKEN": "your-refresh-token"
      }
    }
  }
}
```

### Limiting the exposed tools

117 tools is a lot to load at once. To register only the categories you need, add
`CM_ENABLED_CATEGORIES` to the `env` block, e.g.:

```json
"env": { "CM_ENABLED_CATEGORIES": "campaigns,lists,subscribers", "...": "..." }
```

### Test the registration first

Before wiring into a client, confirm the server boots and lists tools with the Inspector:

```bash
npm run inspector   # opens the MCP Inspector against node dist/index.js
```

### Troubleshooting

- **"No Campaign Monitor credentials found"** — the `env` block is missing/misspelled, or
  `.env` isn't being read. Provide credentials in the client config's `env`.
- **Server doesn't appear / "failed to start"** — use an **absolute** path to
  `dist/index.js`, ensure you ran `npm run build`, and that `node` is on the client's PATH
  (use an absolute node path if needed, e.g. `/usr/local/bin/node`).
- **401 / token errors at runtime** — the refresh token expired or was revoked; re-run
  `npm run auth`.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `CM_CLIENT_ID` / `CM_CLIENT_SECRET` | OAuth application credentials |
| `CM_REFRESH_TOKEN` | Seed refresh token (from `npm run auth`) |
| `CM_REDIRECT_URI` | OAuth redirect URI (default `http://127.0.0.1:53682/callback`) |
| `CM_SCOPES` | Scopes requested during `npm run auth` |
| `CM_API_KEY` | Fallback API key (HTTP Basic auth) |
| `CM_TOKEN_STORE` | Path to the token store file |
| `CM_ENABLED_CATEGORIES` | Comma-separated list to limit exposed tool categories |

## Tool catalog

Tools follow a `cm_<verb>_<resource>` naming convention. Counts by category:

| Category | Tools | Examples |
| --- | --- | --- |
| account | 13 | `cm_list_clients`, `cm_get_billing_details`, `cm_add_admin` |
| clients | 30 | `cm_create_client`, `cm_get_client_lists`, `cm_suppress_emails` |
| campaigns | 15 | `cm_create_campaign`, `cm_send_campaign` ⚠️, `cm_get_campaign_summary` |
| lists | 22 | `cm_create_list`, `cm_create_custom_field`, `cm_create_webhook` |
| segments | 7 | `cm_create_segment`, `cm_get_segment_subscribers` |
| subscribers | 7 | `cm_add_subscriber`, `cm_import_subscribers`, `cm_unsubscribe_subscriber` |
| templates | 5 | `cm_create_template`, `cm_copy_template` |
| transactional | 9 | `cm_send_smart_email` ⚠️, `cm_send_classic_email` ⚠️, `cm_get_transactional_statistics` |
| journeys | 9 | `cm_get_journey`, `cm_copy_journey`, `cm_publish_event` |

## Notes & limits

- **Destructive tools are enabled by default** (per the build spec). Your MCP client's
  permission prompts are the safety gate. To hard-disable a category, omit it from
  `CM_ENABLED_CATEGORIES`.
- Responses are returned as JSON. XML responses are not supported.
- Rate limiting (HTTP 429) is honored with a single bounded retry using `Retry-After`.
- Custom field keys are passed including their brackets, e.g. `[MyField]`.

## License

MIT
