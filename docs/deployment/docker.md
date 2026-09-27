# Docker

## The Phase B stack (`docker-compose.yml`, repo root)

Single command, full platform:

```bash
docker compose up -d --build
docker compose ps        # every service healthy
```

| Service | Image | Port | Notes |
|---|---|---|---|
| `postgres` | postgres:16-alpine | 5433 (psql only) | `aiden`/`aiden_local`, healthcheck `pg_isready` |
| `redis` | redis:7-alpine | internal | no persistence (cache/bus) |
| `qdrant` | qdrant/qdrant | internal | RAG vectors, volume `aiden-qdrant` |
| `ollama` | ollama/ollama | internal | auto-pulls `nomic-embed-text` (edge network egress for the pull) |
| `backend` | built `./backend` | **8001** | runs `alembic upgrade head && uvicorn` |
| `frontend` | built `./frontend` (nginx) | **5174** | static SPA + `/api` proxy → backend:8000 |

Network isolation: postgres/redis/qdrant/ollama sit on an `internal` network
with **no published ports** — only the backend reaches them. The goal state:
`/health/full` reports `ok` for all four optional services.

## Backend image (`backend/Dockerfile`)

python-slim + `requirements.lock.txt`, non-root uvicorn; compose overrides
env (`DATABASE_URL`, `REDIS_URL`, `QDRANT_URL`, `OLLAMA_URL`, dev-safe
`SECRET_KEY`/`JWT_SECRET` — never point compose at production data).

## Gateway nginx (`infrastructure/nginx/`)

Canonical gateway config (rate-limit zones auth/api/static, security headers,
`/api` + `/ws` proxying). The legacy `backend/nginx/` copy serves the
backend-only compose until retirement; do not edit both — PRs change
`infrastructure/nginx/` and mirror deliberately.

## Environment-specific overrides (`infrastructure/docker/`)

`development/`, `staging/`, `production/` hold compose override files
(`docker compose -f docker-compose.yml -f infrastructure/docker/<env>/overrides.yml up`).
Staging/production overrides inject real secrets from the environment —
never committed.

## Common operations

```bash
docker compose logs -f backend          # boot + migration logs
docker compose exec backend alembic current
docker compose down -v                  # full reset (drops volumes)
```
