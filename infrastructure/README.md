# Infrastructure

Per-service configuration for the AIDEN runtime. The **active local stack
definition is the root `docker-compose.yml`** (Phase B: postgres, redis,
qdrant, ollama + backend + frontend-nginx); this directory holds the
per-service config that stack and future environments consume.

## Layout

| Path | Purpose | State |
|---|---|---|
| `nginx/nginx.conf` | **Canonical** API-gateway/SPA config (rate-limit zones auth/api/static, security headers, `/api` + `/ws` proxy) | active — mirror into `backend/nginx/` only deliberately |
| `nginx/snippets/` | reusable server snippets (security / rate-limit / websocket) as they are extracted | scaffolding |
| `airflow/` | Airflow runtime: `dags/` (deployed DAG write target), Dockerfile, plugins, config, requirements | Sprint 4 (executor integration next) |
| `qdrant/` | collection + service config for the RAG vector store | Phase B (compose uses default image config today) |
| `redis/` | redis.conf overrides (persistence policy, limits) | Phase B (compose runs ephemeral defaults) |
| `postgres/` | init SQL for self-hosted installs (Supabase is the prod host; Alembic owns schema) | reference |
| `minio/` | artifact storage init (Phase B+ artifact service) | placeholder |
| `docker/{development,staging,production}/` | compose override files per environment | development seeded; staging/production hold secrets only via env |

## Rules

1. **One canonical copy per config.** `backend/nginx/` is legacy and kept
   working for the backend-only compose until retirement — changes land here
   first, mirrored with intent (noted in the PR).
2. **Schema never lives here.** Database shape is Alembic
   (`backend/migrations/`) — `postgres/init/` may only create roles/databases,
   never tables.
3. **Secrets only via environment.** Staging/production override files
   reference env vars; nothing secret is committed.
4. **Frontend deploy config is separate.** Vercel config is
   `frontend/vercel.json` (+ committed `frontend/.env.production`) — see
   `docs/deployment/production.md`.
