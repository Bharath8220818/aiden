# AIDEN Security Architecture

Security follows one rule: **agents never act on the world directly** — every
external action is governed, risk-scored, and audited; anything destructive
or high-risk requires a human approval.

## Identity & sessions

| Concern | Implementation |
|---|---|
| Passwords | bcrypt (`app.core.security.hash_password`) |
| Sessions | JWT HS256, 8 h TTL (matches frontend session), `Authorization: Bearer` |
| Registration | `POST /auth/register` open self-registration; `/users` admin-only |
| Boot guard | `ENVIRONMENT=production` refuses `insecure-dev` secrets or `DEBUG=true` |

## Authorization — two RBAC axes

`app/core/permissions.py` is the single catalog (≈40 permissions):

1. **System role** (`UserRole`): viewer ⊂ engineer ⊂ lead ⊂ admin.
   Examples: viewer = read-everything, no writes; engineer adds
   project/pipeline/SQL/healing proposals; lead adds deploy, approvals,
   `agent.control`, `sql.destructive`; admin = all.
2. **Workspace role** (`WorkspaceRole`): owner/admin/member/viewer grants are
   intersected with system-role grants per workspace.

Dependencies: `require_permission("...")` builds `AuthContext` (user +
permissions + workspace). Read surfaces are granted broadly (Phase F:
cross-domain reads for every signed-in role); write/destructive gates stay
narrow (403s verified by the Phase A smoke: viewer write → 403).

## Governance — the ToolRegistry path

```
Agent stage ──► ToolRegistry.execute(tool, user, permissions, params)
                    │  permission check (§15)
                    │  risk classification (low/medium/high)
                    │  approval requirement for destructive ops
                    ▼
              platform action + audit log row
```

- `app/services/tool_registry.py` is the **only** way agent stages touch the
  outside world (SQL execution, file writes, notifications, ...).
- Denials return structured `{status: "denied", code, detail}` — agents
  degrade, they never bypass.

## Human approval gates

- High-risk operations (deploy, destructive SQL, healing apply) create
  `approvals` rows; `approval.approve` permission (lead/admin) is required to
  pass them (`/governance` endpoints).
- Self-healing flow enforces: RCA → patch → **sandbox test**
  (`POST /sandbox/test`) → approval → only then re-run. The LLM never deploys
  directly.

## Dangerous-SQL guard

`/sql/assistant` + `/sql/execute`: generated SQL passes `_guard_readonly`
server-side regardless of model output; `sql.execute` permission for reads,
`sql.destructive` (lead+) for writes. Protected classes: `DROP`, `DELETE`,
`TRUNCATE`, production DDL, credentials, shell.

## Audit & rate limiting

- Every governed action writes `audit_logs` (actor, action, target, request
  id); `GET /audit` is admin-readable.
- `RateLimitMiddleware` (`app/core/rate_limit.py`): 60 req/min per IP
  default, in-memory (Redis-backed when Phase B wires it), 429s verified in
  the Phase A smoke.
- Security headers middleware; CORS pinned to the Vercel frontend origin.

## Secrets & integrations

- Secrets never in code: `.env` files are gitignored; production secrets live
  in Render env vars / Supabase; MCP integration credentials via the
  `secret_service` (encrypted at rest with `cryptography` Fernet).
- MCP adapters (`app/integrations/mcp/*`) each check their own permission
  (`notification.send`, etc.) before external calls.

## Test coverage

Auth/RBAC behavior is pinned by tests: `test_auth.py`, `test_permissions.py`,
`test_errors.py` (401/403/422/404 envelope), `test_tool_registry.py`,
`test_tool_approval_gate.py`, plus the Phase A smoke gates S10/A4–A6.
