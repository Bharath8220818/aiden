# Production Deployment

## Topology (as deployed)

| Piece | Provider | Setup |
|---|---|---|
| Frontend | Vercel | Root Directory `frontend/`; config = `frontend/vercel.json` (root vercel.json ignored); production env committed as `frontend/.env.production` (Vite's native mechanism — vercel.json `env` blocks don't reach Vite builds) |
| API | Render | `render.yaml`; boot `alembic upgrade head && uvicorn`; `ENVIRONMENT=production` enforces real secrets |
| DB | Supabase | IPv4 **session pooler** URL (direct host is IPv6-only and Render cannot egress it) |
| WS | direct | `VITE_WS_URL=wss://<render>/api/v1/ws` — Vercel rewrites cannot proxy WS upgrades |

## Environment variables (backend / Render)

Required: `DATABASE_URL` (pooler URL), `SECRET_KEY`, `JWT_SECRET`
(production guard rejects `insecure-dev` values), `ENVIRONMENT=production`,
`DEBUG=false`, `CORS_ORIGINS=https://aiden-orcin.vercel.app`.
Optional (each degrades independently): `REDIS_URL`, `QDRANT_URL`,
`OLLAMA_URL`, `AIRFLOW_URL`+credentials, SMTP/Slack/Teams/Jira,
`FRONTEND_URL`, `RATE_LIMIT_PER_MINUTE`.

Full reference: [environment-variables.md](environment-variables.md).

## Deploy flow

1. Push to `main` → Vercel + Render auto-deploy.
2. Render: migrations run before serve; a failing migration fails the deploy.
3. CI `ci.yml` gates the push (backend pytest, frontend build, ml contracts).
4. `deploy-verify.yml` runs the 14-gate smoke against the live URL
   (scheduled `17 */6 * * *` + manual dispatch with `base_url` input).

## Verify a deployment

```bash
python -m scripts.phase_a.smoke --base-url https://aiden-backend-fq08.onrender.com
# 14/14 PASS — liveness, register/login/me, 401s, CRUD chain, knowledge, viewer-403
curl https://aiden-backend-fq08.onrender.com/api/v1/health/full
```

Frontend-side: the `/status` page (public) probes healthz + `/health/full` +
WS handshake and inspects the build config — it has caught two real prod bugs
already (mock-data marker, WS URL).

## Rollback

- **Render**: redeploy previous commit from the dashboard (migrations are
  forward-only — pair schema rollbacks with a new migration, never `down`).
- **Vercel**: instant rollback to a prior build from the dashboard.
- **Supabase**: PITR branch restore if data-level rollback is required.

## Checklist for a new production env

- [ ] Render service + env vars (pooler URL, real secrets, CORS)
- [ ] Supabase: pooler connectivity verified (`/health/full` → `database: ok`)
- [ ] Vercel project: Root Directory `frontend/`, committed `.env.production`
- [ ] Custom domain + CORS update
- [ ] deploy-verify workflow dispatch → 14/14
- [ ] Log drain + alert channel wired
