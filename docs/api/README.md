# AIDEN API Reference

Base URL: `/api/v1` (local `http://localhost:8000`, prod
`https://aiden-backend-fq08.onrender.com`). Interactive docs: `/docs`
(Swagger, `openapi_url={prefix}/openapi.json`). **121 endpoints across 24
routers** (counted from the live app).

## Conventions

- **Auth**: `Authorization: Bearer <jwt>` (HS256, 8 h). Obtain via
  `POST /auth/login` (response `{user, token, expiresAt}`). WebSocket uses
  `?token=` query (browsers can't set headers on WS).
- **Errors**: uniform envelope —
  `{ "error": { "code", "message", "request_id" }, "message" }` with honest
  status codes (401 unauthenticated, 403 forbidden, 404 not found,
  409 conflict, 422 validation, 429 rate-limited). Verified by
  `tests/test_errors.py` and the Phase A smoke.
- **Permissions**: every route declares one (e.g. `agent.read`,
  `pipeline.execute`, `approval.approve`); viewer/engineer/lead/admin map in
  `app/core/permissions.py`. Workspace-role grants intersect for
  workspace-scoped routes.
- **Tenancy**: workspace/project-scoped routes resolve membership server-side;
  cross-tenant ids 404.
- **Degradation**: AI-backed endpoints answer deterministically without
  Ollama (`source: heuristic`), optional integrations report
  `not_configured` — API shapes never change with infra state.

## Files

| Doc | Router tag |
|---|---|
| [authentication.md](authentication.md) | auth (+ register, users/me) |
| [projects.md](projects.md) | projects (+ import) |
| [requirements.md](requirements.md) | requirements (+ analyze, contract) |
| [architectures.md](architectures.md) | architecture (blueprint/generate/templates) |
| [pipelines.md](pipelines.md) | pipelines CRUD + generate/deploy |
| [executions.md](executions.md) | run/execute, task instances, logs |
| [monitoring.md](monitoring.md) | monitoring + drift + platform pulse |
| [incidents.md](incidents.md) | incidents (diagnose/fix/resolve) |
| [self-healing.md](self-healing.md) | healing advance + sandbox |
| [knowledge.md](knowledge.md) | knowledge (RAG documents/retrieve/status) |
| [agents.md](agents.md) | agents fleet + orchestrator + model layer |
| [approvals.md](approvals.md) | approvals + audit (+ team members) |
| [integrations.md](integrations.md) | MCP integrations (+ notification channels) |
