# AIDEN Database Architecture

PostgreSQL (Supabase in production, SQLite for local dev/tests), accessed via
SQLAlchemy 2 **async** + asyncpg, migrated exclusively with Alembic.

## Access & migration stack

| Concern | Detail |
|---|---|
| Engine | `postgresql+asyncpg://` (URL validator rewrites `postgres://` variants) |
| Local dev fallback | `sqlite+aiosqlite:///./aiden_dev.db` (mirrored schema) |
| Migrations | `backend/migrations/` (Alembic), head `d6e7f8a9b0c1` |
| Session dep | `app.core.database.get_db` — one async session per request |
| Schema sync | `create_all` only in tests (in-memory SQLite); prod always migrates |

## Production connection (lesson learned)

Supabase's **direct** host `db.<ref>.supabase.co` is IPv6-only; Render has no
IPv6 egress → timeouts. The fix is the IPv4 **session pooler**:

```
postgresql://postgres.<ref>:<PW>@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
```

`backend/app/core/config.py` normalizes the scheme; `ENVIRONMENT=production`
refuses to boot with development-insecure secrets.

## Table inventory (22, by domain)

| Domain | Tables |
|---|---|
| Identity & tenancy | `users`, `workspaces`, `workspace_members` |
| Project context | `projects` (workspace → project → everything else) |
| Requirements | `requirements`, `data_contracts` (+ contract columns) |
| Architecture | `architectures` (nodes/edges JSON blueprint) |
| Pipelines | `pipelines`, `pipeline_nodes`, `pipeline_runs` |
| Incidents & healing | `incidents`, `healing_runs` |
| Governance | `approvals`, `audit_logs` |
| Agents | `agent_runs`, `agent_stage_runs` |
| Knowledge (RAG) | `knowledge_documents`, `knowledge_chunks` |
| Platform | `connections`, `mcp_integrations`, `notifications`, `tasks` |

Counts as deployed: 22 tables · 66 indexes · 35 foreign keys.

## Tenancy & relationships

```
workspaces ──< workspace_members >── users
    │
    └──< projects
              ├──< requirements ──< data_contracts
              ├──< architectures
              ├──< pipelines ──< pipeline_nodes
              │        └──< pipeline_runs
              ├──< incidents ──< healing_runs
              ├──< agent_runs ──< agent_stage_runs
              ├──< approvals / audit_logs
              └──< knowledge_documents ──< knowledge_chunks
```

- Every domain row carries `project_id` (the project-context boundary) and
  most carry `created_by` → `users.id`.
- Deletion cascades are FK-level (verified live against Supabase during
  Phase A provisioning).

## Conventions

- UUID primary keys; `created_at`/`updated_at` timestamps (UTC).
- Status fields are string enums shared with `app/models` enums
  (`AgentRunStatus`, `StageStatus`, `UserRole`, `WorkspaceRole`, ...).
- JSON columns for structured payloads (`outputs`, `stages`, blueprint
  nodes/edges, contract spec) — queried rarely, written transactionally.

## Where schema docs live

- `docs/database/schema.md` — column-level reference.
- `docs/database/relationships.md` — the FK graph above, per-table.
- `docs/database/migrations.md` — Alembic workflow (create → review →
  `upgrade head`); migrations are the only schema source of truth. Any
  `database/*.sql` files must be generated views of migrations, never
  hand-edited parallel schema.
