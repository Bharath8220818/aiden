# Contributing to AIDEN

## Quick start

```bash
make install && make install-frontend   # or scripts/setup.ps1 on Windows
make dev-backend                        # terminal 1 → :8000
make dev-frontend                       # terminal 2 → :5173
make test                               # backend suite (235)
make ml-validate                        # frozen agent contracts
```

Demo accounts + full instructions: `docs/deployment/local-development.md`.

## Repository map

| Path | What |
|---|---|
| `backend/` | FastAPI + SQLAlchemy async (API, services, model layer `app/ai/models/`, RAG `app/ai/rag/`) |
| `frontend/` | React 18 + Vite SPA (feature-first under `src/features/`) |
| `ml/` | training/eval workspace (contracts, datasets, LoRA, metrics) |
| `docs/` | architecture / api / agents / database / deployment / testing references |
| `infrastructure/` | nginx, airflow, per-service config, env overrides |
| `docker-compose.yml` | Phase B local stack |

## Conventions

- **Python**: ruff (lint+format, line 110, py311 target); async SQLAlchemy;
  docstrings that say *why*. Run `make lint && make format` before pushing.
- **TypeScript**: eslint + strict tsc; feature-first modules; API shapes come
  from `backend/app/schemas/` — the contract matrix in
  `docs/API_CONTRACT_MATRIX.md` must stay true.
- **Commits**: conventional commits (`feat(scope):`, `fix(scope):`,
  `chore:`, `docs:`) — the repo history follows this.
- **Schema**: Alembic migrations only; never edit applied revisions.
- **Agent changes touch both registries**: `backend/app/ai/models/registry.py`
  **and** `ml/agents.json` (the sync test fails otherwise).

## The checkpoint rule (every change of substance)

```
IMPLEMENT → UNIT TEST → MODEL TEST → INTEGRATION TEST → FAILURE TEST → DOCUMENT → COMMIT
```

PRs should state which gates ran. Live-deployment changes additionally get
the 14-gate smoke (`make smoke URL=https://…`).

## PR checklist

- [ ] `make test` green; new behavior has tests (incl. failure paths)
- [ ] `make lint` / `make format` clean
- [ ] frontend changes: `make test-frontend` green
- [ ] agent/model changes: `make ml-validate` green + eval metrics re-run
- [ ] docs updated for anything architectural (this repo treats docs as part
      of the feature)
- [ ] no secrets committed (`.env` files are gitignored by design)
