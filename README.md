# 📣 Campaign Monitor MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io) server that exposes the **full
Campaign Monitor (createsend) v3.3 API** — 117 tools across 9 resource categories — to
MCP-compatible clients like Claude Desktop, Claude Code, and the MCP Inspector.

Authenticates with a Campaign Monitor **API key** (simplest, recommended) or via **OAuth 2.0**
with an auto-refreshing access token. Runs locally over stdio.

## Features

- **Complete API coverage** — account, clients, campaigns, lists, segments, subscribers,
  templates, transactional email, and journeys. Includes destructive/sending operations
  (send campaign, send transactional email, delete) — these are flagged with ⚠️ in their
  descriptions and tagged with the MCP `destructiveHint` annotation.
- **Simple auth** — drop in an API key and go. OAuth 2.0 is available as an optional
  alternative (with automatic refresh-token rotation persisted to a local store).
- **Category filtering** — expose only the categories you need via `CM_ENABLED_CATEGORIES`
  to keep the tool surface small.

## Install from npm

Once published, you don't need to clone or build — run it straight from npm with `npx`,
which is also how you point an MCP client at it:

```json
{
  "mcpServers": {
    "campaign-monitor": {
      "command": "npx",
      "args": ["-y", "campaign-monitor-mcp"],
      "env": { "CM_API_KEY": "your-api-key" }
    }
  }
}
```

Or install the CLI globally: `npm install -g campaign-monitor-mcp`, then the
`campaign-monitor-mcp` command is available on your PATH.

The rest of this README covers running from source (clone + build), which is what you want
for development.

## Requirements

- Node.js 20+
- A Campaign Monitor account and an **API key** (Account settings → API keys).
  OAuth credentials are an optional alternative — see [Using OAuth instead](#using-oauth-instead-optional).

## Install & build

```bash
npm install      # also builds via the prepare hook
npm run build    # or build manually
```

## Configure

Copy the example env file and fill it in:

```bash
cp .env.example .env
```

### API key (recommended)

1. In Campaign Monitor, click your **account name** (top-right) → **Account settings** →
   **API keys**, and copy the **API key**.
   - The **account-level** key (top-level account settings) can access every client, so
     the `account` and `clients` tools work. A **client-level** key (inside a specific
     client's settings) is scoped to just that client.
2. Set it in `.env` — this is the only credential you need:

   ```
   CM_API_KEY=your-api-key-here
   ```

   Leave the OAuth variables blank. The server uses the API key automatically whenever no
   OAuth refresh token is present.

### Using OAuth instead (optional)

OAuth lets the server use short-lived, scoped, revocable tokens instead of a static key.
It takes more setup. Skip this entirely if you're using an API key.

1. **Register an OAuth application.** Log in, open **Integrations** in the top nav (select a
   client first if prompted), then **OAuth Registration** in the right sidebar. Fill in an
   application name, a description, and set the **Redirect / Callback URI** to
   **`http://127.0.0.1:53682/callback`** (it must match `CM_REDIRECT_URI` exactly). Submit
   to get a **Client ID** and **Client Secret**.
2. Put `CM_CLIENT_ID` and `CM_CLIENT_SECRET` in `.env`.
3. Run the one-time bootstrap — it opens your browser, you approve the scopes, and a refresh
   token is stored (and printed so you can paste `CM_REFRESH_TOKEN` into `.env` as a backup):

   ```bash
   npm run auth
   ```

When all three OAuth variables are present they take precedence over `CM_API_KEY`.

## Verify

```bash
npm run smoke        # auth + GET /clients + GET /billingdetails (no writes)
npm run inspector    # build + open the MCP Inspector against the server
```

## Registering the MCP server

The server is a local **stdio** process: an MCP client launches `node dist/index.js` and
talks to it over stdin/stdout. You register it once per client by pointing the client at
the built entry file and supplying credentials as environment variables.

**Before registering:** run `npm run build` (creates `dist/`). Note the **absolute path** to
the project — every client needs it:

```bash
npm run build
pwd   # copy this; your entry point is <that path>/dist/index.js
```

The credentials block is the same for every client — just your API key:

```jsonc
"env": {
  "CM_API_KEY": "your-api-key"
}
```

> Tip: you can omit `env` entirely if you keep `CM_API_KEY` in the project's `.env` file —
> the server loads it on startup. (Using OAuth instead? Put `CM_CLIENT_ID`,
> `CM_CLIENT_SECRET`, and `CM_REFRESH_TOKEN` in the `env` block instead of `CM_API_KEY`.)

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
        "CM_API_KEY": "your-api-key"
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
  --env CM_API_KEY=your-api-key \
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
        "CM_API_KEY": "your-api-key"
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
- **401 / authentication errors at runtime** — using an API key: confirm it's correct and
  not revoked (and that an account-level key is used for `account`/`clients` tools). Using
  OAuth: the refresh token expired or was revoked — re-run `npm run auth`.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `CM_API_KEY` | **API key (recommended).** Used unless OAuth credentials are present. |
| `CM_ENABLED_CATEGORIES` | Comma-separated list to limit exposed tool categories |
| `CM_CLIENT_ID` / `CM_CLIENT_SECRET` | OAuth application credentials (optional) |
| `CM_REFRESH_TOKEN` | OAuth seed refresh token, from `npm run auth` (optional) |
| `CM_REDIRECT_URI` | OAuth redirect URI (default `http://127.0.0.1:53682/callback`) |
| `CM_SCOPES` | Scopes requested during `npm run auth` |
| `CM_TOKEN_STORE` | Path to the OAuth token store file |

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
