# AIDEN — Autonomous Data Engineering Platform

AIDEN is an AI-assisted platform for designing, deploying, monitoring, and
self-healing data pipelines: describe what you need, get a validated
architecture and generated pipeline, deploy it through a governance approval
gate, and let the platform detect, diagnose, and heal failures.

## Repository layout

```
├── frontend/                     React 18 + TypeScript + Vite SPA (14 feature routes)
│   ├── src/features/             Domain modules (overview, requirements, architecture,
│   │                             pipelines, pipelineManager, monitoring, incidents,
│   │                             self-healing, sql, connections, intelligence, governance,
│   │                             team, auth) — each with hooks/services/types
│   ├── src/services/             Axios client (JWT interceptor) + WebSocket client
│   ├── e2e/                      Playwright suites (closed loop + auth/RBAC/healing journeys)
│   └── playwright.config.ts
├── backend/                      FastAPI + SQLAlchemy 2 async + Alembic
│   ├── app/api/v1/               24 routers · 121 endpoints · WebSocket /ws
│   ├── app/ai/                   model layer (11 agents → 4 bases → LoRA adapters),
│   │                             multimodal router, RAG package, JSONL datasets
│   ├── app/core/                 config, security, permissions (RBAC catalog), errors
│   ├── app/services/             domain services incl. ai_client (Ollama), event_bus
│   ├── migrations/               Alembic (schema source of truth)
│   ├── scripts/                  seed_database.py · aiden_loop_demo.py · eval_models.py
│   ├── data/datasets/            per-agent JSONL eval/train sets (+ runs/ reports)
│   └── tests/                    235 pytest tests (httpx ASGI, in-memory SQLite)
├── ml/                           Training/eval workspace: frozen agent contracts (agents.json),
│                                 preprocessing (80/10/10 splits), LoRA/QLoRA training,
│                                 per-agent metrics + baseline runner
├── docs/                         architecture/ · api/ · agents/ · database/ ·
│                                 deployment/ · testing/ + API_CONTRACT_MATRIX.md
├── infrastructure/               nginx gateway · airflow · qdrant/redis/postgres/minio ·
│                                 docker/{development,staging,production} overrides
├── database/                     pointer only — schema lives in Alembic (no parallel SQL)
├── scripts/                      setup.ps1/.sh · start-dev/stop-dev · health-check.py
├── docker-compose.yml            Phase B local stack (pg, redis, qdrant, ollama, api, frontend)
├── Makefile · CONTRIBUTING.md · LICENSE · .env.example · .vscode/
└── .github/workflows/            ci.yml (backend+frontend+ml) · deploy-verify.yml (14-gate smoke)
```

## Quick start

**Backend** (Python 3.11+, SQLite for local dev):

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
alembic upgrade head
python -m scripts.seed_database
python -m uvicorn app.main:app --reload     # http://localhost:8000/docs
```

**Frontend** (Node 20+):

```powershell
cd frontend
npm install
copy .env.example .env        # defaults: VITE_ENABLE_MOCK_DATA=false (real backend)
npm run dev                   # http://localhost:5173
```

**Demo accounts** (seeded by `scripts.seed_database`):

| Email                  | Password   | Role     |
|------------------------|------------|----------|
| `admin@acmedata.io`    | `admin123` | admin    |
| `bharath@acmedata.io`  | `lead123`  | lead     |
| `engineer@acmedata.io` | `eng123`   | engineer |
| `analyst@acmedata.io`  | `view123`  | viewer   |

Optional real-AI mode: run [Ollama](https://ollama.com) locally and set
`OLLAMA_ENABLED=true` (`OLLAMA_URL`, `OLLAMA_MODEL` in `backend/.env.example`).
Requirement analysis, architecture generation, and the SQL assistant then use
the LLM with automatic heuristic fallback when it is unreachable.

## Testing

```powershell
# Backend (98 tests)
cd backend && venv\Scripts\python.exe -m pytest

# Frontend (41 tests) + lint + typecheck + build
cd frontend && npm test && npm run lint && npx tsc -b && npm run build

# Playwright E2E — requires backend :8000 (seeded) and frontend dev server
cd frontend && npx playwright test          # 13 tests: closed loop + journeys
```

The flagship E2E (`frontend/e2e/closed-loop.spec.ts`) executes the full AIDEN
loop against the real stack: login → dashboard → requirement → architecture →
pipeline fleet → monitoring → incident → self-healing → approval gate →
success, plus RBAC checks for all four roles.

## Status

- **Verified:** every frontend domain runs on real backend APIs (JWT auth,
  RBAC, WebSocket events); the closed loop executes end-to-end and is
  Playwright-verified. See `docs/API_CONTRACT_MATRIX.md` for the per-endpoint
  matrix and `PROJECT_STATUS.md` for the phase log.
- **Honest boundary:** pipeline execution, monitoring telemetry, connection
  adapters, agent-driven healing, RAG, and MCP are contract-complete with
  deterministic implementations — the B-phase roadmap in
  `backend/README.md` tracks swapping in real integrations without frontend
  changes.
