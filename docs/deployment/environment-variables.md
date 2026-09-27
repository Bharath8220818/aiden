# Environment Variables

Backed by `backend/app/core/config.py` (pydantic-settings; `.env` in
`backend/`, case-insensitive) and `frontend/.env*` (Vite).

## Backend — application

| Var | Default | Notes |
|---|---|---|
| `ENVIRONMENT` | development | `production` triggers the boot guard |
| `DEBUG` | false | must be false in production |
| `LOG_LEVEL` | INFO | |
| `API_PREFIX` | /api/v1 | |
| `SECRET_KEY` / `JWT_SECRET` | insecure-dev placeholders | **real values required in prod** (guard enforces) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 480 | 8 h session |
| `CORS_ORIGINS` | localhost:5173 pair | comma-separated |
| `RATE_LIMIT_PER_MINUTE` | 60 | per IP |

## Backend — data & services

| Var | Default | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://postgres:postgres@localhost:5432/aiden` | `postgres://` schemes auto-rewritten to asyncpg; SQLite `sqlite+aiosqlite:///./aiden_dev.db` for local dev |
| `REDIS_URL` | — | Phase B cache/limiter; unset → `not_configured` |
| `QDRANT_URL` | — | RAG vector store; unset → keyword retrieval only |
| `OLLAMA_URL` | — | model transport; unset → deterministic engines everywhere |
| `AI_MODEL` | llama3.1 | legacy default; routing now resolves per-agent tags |
| `AI_EMBEDDING_MODEL` | nomic-embed-text | RAG embeddings |
| `AIRFLOW_URL` / `AIRFLOW_USERNAME` / `AIRFLOW_PASSWORD` | — | execution adapter; unset → `mode: unavailable` |
| `AIRFLOW_DAGS_FOLDER` | /opt/airflow/dags | DAG write target |
| `FRONTEND_URL` | — | absolute links in notifications |

## Backend — integration channels (all optional, degrade independently)

`SMTP_HOST/PORT/TLS/USERNAME/PASSWORD/FROM` · `SLACK_WEBHOOK_URL` ·
`TEAMS_WEBHOOK_URL` · `JIRA_URL/EMAIL/API_TOKEN/PROJECT_KEY`

## Frontend (Vite — build-time only)

| Var | File | Notes |
|---|---|---|
| `VITE_ENABLE_MOCK_DATA` | `.env` | `false` = real API (mock layer off) |
| `VITE_API_URL` | `.env*` | `http://localhost:8000/api/v1` dev; `/api/v1` prod (same-origin via Vercel rewrite) |
| `VITE_WS_URL` | `.env*` | `ws://localhost:8000/api/v1/ws` dev; **direct** `wss://…onrender.com/api/v1/ws` prod (Vercel can't proxy WS) |

Prod values ship via the committed `frontend/.env.production`
(gitignored by default; force-added intentionally — see
`docs/deployment/production.md`).

## Compose-only (docker-compose.yml)

`POSTGRES_USER/PASSWORD/DB` (aiden / aiden_local / aiden), service-internal
URLs, and dev-safe secrets — the compose stack is a development environment;
staging/prod overrides come from `infrastructure/docker/<env>/` +
platform env vars.
