# Integration Tests

Backend tests run as a real FastAPI app over in-memory SQLite — so most
"unit" files are actually thin integration tests (HTTP → auth → service →
DB → response).

## Suites that cross boundaries

| File | Boundary covered |
|---|---|
| `test_auth.py`, `test_users.py`, `test_permissions.py` | JWT → RBAC → route handlers (401/403 semantics) |
| `test_workspaces.py`, `test_projects.py` | tenancy chain: membership → workspace → project scoping |
| `test_requirements.py` | multimodal analyze → contract persistence (AI + heuristic engines) |
| `test_architecture_blueprint.py` | blueprint generate → template topology → persistence |
| `test_ai_and_events.py` | AI fallbacks + WS event broadcasts on healing/approval actions |
| `test_phase11_rag_orchestrator.py` | orchestrator run → stage rows → governed tool calls |
| `test_rag_ai_package.py` | chunking → retrieval → reranker contracts |
| `test_tool_registry.py`, `test_tool_approval_gate.py` | permission + risk + approval gating on agent actions |
| `test_integration_sprint.py`, `test_integration_gateway.py` | Airflow adapter modes, notification channels, MCP registry |
| `test_database.py`, `test_migrations.py` | engine/session behavior, migration-head consistency |
| `test_overview.py`, `test_platform_pulse.py`, `test_workspace_chat.py` | aggregation surfaces reading live rows |

## Running

```bash
cd backend
venv/Scripts/python.exe -m pytest tests            # whole suite (235)
venv/Scripts/python.exe -m pytest tests/test_tool_registry.py -q
DATABASE_URL="sqlite+aiosqlite:///:memory:" python -m pytest tests  # CI parity
```

## External services

Stubbed by design — no Ollama/Redis/Qdrant/Airflow in CI. Engines with
fallbacks are asserted in *fallback mode*; live-integration behavior is the
smoke harness's job against a real deployment (`docs/testing/e2e-tests.md`).
