# AIDEN — Local Run Doc

## Artifact Setup

Before running the dev servers, reproduce these uncommitted artifacts:

```bash
# 1. Backend: install dependencies
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# 2. Backend: initialize Alembic (already done — skip if `backend/alembic/` exists)
alembic init alembic

# 3. Backend: copy .env template (already present — otherwise copy from backend/.env)
#    The DATABASE_URL must point to SQLite for local dev:
#      DATABASE_URL=sqlite+aiosqlite:///./aiden.db
#    For production, use PostgreSQL:
#      DATABASE_URL=postgresql+asyncpg://aiden:aiden123@postgres:5432/aiden

# 4. Backend: run Alembic migrations
set PYTHONPATH=.
alembic upgrade head

# 5. Frontend: install dependencies
cd frontend
npm install
```

## Running Dev Servers

### Backend (FastAPI)
```bash
cd backend
venv\Scripts\activate
set PYTHONPATH=.
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
Available at: http://localhost:8000
Health check: http://localhost:8000/health

### Frontend (Vite + React)
```bash
cd frontend
npm run dev
```
Available at: http://localhost:5173

### Celery Worker (optional — for pipeline execution)
```bash
cd backend
venv\Scripts\activate
venv\Scripts\celery.exe -A app.tasks worker --loglevel=info
```
Requires Redis running (see `infrastructure/docker/docker-compose.yml`).

## Docker (full stack)
```bash
cd infrastructure/docker
docker compose up --build
```

## Notes
- The `.env` file at `backend/.env` is **not** committed to git. It overrides `app/config.py` defaults.
- Alembic migration files live in `backend/alembic/versions/`.
- Frontend proxies `/api/` and `/ws` to the backend via Vite config.
