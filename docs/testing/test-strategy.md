# Test Strategy

## Pyramid (as implemented)

| Layer | Where | Count / scope |
|---|---|---|
| Unit + API (backend) | `backend/tests/` (28 files) | **235 tests** — services, permissions, error envelope, RAG, orchestrator, model layer; httpx ASGI + in-memory SQLite |
| Contract sync | `backend/tests/test_ml_contract_sync.py` | ml contracts ↔ backend registry drift guard |
| ML workspace | `ml/tests/test_ml.py` | 19 tests — contracts, records, splits, metrics, baseline runner, adapter registry |
| Frontend unit | `frontend/src/**/*.test.*` (vitest) | services/hooks (status.service 14 tests, etc.) |
| E2E | `frontend/e2e/` (Playwright) | closed-loop + auth/RBAC/healing journeys |
| Live smoke | `backend/scripts/phase_a/smoke.py` | 14 gates against a running deployment (CI deploy-verify runs it) |
| Scheduled prod verify | `.github/workflows/deploy-verify.yml` | cron `17 */6 * * *` |

## Conventions

- Backend: pytest with `asyncio_mode=auto`; the `client` fixture overrides
  `get_db` onto in-memory SQLite (FKs on); no network, no Ollama —
  AI paths exercise their deterministic engines; rate-limiter store resets
  autouse per test.
- Naming: `test_<domain>.py`; helpers in `tests/helpers.py`
  (`seed_user`, `seed_workspace_with_member`).
- Frontend: vitest colocated with services/hooks; Playwright specs in
  `frontend/e2e/` run against a built preview (CI job optional).
- ML: fast, dependency-free (no torch); training paths tested as `--dry-run`
  + registry logic only.

## The checkpoint rule (per roadmap)

```
IMPLEMENT → UNIT TEST → MODEL TEST → INTEGRATION TEST → FAILURE TEST → DOCUMENT → COMMIT
```

Every phase landed this way; failure tests include: 401/403/422/404 envelope
(`test_errors.py`), viewer-write 403 (smoke S10), tool denial paths
(`test_tool_registry.py`), approval-gate blocks (`test_tool_approval_gate.py`),
healing-advance event broadcasts (`test_ai_and_events.py`).

## What is NOT tested by design

Real LLM quality (covered by `ml/evaluation/` metrics, not pytest), Airflow
executor calls (adapter mocked / `mode: unavailable`), external MCP
channels (permission checks tested, delivery not).
