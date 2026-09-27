# Database Schema Reference

**Source of truth: `backend/app/models/` + Alembic migrations**
(`backend/migrations/versions/`, head `d6e7f8a9b0c1`). This doc maps domains
to modules — column-level truth lives in code, never duplicated here.

## Domains → modules

| Domain | Model module(s) | Tables |
|---|---|---|
| Identity | `user.py` | `users` |
| Tenancy | `workspace.py`, `workspace_member.py` | `workspaces`, `workspace_members` |
| Projects | `project.py` | `projects` |
| Requirements | `requirement.py` (+ contract columns) | `requirements`, `data_contracts` |
| Architecture | `architecture.py` | `architectures` (nodes/edges JSON) |
| Pipelines | `pipeline.py`, `pipeline_node.py`, `pipeline_run.py` | `pipelines`, `pipeline_nodes`, `pipeline_runs` |
| Incidents | `incident.py` (+ healing runs) | `incidents`, `healing_runs` |
| Governance | `approval.py`, `audit_log.py` | `approvals`, `audit_logs` |
| Agents | `agent_run.py`, `agent_stage_run.py` | `agent_runs`, `agent_stage_runs` |
| Knowledge | `knowledge_document.py`, `knowledge_chunk.py` | `knowledge_documents`, `knowledge_chunks` |
| Platform | `connection.py`, `mcp_integration.py`, `notification.py`, (`tasks`) | `connections`, `mcp_integrations`, `notifications`, `tasks` |

Totals as deployed to Supabase: **22 tables · 66 indexes · 35 FKs**.

## Shared column conventions

- UUID PKs (`uuid.uuid4` defaults); `created_at`/`updated_at` UTC.
- Status columns are Python `str,Enum`s re-exported from `app.models`
  (`AgentRunStatus`, `StageStatus`, `UserRole`, `WorkspaceRole`,
  `IncidentStatus`, ...) — API consumers see the string values.
- Structured payloads are JSON columns: `agent_runs.outputs`,
  `agent_runs.stages`, blueprint `nodes`/`edges`, contract spec, RCA results.

## Verification

`tests/test_migrations.py` pins migration/head consistency; `tests/test_database.py`
covers engine/session behavior; the Phase A `db_verify` script checks the live
Supabase shape (tables/indexes/FKs) — the same numbers this doc quotes.
