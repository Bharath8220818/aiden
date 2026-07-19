# AIDEN

AIDEN is a full-stack AI-assisted data pipeline platform. The frontend is a React 19 + TypeScript + Tailwind CSS SPA, and the backend is a FastAPI application with async SQLAlchemy, JWT auth, Alembic migrations, and pipeline-management APIs.

## Current Status

Verified on this workspace:

| Area | Result |
| --- | --- |
| Frontend tests | Passing: 1 file, 3 tests |
| Frontend production build | Passing |
| Frontend lint | Runs with warnings |
| Backend Python compile check | Passing |
| Backend Alembic current revision | `5fb00d78ec1a (head)` |
| Backend DB smoke check | Passing with local SQLite |
| Backend API smoke check | Passing for health, signup, login, current user, prompt pipeline creation, pipeline run, execution logs |

Known limitations:

- Pipeline execution currently creates execution records; it does not run a real data movement engine yet.
- HuggingFace model loading falls back in this environment because external model access is blocked.
- The frontend build still warns that the main JavaScript chunk is larger than 500 kB.
- Frontend lint reports existing warnings around hook dependencies and unused catch parameters.

## Prerequisites

| Tool | Version | Purpose |
| --- | --- | --- |
| Python | 3.11+ | Backend runtime |
| Node.js | 18+ | Frontend runtime |
| npm | Bundled with Node | Frontend dependencies |
| Redis | Optional | Celery task broker |
| Docker Desktop | Optional | Full infrastructure stack |

## Backend Setup

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

Backend URLs:

- API root: http://localhost:8000
- Health: http://localhost:8000/health
- Swagger docs: http://localhost:8000/docs

## Frontend Setup

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Frontend URL: http://localhost:5173

## Validation Commands

```bash
# Frontend
cd frontend
npm test -- --run
npm run build
npm run lint

# Backend
cd backend
venv\Scripts\python.exe -m py_compile app\config.py app\main.py app\database.py app\api\v1\auth.py app\api\v1\pipelines.py
venv\Scripts\alembic.exe current
venv\Scripts\python.exe test_db_connection.py
```

## API Surface

Authentication:

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/v1/auth/signup` | Register user |
| `POST` | `/api/v1/auth/login` | Login with OAuth2 form credentials |
| `GET` | `/api/v1/auth/me` | Get current user |

Pipelines:

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/v1/pipelines/from-prompt` | Create pipeline from `{ "prompt": "..." }` |
| `POST` | `/api/v1/pipelines/` | Create structured pipeline |
| `GET` | `/api/v1/pipelines/` | List current user's pipelines |
| `GET` | `/api/v1/pipelines/{pipeline_id}` | Get pipeline |
| `PUT` | `/api/v1/pipelines/{pipeline_id}` | Update pipeline |
| `DELETE` | `/api/v1/pipelines/{pipeline_id}` | Soft-delete pipeline |
| `POST` | `/api/v1/pipelines/{pipeline_id}/run` | Create execution record |
| `GET` | `/api/v1/pipelines/{pipeline_id}/executions` | List execution history |
| `GET` | `/api/v1/executions/{execution_id}/logs` | Get execution logs |

## Project Structure

```text
aiden/
├── backend/                 # FastAPI backend
├── frontend/                # React/Vite frontend
├── infrastructure/docker/   # Docker Compose, Nginx, Alembic support
├── docs/                    # Run and status docs
├── .gitignore
└── README.md
```

## Git Safety

`.env`, local databases, logs, virtualenvs, `node_modules`, and frontend build output are ignored. Keep real secrets in local `.env` files or deployment platform environment variables, and keep only `.env.example` in git.
