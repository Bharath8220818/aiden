# Local Development

## Backend (SQLite dev mode)

```bash
cd backend
python -m venv venv
venv/Scripts/activate            # Windows Git Bash: source venv/Scripts/activate
pip install -r requirements.txt
cp .env.example .env             # defaults: sqlite+aiosqlite:///./aiden_dev.db
alembic upgrade head             # (sqlite: create_all via seed script path)
python -m scripts.seed_database  # demo dataset + accounts
python -m uvicorn app.main:app --port 8000   # http://localhost:8000/docs
```

## Frontend

```bash
cd frontend
npm install
cp .env.example .env             # VITE_ENABLE_MOCK_DATA=false (real API)
npm run dev                      # http://localhost:5173 (vite proxies /api → :8000)
```

## Full local stack (Phase B services)

```bash
docker compose up -d --build     # root compose: postgres, redis, qdrant, ollama, backend, frontend
curl http://localhost:8001/api/v1/health/full
# → database/redis/qdrant/ollama all "ok"
# frontend http://localhost:5174 · backend http://localhost:8001 · pg :5433 (psql only)
```

## Demo accounts

admin@acmedata.io/admin123 · bharath@acmedata.io/lead123 ·
engineer@acmedata.io/eng123 · analyst@acmedata.io/view123 ·
demo@aiden.dev/Demo@12345

## Verification harnesses

| What | Command |
|---|---|
| Backend unit/API tests | `cd backend && venv/Scripts/python.exe -m pytest` (235 tests) |
| Lint/format | `venv/Scripts/python.exe -m ruff check . && ruff format --check .` |
| Frontend checks | `cd frontend && npm run lint && npm test && npm run build` |
| 14-gate live smoke | `python -m scripts.phase_a.smoke --base-url http://localhost:8000` |
| ML contracts + ml tests | `python -m ml.validate` and `python -m pytest ml/tests -q` (repo root) |
| Eval scaffold/baseline | `python ml/scripts/prepare_datasets.py --source backend-scaffold` then `python ml/evaluation/run_baseline.py --all` |

## Ports & processes

Dev servers own 8000 (backend) / 5173 (frontend); the compose stack maps
8001/5174 to avoid collisions. Stray listeners: `netstat -ano | grep :8000`.
