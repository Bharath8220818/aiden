# Documentation — AIDEN

This folder collects project documentation and running guides for AIDEN.

## Running docs

Use this file as the main index for running and operating the project.

### Local development

- `backend/README.md` — backend setup and local API startup
- `frontend/README.md` — frontend setup and Vite commands
- `infrastructure/README.md` — Docker Compose runtime instructions

### Quick start

1. Run the backend locally:
   - `cd backend`
   - `python -m venv venv`
   - `venv\Scripts\activate`
   - `pip install -r requirements.txt`
   - `copy .env.example .env`
   - `alembic upgrade head`
   - `python scripts\seed_user.py`
   - `uvicorn app.main:app --reload --host 127.0.0.1 --port 8000`
2. Run the frontend:
   - `cd frontend`
   - `npm install`
   - create `frontend/.env` with `VITE_API_URL=http://localhost:8000`
   - `npm run dev`
3. Use the app at `http://localhost:5173`.

### Docker Compose

Start the full stack:

```bash
cd infrastructure/docker
docker compose up -d
```

Stop it:

```bash
docker compose down
```

## Reference docs

- `docs/INTENT_AGENT_FINETUNING.md`
- `docs/QDRANT_WINDOWS.md`
- `docs/PROJECT_STATUS_REPORT.md`
- `docs/aiden_multimodal_colab.ipynb`
- `docs/aiden_training_colab.ipynb`

## Notes

- The backend uses FastAPI and exposes OpenAPI at `/docs`.
- The frontend uses Vite and expects `VITE_API_URL` and `VITE_WS_URL` to point to the running backend.
- The Docker Compose stack includes PostgreSQL, Redis, Qdrant, MinIO, backend, and frontend.
