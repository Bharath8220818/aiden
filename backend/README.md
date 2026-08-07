# Backend — AIDEN

This folder contains the FastAPI backend for AIDEN. The backend provides authentication, pipeline management, AI agents, analytics, approvals, audit logs, and health checks.

---

## Prerequisites

- Python 3.11+
- `pip`
- Optional: PostgreSQL, Redis, Qdrant, MinIO for the full platform experience

---

## Setup

```bash
cd backend
python -m venv .venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Update `backend/.env` with your environment values. The example supports SQLite for local development and PostgreSQL for production or Docker deployments.

---

## Database

Run database migrations before starting the backend:

```bash
alembic upgrade head
```

If you want to seed default users for local development:

```bash
python scripts\seed_user.py
```

---

## Run

```bash
set PYTORCH_NO_CUDA=1
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Access the API at `http://localhost:8000` and the OpenAPI docs at `http://localhost:8000/docs`.

---

## Environment variables

Important variables are defined in `backend/.env.example`.

- `DATABASE_URL` — SQLite or PostgreSQL connection string
- `REDIS_URL` — Redis URL for Celery and caching
- `QDRANT_URL` — Qdrant vector database URL
- `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`
- `JWT_SECRET_KEY`, `JWT_ALGORITHM`, `JWT_EXPIRE_MINUTES`
- `HF_TOKEN` — HuggingFace token for model downloads
- `LLM_BASE_URL`, `LLM_MODEL`, `EMBEDDING_MODEL`

---

## Development commands

```bash
pytest
python scripts\seed_user.py
python scripts\download_models.py
python scripts\train_agent.py --agent intent
```

---

## Notes

- The backend is configured to allow CORS from common localhost origins.
- Docker Compose uses `backend/docker-entrypoint.sh` to start the app inside a container.
- The backend includes a WebSocket endpoint at `/api/v1/ws/{client_id}`.
