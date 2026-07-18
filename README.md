# AIDEN

AIDEN is a FastAPI + React platform for creating, managing, and monitoring data pipelines with a prompt-driven workflow.

## Current Implementation Status
The project is now in a verified working state for the core foundation:

- Backend auth endpoints are implemented and returning real responses.
- Backend pipeline CRUD and execution history endpoints are implemented.
- Frontend auth flow is connected to the backend instead of relying on demo-only behavior.
- Frontend test suite passes.
- Frontend production build succeeds.
- Backend health and signup flows have been verified locally.

## Verified Runtime Notes
The backend health endpoint returns a healthy response, and a real signup request was accepted and persisted by the application layer using the local SQLite-compatible test configuration.

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Optional: Docker Desktop for containerized services

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Run the backend:
```bash
set DATABASE_URL=sqlite+aiosqlite:///./aiden.db
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

The frontend is typically available at http://localhost:5173.

## Project Structure
```text
aiden/
├── backend/
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── auth.py
│   │   │   ├── pipelines.py
│   │   │   └── websocket.py
│   │   ├── core/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── config.py
│   │   ├── database.py
│   │   └── main.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── store/
│   │   └── types/
│   ├── package.json
│   └── vite.config.ts
├── infrastructure/
│   └── docker/
├── docs/
│   └── PROJECT_STATUS_REPORT.md
└── README.md
```

## API Surface
### Authentication
- POST /api/v1/auth/signup
- POST /api/v1/auth/login
- GET /api/v1/auth/me

### Pipelines
- POST /api/v1/pipelines/from-prompt
- POST /api/v1/pipelines/
- GET /api/v1/pipelines/
- GET /api/v1/pipelines/{pipeline_id}
- PUT /api/v1/pipelines/{pipeline_id}
- DELETE /api/v1/pipelines/{pipeline_id}
- POST /api/v1/pipelines/{pipeline_id}/run
- GET /api/v1/pipelines/{pipeline_id}/executions

## Validation Commands
```bash
cd backend
venv\Scripts\python.exe -c "from app.main import app; from fastapi.testclient import TestClient; client=TestClient(app); print(client.get('/health').json())"

cd frontend
npm test -- --run src/components/auth/Login.test.tsx
npm run build
```

## Roadmap Status
- Core backend APIs: Implemented
- Real auth integration: Implemented
- Prompt-based pipeline creation: Implemented
- Production-grade orchestration: In progress
- Full PostgreSQL-backed live validation: Pending environment setup
