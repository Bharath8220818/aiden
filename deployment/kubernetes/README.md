# ─── AIDEN Kubernetes Manifests (Stage 3.1) ────────────────────────────

Apply order:

```bash
kubectl create namespace aiden
kubectl -n aiden create secret generic aiden-secrets \
  --from-literal=DATABASE_URL='postgresql+asyncpg://aiden:***@postgres:5432/aiden' \
  --from-literal=JWT_SECRET_KEY='<32+ char random string>' \
  --from-literal=REDIS_URL='redis://redis:6379/0'
kubectl apply -f deployment/kubernetes/ -n aiden
```

| File | Purpose |
|------|---------|
| `backend-deployment.yaml` | FastAPI backend, 2 replicas, health probes on `/api/v1/health/healthz` |
| `backend-service.yaml` | ClusterIP :80 → :8000 |
| `frontend-deployment.yaml` | nginx-served SPA, 2 replicas |
| `frontend-service.yaml` | ClusterIP :80 |
| `ingress.yaml` | `/api` → backend, `/` → frontend; WebSocket (`/api/v1/ws/*`) rides the same backend path |

Secrets are never committed — create `aiden-secrets` out-of-band as shown.
For production add HPA, PodDisruptionBudgets, and TLS on the ingress.
