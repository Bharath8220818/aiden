# Backend — AIDEN

FastAPI backend for AIDEN: authentication, pipeline management, the AI multi-agent system, Tool Gateway connectors, MCP tool server, incidents, projects, memory, monitoring, and health checks.

---

## Prerequisites

- Python 3.11+ (3.13 tested)
- `pip`
- Optional (full platform): PostgreSQL, Redis, Qdrant, MinIO — otherwise SQLite + in-memory fallbacks work for local dev

---

## Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
copy .env.example .env         # edit as needed
```

---

## Database

```bash
alembic upgrade head
python scripts\seed_user.py    # seeds admin@example.com / demo@example.com
```

---

## Run

```bash
set PYTORCH_NO_CUDA=1          # Windows: avoids slow PyTorch import
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- API: `http://localhost:8000`
- OpenAPI docs: `http://localhost:8000/docs`

---

## Environment variables

Defined in `backend/.env.example`:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | SQLite (dev) or PostgreSQL/Supabase pooler (prod) |
| `REDIS_URL` | Redis for cache, Celery, event bus, hot memory layer |
| `QDRANT_URL` / `QDRANT_ENABLED` | Vector DB for RAG memory |
| `JWT_SECRET_KEY`, `JWT_ALGORITHM`, `JWT_EXPIRE_MINUTES` | Auth |
| `HF_TOKEN` | HuggingFace model downloads |
| `LLM_BASE_URL`, `LLM_MODEL`, `EMBEDDING_MODEL` | LLM (Ollama/TinyLlama) + MiniLM embeddings |
| `INTENT_ADAPTER_PATH` | Fine-tuned LoRA adapter (auto-loads from `models/`) |
| `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET` | S3-compatible storage |
| `SEED_ADMIN_PASSWORD`, `SEED_DEMO_PASSWORD` | Seeded demo credentials |

> Supabase notes: use the **pooler** host (direct host is IPv6-only) and keep `statement_cache_size=0` (pgbouncer limitation). Both are already configured.

---

## Architecture overview

```
app/
├── api/v1/          34 routers (31 wired in main.py):
│                    auth, supabase_auth, pipelines, executions, agents,
│                    agent_execution, approvals, architecture, analytics,
│                    audit, alerts, connections, environments, incidents,
│                    projects, webhooks, admin, memory, metrics, mcp,
│                    monitoring, tools, multimodal, voice, websocket, ...
├── agents/          11 v2 agents + orchestrator_agent_v2 + registry
│                    (pipeline, sql, debug, monitoring, extraction,
│                     self_healing, architecture, intent, governance,
│                     security, streaming + legacy v1 agents)
├── tools/           Tool Gateway — v2 connectors: Airflow, Kafka,
│                    PostgreSQL, dbt, Spark (test/health/list/get/
│                    execute/logs/metrics interface)
├── services/        mcp_server (tools + RBAC + risk engine), event_bus,
│                    risk_engine, planner, cost_tracker, model_registry,
│                    notification_router, prompt_manager, executor
├── rag/             document_processor, retriever, vector_store,
│                    memory_manager (3-layer: Redis/PostgreSQL/Qdrant)
├── plugins/         plugin_manager with builtin/ and custom/ plugins
├── models/          SQLAlchemy models (pipeline, agent_run, alert,
│                    connection, incident, project, environment, ...)
├── schemas/         Pydantic schemas
└── core/            config, security, celery_app, redis_client,
                     connection_manager
```

Key flows:
- **NL → pipeline:** `POST /api/v1/pipelines/from-prompt` → Intent Agent (AI + rule reconcile) → Pipeline Agent → DRAFT pipeline
- **Agent execution:** `POST /api/v1/agent_execution/run` → orchestrator routes to the right v2 agent → fallback execution if the LLM is unavailable
- **MCP tools:** `GET /api/v1/mcp/tools` lists connector capabilities as tools; `POST /api/v1/mcp/execute` enforces RBAC + risk-based approval before any connector call
- **Real-time:** `WS /api/v1/ws/{client_id}` streams agent activity

---

## Development commands

```bash
pytest                                      # test suite
python scripts\download_models.py           # local model weights
python scripts\train_agent.py --agent intent --data data/intent_dataset_v3.jsonl
python scripts\evaluate_intent.py           # parse-accuracy harness
python scripts\collect_feedback.py          # feedback → dataset loop
python scripts\fetch_public_datasets.py     # sql-create-context + spider
```

---

## Notes

- CORS is configured for common localhost origins; prefer `127.0.0.1` over `localhost` in frontend env to avoid IPv6 issues.
- Docker Compose starts the backend via `backend/docker-entrypoint.sh`.
- WebSocket endpoint: `/api/v1/ws/{client_id}`; Prometheus metrics: `/api/v1/metrics` (prometheus-client).
- Tests force `QDRANT_ENABLED=false` for hermetic runs.
