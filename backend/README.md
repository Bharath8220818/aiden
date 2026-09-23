# AIDEN Backend

FastAPI backend for the **AIDEN (Autonomous Data Engineering)** platform.

- **Stack:** FastAPI · SQLAlchemy 2 async · asyncpg · Alembic · Pydantic v2 · PyJWT · bcrypt
- **Target DB:** PostgreSQL 16 (also runs against SQLite for local dev/tests)
- **Docs:** `/docs` (Swagger), `/redoc`

---

## Status (as of 2026-09-13)

The full API surface the frontend consumes is implemented, contract-tested, and
verified end-to-end (Playwright runs against the live stack with
`VITE_ENABLE_MOCK_DATA=false`). See `../docs/API_CONTRACT_MATRIX.md` for the
per-endpoint matrix.

| Phase | Scope | Status |
|-------|-------|--------|
| 0 — Foundation | FastAPI app · config · async DB · health · errors · logging · security · Docker | ✅ |
| 1 — Core domain | Models · Alembic · schemas · repositories · services · CRUD · seed | ✅ |
| 2 — Auth / RBAC | JWT auth, permission catalog, workspace+system role axes, resource chain, approval gate | ✅ |
| 3 — API architecture | Error envelope, dependency injection, 17 routers, WebSocket channel | ✅ |
| 4 — Requirements | CRUD + `/analyze` (AI-first with heuristic fallback) + contract generation | 🟡 contract-complete |
| 5 — Architecture | Blueprint/templates + `/generate` (AI-assisted, deterministic fallback) | 🟡 contract-complete |
| 6 — Pipelines | CRUD + fleet + detail + generate + run + deploy approval gate | 🟡 contract-complete |
| 7 — SQL | Databases, execute, explain, optimizer, assistant (AI-first) | 🟡 contract-complete |
| 8 — Connections | Provider catalog + CRUD + test | 🟡 contract-complete |
| 9 — Monitoring | Services, series, Kafka lag, quality, alerts + acknowledge | 🟡 contract-complete |
| 10 — Incidents | List, diagnose, fix, sandbox test, heal advance, resolve | 🟡 contract-complete |
| 11 — Self-Healing | 10-stage state machine wired to approvals + WebSocket events | 🟡 contract-complete |
| 12 — Knowledge/RAG | Docs + retrieve endpoints | 🟡 contract-complete |
| 13 — MCP | Registry + status endpoints | 🟡 contract-complete |
| 14 — Governance | Approvals queue + decisions + audit trail + team management | ✅ (team/governance on real DB) |
| 15 — Orchestrator | Intent → planner → agent-selection loop | 🔴 pending |
| 16 — Production | Postgres prod, Redis, vector store, secrets, CI/CD, rate limiting | 🔴 pending |

### What "contract-complete" means (honest assessment)

The 🟡 domains are **fully wired**: every route exists, request/response shapes
match the frontend exactly, auth/RBAC is enforced, loading/error/empty states
work, and the closed loop runs end-to-end. However, their backing services are
**deterministic operational implementations**, not production integrations yet:

- **Pipelines** — code generation / fleet projection (PySpark, SQL, DAG, Kafka
  scaffolding), not a live Airflow/Spark/Kafka execution platform.
- **Monitoring** — simulated telemetry series; no real observability collectors.
- **Connections** — provider catalog + stored connection registry; no live
  database/cloud adapters.
- **Self-Healing** — the state machine, sandbox testing, and approval flow are
  real, but diagnosis/fix generation is rule-based, not agent-driven.
- **AI** — `services/ai_client.py` integrates Ollama with graceful heuristic
  fallback for requirements/analyze, architecture/generate, and sql/assistant;
  the full multi-agent orchestrator is not built yet.
- **RAG / MCP** — registry + retrieval endpoints exist; no vector store or
  actual MCP client execution.

These are the B-phase workstreams tracked in the roadmap below. The contracts
are frozen, so swapping in real implementations does not touch the frontend.

---

## Quick start (local, SQLite)

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt

copy .env.example .env   # set DATABASE_URL to a PostgreSQL URL for prod

alembic upgrade head
venv\Scripts\python.exe -m scripts.seed_database   # demo users/workspaces/projects

# Run the API
venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Then open http://localhost:8000/docs and login via `POST /api/v1/auth/login`.

### Demo accounts (mirror the frontend login page)

| Email                  | Password   | Role      |
|------------------------|------------|-----------|
| `admin@acmedata.io`    | `admin123` | admin     |
| `bharath@acmedata.io`  | `lead123`  | lead      |
| `engineer@acmedata.io` | `eng123`   | engineer  |
| `analyst@acmedata.io`  | `view123`  | viewer    |

---

## Project structure

```
backend/
├── app/
│   ├── main.py                  # entry point: CORS, error handlers, request middleware, WS
│   ├── core/                    # config, database, security, logging, exceptions,
│   │                            # permissions (RBAC catalog), dependencies
│   ├── api/v1/                  # 17 routers: health, auth, users, workspaces, projects,
│   │                            # requirements, architecture, pipelines, sql, connections,
│   │                            # monitoring, incidents, agents, knowledge, governance,
│   │                            # integrations, ws (+ overview)
│   ├── models/                  # SQLAlchemy models (file-per-model)
│   ├── schemas/                 # Pydantic API contracts (separate from models)
│   ├── repositories/            # data access layer
│   └── services/                # business logic (overview, fleet, analyzer, healing,
│                                # registry, ai_client, requirement_analyzer, event_bus…)
├── migrations/                  # Alembic (async env)
├── scripts/                     # seed_database.py, aiden_loop_demo.py (full closed loop)
├── tests/                       # pytest + httpx ASGI (98 tests)
├── requirements.txt · pytest.ini · Dockerfile · docker-compose.yml
└── .env.example                 # environment template (copy to .env)
```

---

## API surface

Prefix: `/api/v1` · 83 endpoints · WebSocket at `/ws?token=<JWT>`

| Domain | Endpoints |
|--------|-----------|
| Health | `GET /health/healthz`, `GET /health/full` |
| Auth | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| Users | `POST /users/register` (no auth), `POST /users` (admin), `GET /users/me`, `GET /users` (admin) |
| Overview | `GET /overview` — dashboard aggregate |
| Workspaces | CRUD + `GET/POST/DELETE /workspaces/{id}/members` |
| Projects | CRUD (`/projects`) |
| Requirements | `POST /analyze`, CRUD, `POST /{id}/contract` |
| Architecture | `GET /blueprint`, `GET /templates`, `POST /generate` |
| Pipelines | CRUD, `GET /fleet`, `GET /{id}/detail`, `POST /generate`, `POST /{id}/run`, `POST /{id}/deploy` |
| SQL | `GET /databases`, `POST /execute`, `POST /explain`, `POST /optimize/suggestions`, `POST /assistant` |
| Connections | `GET /providers`, CRUD, `POST /test` |
| Monitoring | `GET /services`, `GET /series`, `GET /kafka/topics`, `GET /quality`, `GET /alerts`, `POST /alerts/{id}/acknowledge` |
| Incidents & Healing | `GET /incidents`, `POST /incidents/{id}/diagnose`, `POST /incidents/{id}/fix`, `POST /sandbox/test`, `POST /healing/{run_id}/advance`, `POST /incidents/{id}/resolve` |
| Agents | `GET /agents`, `GET /agents/swarm`, `POST /{id}/status`, `POST /{id}/grants` |
| Knowledge | `GET /knowledge/docs`, `POST /knowledge/retrieve` |
| Governance | `GET /approvals`, `POST /approvals/{id}/approve`, `POST /approvals/{id}/reject`, `GET /audit`, `GET/POST/PATCH/DELETE /team/members` |
| MCP | `GET /integrations/mcp`, `POST /integrations/mcp/{server_id}/status` |
| WebSocket | `/ws?token=` — platform events (pipeline, incident, healing, approval, info) |

Deploy never executes directly: `POST /pipelines/{id}/deploy` creates a pending
Approval (risk=high) and returns `409 APPROVAL_REQUIRED` for engineers; the
pipeline starts only after a lead/admin approves via `/governance/approvals`.

### Error contract

All errors use a stable envelope (also readable by the frontend):

```json
{
  "error": { "code": "PROJECT_NOT_FOUND", "message": "Project was not found", "request_id": "..." },
  "message": "Project was not found"
}
```

Codes: `VALIDATION_ERROR` (422), `UNAUTHORIZED`/`INVALID_CREDENTIALS` (401), `FORBIDDEN` (403),
`NOT_FOUND` (404), `CONFLICT` (409), `INTERNAL_ERROR` (500), plus domain codes like
`EMAIL_ALREADY_EXISTS`, `SLUG_ALREADY_EXISTS`, `APPROVAL_REQUIRED`.

---

## Environment variables

See `.env.example`. Key variables:

| Variable                       | Purpose                                   |
|--------------------------------|-------------------------------------------|
| `DATABASE_URL`                 | Async SQLAlchemy URL (`postgresql+asyncpg://…`) |
| `SECRET_KEY` / `JWT_SECRET`    | Signing secrets (generate in prod)        |
| `ACCESS_TOKEN_EXPIRE_MINUTES`  | JWT lifetime (default 480 = 8h)           |
| `CORS_ORIGINS`                 | Comma-separated allowed origins           |
| `OLLAMA_ENABLED` / `OLLAMA_URL` / `OLLAMA_MODEL` | Real AI for analyze/generate/assistant (heuristic fallback when off/unreachable) |
| `REDIS_URL` / `QDRANT_URL`     | Optional services (health checks; used by later phases) |

---

## Docker

```powershell
cd backend
copy .env.example .env          # or provide your own
docker compose up --build
# backend: http://localhost:8000/docs  · Postgres: localhost:5432 · Redis: 6379
docker compose exec backend alembic upgrade head
docker compose exec backend python -m scripts.seed_database
```

---

## Tests

```powershell
cd backend
venv\Scripts\python.exe -m pytest
```

Tests run against an in-memory SQLite DB (no server required) using httpx ASGI
transport and dependency overrides. Suites: health, database, users/auth,
workspaces, projects, permissions, Phase F domains (connections, monitoring,
incidents/healing, agents, knowledge, MCP, governance), AI fallback + event
broadcasting.

End-to-end closed loop (no pytest required, runs against a live server):

```powershell
venv\Scripts\python.exe -m scripts.aiden_loop_demo
```

Environment sanity-check:

```powershell
venv\Scripts\python.exe -m scripts.check_environment
```

---

## Frontend integration

1. Frontend API base targets `http://localhost:8000/api/v1` (`VITE_API_URL`).
2. `VITE_ENABLE_MOCK_DATA=false` in `frontend/.env` ships the real backend.
3. Login returns `{user, token, expiresAt}` — exactly the frontend's `AuthSession` shape.
4. Bearer token is auto-attached by the frontend and validated at `/users/me` /
   `/auth/me`; expired tokens produce `401` → frontend redirects to login.
5. WebSocket connects to `/ws?token=<JWT>` (query param, since browsers cannot
   set WS headers); invalid tokens are rejected with close code 4401.
6. The per-endpoint verification matrix lives in `../docs/API_CONTRACT_MATRIX.md`.

---

## Authorization model

- **Permissions** are explicit strings (`project.create`, `pipeline.deploy`, …)
  in `app/core/permissions.py` — never `if role == "admin"`.
- **Two role axes**: system role (`user.role`: viewer/engineer/lead/admin) and
  workspace membership role (`owner/admin/member/viewer`). Effective grants in a
  workspace = system ∪ membership; **non-members get nothing** (platform admins
  excepted).
- **Resource chain**: user → workspace → project → pipeline. Every project/pipeline
  route resolves the parent workspace and enforces scoped permissions;
  cross-workspace access returns 403.
- **Dangerous operations**: `POST /pipelines/{id}/deploy` never executes
  directly — it creates a pending Approval (risk=high) and returns
  `409 APPROVAL_REQUIRED`. Approval + execution require lead/admin
  (`approval.approve` / `pipeline.deploy`). Self-healing deployments flow
  through the same approval gate.

---

## Roadmap (B-phases)

- **B1 — Backend hygiene** ✅ README current, secrets ignored, lint/format (ruff),
  pre-commit, CI, dependency constraints.
- **B2 — API contract completion** ✅ all 17 domains wired and verified
  (see `../docs/API_CONTRACT_MATRIX.md`).
- **B3 — Real requirement intelligence** — multimodal input abstraction,
  prompt versioning, confidence scoring, structured JSON contracts persisted.
- **B4 — Orchestrator** — `app/ai/`: intent → requirement → planner → agent
  selection → execution → validation, with per-agent status streaming over `/ws`.
- **B5 — Real pipeline execution** — execution abstraction + Airflow/Spark/SQL/
  Kafka connectors, run/task state machines, logs, retries, cancellation.
- **B6 — Real connections** — credential vault + provider adapters
  (PostgreSQL first, then MySQL, Snowflake, BigQuery, Kafka, S3).
- **B7 — Monitoring** — telemetry collectors, alert engine, metrics/logs/traces.
- **B8 — Incident engine** — dedup, correlation, affected resources, MTTR.
- **B9 — Real self-healing** — agent-driven RCA/fix behind a tool registry +
  risk engine + sandbox (AI never gets unrestricted infrastructure access).
- **B10 — RAG / project memory** — chunking, embeddings, vector store,
  retriever with citations and project isolation.
- **B11 — MCP** — MCP client, tool catalogue, permission mapping, audit.
- **B12 — WebSocket hardening** — event IDs/versioning, reconnect+backoff,
  missed-event recovery, Redis pub/sub for multi-instance.
- **B13 — Production** — Postgres, Redis, Qdrant, secrets management, HTTPS,
  rate limiting, CI/CD, backups, deployment.
