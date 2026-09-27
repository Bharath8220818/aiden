# AIDEN Deployment Architecture

## Current live stack (verified)

| Piece | Provider | Detail |
|---|---|---|
| Frontend | **Vercel** | `aiden-orcin.vercel.app`, Root Directory `frontend/`, build via Vite |
| API | **Render** | `aiden-backend-fq08.onrender.com`, uvicorn, `ENVIRONMENT=production` |
| Database | **Supabase** | ref `whjstcclxklikppvvwfr` (ap-southeast-1), via IPv4 session pooler |
| Migrations | Render boot | `alembic upgrade head` before serve |
| CI | GitHub Actions | `ci.yml` (ruff+pytest, eslint+vitest+build, ml contracts) + `deploy-verify.yml` |

## Request path

```
Browser ──HTTPS──► Vercel (static SPA + rewrites /api/v1/* → Render)
        ──WSS────► Render directly (Vercel rewrites cannot proxy WS upgrades)
                     VITE_API_URL  = /api/v1            (same-origin via proxy)
                     VITE_WS_URL   = wss://...onrender.com/api/v1/ws  (direct)
```

Deploy mechanics that matter (hard-won lessons):
- `frontend/vercel.json` is the effective config — a root-level `vercel.json`
  is ignored when Root Directory is set.
- `env` blocks in vercel.json are **not** injected into Vite builds; the
  production env ships as the committed `frontend/.env.production`
  (git add -f, gitignored by default via `.env.*`).
- The deployed bundle is verified by the `/status` page (build-config
  inspector) and the deploy-verify smoke.

## Deploy-verify CI (`.github/workflows/deploy-verify.yml`)

- cron `17 */6 * * *` + `workflow_dispatch` (optional `base_url` input).
- Runs `python -m scripts.phase_a.smoke --base-url <url>`: the 14-gate
  acceptance harness (liveness, register/login/me, 401s, workspace/project/
  requirement/pipeline/run creation, knowledge retrieve, viewer-write 403).
- A "PASS" is **14/14 gates** against the live deployment; any red gate fails
  the workflow.

## Local Phase B stack (`docker-compose.yml`)

```
docker compose up -d --build
# frontend  http://localhost:5174   (nginx → static SPA + /api proxy)
# backend   http://localhost:8001
# internal network (no published ports): postgres :5433 (psql only),
# redis, qdrant, ollama (auto-pulls nomic-embed-text)
curl http://localhost:8001/api/v1/health/full
# → database/redis/qdrant/ollama all "ok"
```

- Backend boots with `alembic upgrade head && uvicorn`.
- The Phase B goal state is `/health/full` reporting `ok` for all four
  optional services (locally they are `not_configured` without compose).

## `infrastructure/` layout (source of truth per concern)

| Path | Purpose |
|---|---|
| `infrastructure/nginx/` | nginx gateway config (single entry: SPA + `/api` + `/ws`, rate-limit zones, security headers) — the **canonical** copy; `backend/nginx/` remains for the backend-only compose until retirement |
| `infrastructure/airflow/` | Airflow runtime (Dockerfile, dags/, plugins/, config/) for Sprint 4 execution |
| `infrastructure/qdrant/`, `redis/`, `postgres/`, `minio/` | per-service config/init when needed beyond images |
| `infrastructure/docker/` | environment-specific compose overrides (development/staging/production) |
| `docker-compose.yml` (root) | the Phase B local stack (builds `./backend` + `./frontend`) |
| `render.yaml` | Render service definition |
| `vercel.json` (root) | placeholder pointer — real config is `frontend/vercel.json` |

## Production hardening checklist (Phase 20 targets)

- [ ] Real `SECRET_KEY`/`JWT_SECRET` on Render (boot guard enforces)
- [ ] Redis + Qdrant provisioned so `/health/full` is all-`ok` (Phase B)
- [ ] Knowledge re-ingest into Qdrant (`knowledge_chunks` currently empty)
- [ ] Airflow executor connected (`AIRFLOW_URL`) for real runs (Sprint 4)
- [ ] Structured log drain + alert channel (SMTP/Slack) configured
- [ ] deploy-verify green on schedule for 7 consecutive days
