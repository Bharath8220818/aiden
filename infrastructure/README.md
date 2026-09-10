# Infrastructure — AIDEN

Infrastructure and runtime support for AIDEN: Docker Compose stacks, nginx, Prometheus config, and Windows helpers.

---

## Docker Compose files

| File | Purpose |
|------|---------|
| `docker/docker-compose.yml` | Dev stack — postgres, redis, qdrant, minio, backend, frontend |
| `docker/docker-compose.app.yml` | App-only overrides (backend + frontend) |
| `docker/docker-compose.prod.yml` | Production configuration |

### Services (dev stack)

| Service | Port | Notes |
|---------|------|-------|
| `postgres` | 5432 | Primary database (SQLite fallback in local dev) |
| `redis` | 6379 | Cache, Celery broker, event bus, hot memory layer |
| `qdrant` | 6333 | Vector DB for RAG memory (`/readyz` healthcheck configured) |
| `minio` | 9000 | S3-compatible storage |
| `backend` | 8000 | FastAPI backend |
| `frontend` | 80/443 | React app served by nginx |

---

## Start / stop

```bash
cd infrastructure/docker
docker compose up -d          # start the stack
docker compose ps             # check status
docker compose down           # stop
docker compose down -v        # stop and remove volumes (resets data)
```

---

## Monitoring (Prometheus)

`docker/prometheus/` contains the Prometheus scrape configuration targeting the backend `/metrics` endpoint (prometheus-client). Add a `prometheus` service to compose (or run the binary) pointed at this config to scrape backend metrics; Grafana can be added on top for dashboards.

---

## Windows helpers

Docker Desktop on Windows can be killed by shell job-object cleanup (containers appear to restart in a cycle). Helpers:

- [`ensure-qdrant.ps1`](docker/ensure-qdrant.ps1) — launches/verifies the Qdrant container detached, waits for `/readyz`
- [`../docs/QDRANT_WINDOWS.md`](../docs/QDRANT_WINDOWS.md) — root cause, WSL2 `.wslconfig` tuning, and a native Windows Qdrant binary alternative

Launch Docker Desktop detached if you see container restart cycles.

---

## Kubernetes

Full manifests live in [`../deployment/kubernetes/`](../deployment/kubernetes/README.md): backend & frontend deployments + services, and an ingress.

---

## Recommended local workflow

1. Start Docker Desktop.
2. `docker compose up -d`.
3. Frontend: `http://localhost` · API docs: `http://localhost:8000/docs` · Prometheus metrics: `http://localhost:8000/api/v1/metrics`.
