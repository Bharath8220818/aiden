# AIDEN

AIDEN is a full-stack AI-assisted data pipeline platform. The frontend is a React 19 + TypeScript + Tailwind CSS SPA, and the backend is a FastAPI application with async SQLAlchemy, JWT auth, Alembic migrations, and pipeline-management APIs.

---

## 🚀 Quick Start (New Team Members)

> **Full onboarding guide → [docs/SETUP.md](docs/SETUP.md)**

```bash
# 1. Clone
git clone https://github.com/YOUR_ORG/aiden.git
cd aiden

# 2. Backend
cd backend
python -m venv venv
# ── Activate virtual environment ──
# Windows (CMD):    venv\Scripts\activate
# Windows (Powershell): venv\Scripts\Activate.ps1
# macOS / Linux:    source venv/bin/activate
# ──────────────────────────────────
pip install -r requirements.txt
cp .env.example .env
# ^ Windows CMD users: use `copy .env.example .env` instead
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# 3. Frontend (new terminal)
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). You should see the AIDEN login page.

---

## Team Collaboration

### Branch Strategy

```
main (protected) ─── feature/* ────→ main (via PR)
                 └── fix/* ────────→ main (via PR)
                 └── docs/* ───────→ main (via PR)
```

### Pull Request Checklist

Before opening a PR, run:

```bash
cd frontend && npx tsc --noEmit && npm test -- --run && npm run build
cd backend && python -c "import compileall; compileall.compile_dir('.')"
```

### Commit Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix     | Example                                      |
|------------|----------------------------------------------|
| `feat:`    | `feat: add agent detail modal with CPU bar` |
| `fix:`     | `fix: resolve N+1 query in pipeline list`   |
| `refactor:`| `refactor: extract AgentCard from page`     |
| `docs:`    | `docs: add team onboarding guide`           |
| `test:`    | `test: add AgentDetailModal open/close`     |
| `chore:`   | `chore: add .dockerignore for faster builds`|

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React 19)                   │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │ Dashboard│ │ Pipelines│ │ Builder  │ │ Agents/Mon │  │
│  │  (14 pgs)│ │  (4 pgs) │ │(3 panels)│ │  (4 pgs)   │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬──────┘  │
│       └────────────┴────────────┴──────────────┘         │
│                        │ axios / WebSocket                │
├────────────────────────┼──────────────────────────────────┤
│              Backend (FastAPI)                            │
│  ┌──────────┐ ┌──────────────┐ ┌────────────────────┐    │
│  │Auth (JWT)│ │Pipeline CRUD │ │    AI Agents        │    │
│  │          │ │ + Execution  │ │(smolagents, HF, RAG)│    │
│  └──────────┘ └──────────────┘ └────────────────────┘    │
│                        │                                  │
│          ┌─────────────┼─────────────┐                    │
│          ▼             ▼             ▼                     │
│     PostgreSQL     Redis / Qdrant   MinIO S3              │
│     (SQLite dev)    (cache, RAG)    (artifacts)           │
└──────────────────────────────────────────────────────────┘
```

### Pages (22 total)

| Section | Pages |
|---------|-------|
| **Auth** | Login, Signup |
| **Dashboard** | Home |
| **Pipelines** | List, Details, Monitoring |
| **Builder** | Pipeline Canvas (3-panel: history + chat + flow) |
| **Agents** | Fleet dashboard, Agent detail modal |
| **Analytics** | KPIs, charts, cost breakdown, insights |
| **Settings** | Profile, API keys, notifications, team, billing, security, integrations |
| **Infra** | Audit logs, monitoring, health |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Zustand, TanStack Query, React Router, Recharts, Framer Motion |
| **Backend** | Python 3.11+, FastAPI, SQLAlchemy 2.0 (async), Alembic, Pydantic, Celery |
| **AI** | HuggingFace Transformers, smolagents, Sentence Transformers, RAG (Qdrant) |
| **Auth** | JWT (python-jose), bcrypt, OAuth2 |
| **Infrastructure** | Docker, Docker Compose, Nginx, PostgreSQL, Redis, MinIO |

---

## Project Structure

```text
aiden/
├── backend/                  # FastAPI Python backend
│   ├── app/
│   │   ├── api/v1/          # Auth, pipelines, websocket endpoints
│   │   ├── core/            # Agent orchestrator, pipeline executor, RAG, intent parser
│   │   ├── models/          # SQLAlchemy ORM models
│   │   ├── schemas/         # Pydantic request/response schemas
│   │   ├── services/        # HuggingFace, database, Supabase integrations
│   │   ├── agents/          # Smolagents multi-agent implementations
│   │   ├── tools/           # Agent tools (database, web, code)
│   │   └── templates/       # Jinja2 templates (Airflow DAGs, dbt models)
│   ├── scripts/             # Model download, seed user, test helpers
│   ├── tests/
│   ├── credentials/         # (Optional) Service account JSONs (gitignored)
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .env.example
│   └── alembic/             # Database migrations
├── frontend/                 # React + Vite frontend
│   ├── src/
│   │   ├── api/             # Axios API clients
│   │   ├── components/      # UI components (atomic design)
│   │   ├── pages/           # 22 route pages
│   │   ├── store/           # Zustand stores (auth, pipeline, agent, notification, analytics)
│   │   ├── hooks/           # Custom hooks (useTheme, useWebSocket, etc.)
│   │   ├── types/           # TypeScript interfaces
│   │   ├── utils/           # Helpers (cn, formatters)
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css        # Dark-first design system
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── Dockerfile
│   ├── nginx.conf
│   └── .env.example
├── infrastructure/docker/    # Docker Compose, Nginx config
├── docs/                     # SETUP.md, status reports, plans
├── .gitignore
└── README.md
```

---

## API Surface

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/signup` | Register user |
| `POST` | `/api/v1/auth/login` | Login (OAuth2 form) |
| `GET` | `/api/v1/auth/me` | Current user profile |

### Pipelines

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/pipelines/from-prompt` | Create pipeline from natural language |
| `POST` | `/api/v1/pipelines/` | Create structured pipeline |
| `GET` | `/api/v1/pipelines/` | List user's pipelines |
| `GET` | `/api/v1/pipelines/{id}` | Get pipeline details |
| `PUT` | `/api/v1/pipelines/{id}` | Update pipeline |
| `DELETE` | `/api/v1/pipelines/{id}` | Soft-delete pipeline |
| `POST` | `/api/v1/pipelines/{id}/run` | Execute pipeline |
| `GET` | `/api/v1/pipelines/{id}/executions` | Execution history |
| `GET` | `/api/v1/executions/{id}/logs` | Execution logs |

---

## Current Status

| Area | Status |
|------|--------|
| Frontend tests | ✅ 6 tests passing |
| Frontend build | ✅ Production build succeeds |
| Backend API | ✅ 12 endpoints verified |
| Backend DB | ✅ SQLite + PostgreSQL support |
| Docker build | ✅ .dockerignore, BigQuery pinned, BuildKit secrets |
| Auth flow | ✅ JWT, signup, login, protected routes |
| Agent UI | ✅ 15 agents, cards, modal, filters |
| Analytics | ✅ 5 KPIs, 3 charts, CSV/PDF export |
| Monitoring | ✅ WebSocket scaffold, logs |

### Known Limitations

- Pipeline execution creates records but does not run a real data movement engine yet
- HuggingFace model loading requires an internet connection and valid `HF_TOKEN`
- Frontend main JS chunk exceeds 500 kB (code-splitting planned)
- Frontend lint has existing warnings (hook deps, unused catch params)

---

## Git Safety

`.env`, `*.db`, `logs/`, `venv/`, `node_modules/`, `__pycache__/`, `dist/`, `credentials/`, and `nul` (Windows reserved name) are all excluded via `.gitignore`. Never commit real secrets — use `.env` locally and `.env.example` in git.
