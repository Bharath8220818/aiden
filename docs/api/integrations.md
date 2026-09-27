# Integrations & Notifications

## MCP integrations

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/integrations/mcp` | `connection.read` | MCP server registry + health (Slack, Teams, Outlook, Jira adapters) |
| POST | `/integrations/mcp/{server_id}/status` | `agent.control` | enable/disable / health-check a server |

Each adapter (`backend/app/integrations/mcp/*`) checks its own permission
before any external call; credentials come from the encrypted secret store.

## Notifications

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/notifications` | `notification.read` | list for current user |
| GET | `/notifications/channels` | `notification.read` | channel availability (in-app, email, Slack, Teams) |
| POST | `/notifications/send` | `notification.send` | send (governed; agents use the ToolRegistry path) |
| POST | `/notifications/{id}/read` | `notification.read` | mark read |
| POST | `/notifications/read-all` | `notification.read` | mark all read |

Channel delivery degrades independently: SMTP/Slack/Teams webhooks configured
via env (`docs/deployment/environment-variables.md`); in-app always works.
Failure notifications from pipelines ride the same governed send path.
