# AIDEN Local Run Guide

## Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
set PYTHONPATH=.
alembic upgrade head
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Check it:

```bash
curl http://127.0.0.1:8000/health
```

## Frontend

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Open http://localhost:5173.

## Optional Worker

```bash
cd backend
venv\Scripts\activate
celery -A app.tasks worker --loglevel=info
```

Redis is required for the worker.

## Docker

```bash
cd infrastructure/docker
docker compose up --build
```

## Verified Commands

```bash
cd frontend
npm test -- --run
npm run build
npm run lint

cd ..\backend
venv\Scripts\python.exe test_db_connection.py
venv\Scripts\alembic.exe current
```

## Notes

- `.env` files are local-only and must not be committed.
- Local development defaults to SQLite unless `DATABASE_URL` is changed.
- To use Supabase, create a Supabase project, copy its Postgres connection string, convert it to the async SQLAlchemy form, and set it in `backend/.env`:

```bash
DATABASE_URL=postgresql+asyncpg://postgres.your-project-ref:your-password@aws-0-your-region.pooler.supabase.com:6543/postgres
```

Then run `alembic upgrade head` from `backend` to create the app tables in Supabase.
- The Vite frontend uses `VITE_API_URL` and `VITE_WS_URL` from `frontend/.env`.
