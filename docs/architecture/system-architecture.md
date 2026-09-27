# AIDEN System Architecture

AIDEN is an AI-assisted platform for designing, deploying, monitoring, and
self-healing data pipelines. Users describe what they need (text, diagram,
audio, SQL, document); agents produce a validated architecture and generated
pipeline; deployment passes a governance approval gate; and the platform
detects, diagnoses, and heals failures in a closed loop.

## High-level topology

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENT (React 18 + Vite SPA)          │
│   Requirement Studio · Architecture Canvas · Pipelines ·     │
│   Monitoring · Incidents/Self-Healing · SQL · Governance     │
└──────────────┬───────────────────────────────┬───────────────┘
               │ HTTPS  /api/v1/*              │ WSS /api/v1/ws
               ▼                               ▼
┌──────────────────────────────┐   ┌──────────────────────────┐
│  Vercel (static + proxy)     │   │  Render (FastAPI)        │
│  frontend/vercel.json rewrites│  │  uvicorn + rate limiting │
│  /api/v1/* → Render backend  │   │  + JWT/RBAC + WS bus     │
└──────────────────────────────┘   └───────┬──────────────────┘
                                           │
                     ┌─────────────────────┼─────────────────────┐
                     ▼                     ▼                     ▼
          ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
          │ Supabase Postgres│   │ Redis (Phase B)  │   │ Qdrant (Phase B) │
          │ 22 tables, RBAC  │   │ cache / rate     │   │ vector store for │
          │ FKs, 66 indexes  │   │ limit / events   │   │ RAG memory       │
          └──────────────────┘   └──────────────────┘   └──────────────────┘
                     ▲
                     │ via IPv4 session pooler
          ┌──────────┴─────────┐
          │ Ollama (Phase B)   │  Qwen3 / Qwen2.5-Coder / Qwen2.5-VL / Whisper
          │ model layer        │  4 bases · 9 LoRA adapters · 11 agents
          └────────────────────┘
```

Deployment reality (not aspirational): the production frontend runs on Vercel
(`aiden-orcin.vercel.app`, Root Directory `frontend/`), the API on Render
(`aiden-backend-fq08.onrender.com`), and the database on Supabase
(ap-southeast-1) reached through its IPv4 **session pooler** — the direct
`db.*.supabase.co` host is IPv6-only, which Render cannot egress to.

## Component inventory (source of truth)

| Concern | Lives in | Notes |
|---|---|---|
| HTTP API (121 endpoints, 24 routers) | `backend/app/api/v1/` | mounted under `/api/v1` in `app/main.py` |
| Domain models (22 tables) | `backend/app/models/` | SQLAlchemy 2 async; Alembic head `d6e7f8a9b0c1` |
| Pydantic contracts | `backend/app/schemas/` | request/response shapes |
| Domain services | `backend/app/services/` | business logic incl. orchestrator, ai_client, model_service |
| AI model layer | `backend/app/ai/models/` | 11 agents → 4 bases → LoRA adapters registry + router |
| RAG package | `backend/app/ai/rag/` | chunking, hybrid retrieval + RRF, reranker |
| Eval datasets | `backend/app/ai/datasets/` + `backend/data/datasets/` | JSONL scaffold + eval harness |
| Training workspace | `ml/` | contracts (`agents.json`), preprocessing, LoRA training, eval |
| SPA | `frontend/src/` | feature-first layout, Zustand stores, WS client |
| Infra (local Phase B stack) | `docker-compose.yml` + `infrastructure/` | postgres/redis/qdrant/ollama, nginx gateway |
| CI | `.github/workflows/` | `ci.yml`, `deploy-verify.yml` (14-gate smoke) |

## The closed loop

```
requirement (text/image/audio/doc/sql)
      │  modality routing (backend/app/ai/models/router.py)
      ▼
Requirement Agent ──► normalized requirement JSON + ODCS data contract
      ▼
Architecture Agent ──► blueprint (nodes/edges from curated templates)
      ▼
Pipeline Planner ──► pipeline spec (stages, tasks)
      ▼
SQL + Code Agents ──► SQL, Python/Airflow/dbt artifacts
      ▼
Validation (deterministic validators + LLM assist)  ──fail──► RCA Agent
      │ pass                                                     │
      ▼                                                          ▼
Governance approval gate                              Self-Healing Agent
      │ pass                                              (patch → sandbox → test)
      ▼                                                          │
Deployment (Airflow adapter)                        human approval ──► re-run
      ▼
Monitoring ──► drift/anomaly detection ──► incidents ──► (loop)
```

Every agent action on the outside world goes through the **ToolRegistry**
(`backend/app/services/tool_registry.py`) — permission + risk + audit — never
direct side effects. LLM output never deploys directly.

## Source-of-truth rules (one system per concern)

- **Team/membership** — `workspace_members` in Postgres only; the FastAPI team
  endpoints and the React Team UI are views of it. No parallel stores.
- **Project context boundary** — `workspace → project → project_id`; every
  requirement, architecture, pipeline, run, incident, and knowledge document
  carries the `project_id` foreign key.
- **Agent↔model mapping** — `backend/app/ai/models/registry.py` at serving
  time, `ml/agents.json` at training time; `backend/tests/test_ml_contract_sync.py`
  fails CI on drift.
- **Schema** — Alembic migrations only. `database/` (if used) must reference
  them, never restate them.

## Degradation philosophy

Optional services (Redis, Qdrant, Ollama, Airflow, SMTP/Slack/Teams/Jira)
report `not_configured` in `/health/full` and their callers fall back to
deterministic behavior. The UI never breaks because an AI backend is absent:
`/agents/model/run` answers with an honest `heuristic` source tag, the
requirement analyzer tags `source: heuristic`, and execution adapters report
`mode: unavailable` rather than pretending.
