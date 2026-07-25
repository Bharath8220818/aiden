# AIDEN

AIDEN is a full-stack AI-assisted data pipeline platform. The frontend is a React 19 + TypeScript + Tailwind CSS SPA, and the backend is a FastAPI application with async SQLAlchemy, JWT auth, Alembic migrations, and pipeline-management APIs.

---

## Quick Start

> **Full onboarding guide:** [docs/SETUP.md](docs/SETUP.md)

```bash
# 1. Clone
git clone https://github.com/YOUR_ORG/aiden.git
cd aiden

# 2. Backend
cd backend
python -m venv venv
# Windows (Powershell): venv\Scripts\Activate.ps1
# macOS / Linux:        source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
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

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Zustand, React Router, Recharts, Framer Motion |
| **Backend** | Python 3.11+, FastAPI, SQLAlchemy 2.0 (async), Alembic, Pydantic, Celery |
| **AI** | HuggingFace Transformers, smolagents, Sentence Transformers, RAG (Qdrant) |
| **Auth** | JWT (python-jose), bcrypt, OAuth2 |
| **Infrastructure** | Docker, Docker Compose, Nginx, PostgreSQL, Redis, MinIO |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React 19)                   │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │ Dashboard│ │ Pipelines│ │ Builder  │ │ Agents/Mon │  │
│  │  (22 pgs)│ │  (4 pgs) │ │(3 panels)│ │  (4 pgs)   │  │
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

---

## Project Structure

```text
aiden/
├── backend/                  # FastAPI Python backend
│   ├── app/
│   │   ├── api/v1/          # Auth, pipelines, analytics, approvals, audit, websocket
│   │   ├── core/            # Agent orchestrator, pipeline executor, RAG, intent parser
│   │   ├── models/          # SQLAlchemy ORM models
│   │   ├── schemas/         # Pydantic request/response schemas
│   │   ├── services/        # HuggingFace, database, Supabase integrations
│   │   ├── agents/          # Smolagents multi-agent implementations
│   │   ├── tools/           # Agent tools (database, web, code)
│   │   └── templates/       # Jinja2 templates (Airflow DAGs, dbt models)
│   ├── scripts/             # Model download, seed user, test helpers
│   ├── tests/               # pytest test suite
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .env.example
│   └── alembic/             # Database migrations
├── frontend/                 # React + Vite frontend
│   ├── src/
│   │   ├── api/             # Axios API clients (auth, pipelines, analytics, approvals, audit)
│   │   ├── components/      # UI components (atomic design)
│   │   │   ├── agents/      # Agent cards, detail modal
│   │   │   ├── analytics/   # KPI cards, AI insight cards
│   │   │   ├── auth/        # Login, signup, protected route
│   │   │   ├── builder/     # Pipeline canvas, node palette, properties
│   │   │   ├── common/      # Sidebar, header, loading, ambient flow
│   │   │   ├── dashboard/   # Stats cards, recent activity
│   │   │   ├── layout/      # App layout, mobile nav
│   │   │   ├── providers/   # Toast provider
│   │   │   └── ui/          # Button, Card, Input, Modal, Toast, Skeleton
│   │   ├── pages/           # 22 route pages
│   │   ├── store/           # Zustand stores (auth, pipeline, agent, notification, analytics, theme)
│   │   ├── hooks/           # Custom hooks (useTheme, useWebSocket)
│   │   ├── types/           # TypeScript interfaces
│   │   ├── utils/           # Helpers (cn)
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
├── docs/                     # SETUP.md, status reports, implementation plans
├── .github/                  # CI/CD workflows (ci.yml, ai-integration.yml)
├── .gitignore
└── README.md
```

---

## API Endpoints

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

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/analytics/dashboard` | Dashboard KPIs, trends, costs |
| `GET` | `/api/v1/analytics/pipelines/{id}` | Pipeline performance metrics |
| `GET` | `/api/v1/analytics/export` | Export CSV/PDF report |

### Approvals

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/approvals` | List approval requests |
| `POST` | `/api/v1/approvals/{id}/approve` | Approve request |
| `POST` | `/api/v1/approvals/{id}/reject` | Reject request |

### Audit

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/audit` | List audit logs with filters |
| `GET` | `/api/v1/audit/export` | Export audit logs CSV |

---

## Pages (22 total)

| Section | Pages |
|---------|-------|
| **Auth** | Login, Signup |
| **Dashboard** | Home (AI-first prompt input, stats, activity) |
| **Pipelines** | List, Details, Monitoring |
| **Builder** | Pipeline Canvas (3-panel: canvas + chat + controls) |
| **Agents** | Fleet dashboard, Agent detail modal |
| **Analytics** | KPIs, trends, cost breakdown, AI insights, CSV/PDF export |
| **Approvals** | Human approval center for pipeline changes |
| **Audit** | Audit log table with filters and export |
| **Settings** | Profile, API keys, notifications, team, billing, security, integrations |

---

## Current Status

| Area | Status |
|------|--------|
| Frontend build | Production build succeeds |
| Backend API | 15+ endpoints (auth, pipelines, analytics, approvals, audit, websocket) |
| Backend DB | SQLite (dev) + PostgreSQL (prod) via Alembic migrations |
| Docker | Dockerfile + Docker Compose for backend and frontend |
| Auth flow | JWT, signup, login, protected routes |
| Agent UI | 15 agents, cards, detail modal, filters |
| Analytics | KPIs, trends, cost breakdown, AI insights, CSV/PDF export |
| Approvals | Approval center with approve/reject actions |
| Audit | Audit log table with filters and CSV export |
| Pipeline Builder | AI-powered pipeline creation from natural language |
| Monitoring | WebSocket live updates, execution logs |
| CI/CD | GitHub Actions (lint, typecheck, test, build) |

### Known Limitations

- Pipeline execution creates records but does not run a real data movement engine yet
- HuggingFace model loading requires internet and a valid `HF_TOKEN`
- Frontend main JS chunk exceeds 500 kB (code-splitting planned)
- Frontend lint has existing warnings (hook deps, unused catch params)
- Dual CSS systems: Tailwind + MUI/Emotion (potential bundle bloat)

---

## Development

### PR Checklist

```bash
cd frontend && npx tsc --noEmit && npm test -- --run && npm run build
cd backend && python -c "import compileall; compileall.compile_dir('.')"
```

### Commit Convention

| Prefix | Example |
|--------|---------|
| `feat:` | `feat: add agent detail modal with CPU bar` |
| `fix:` | `fix: resolve N+1 query in pipeline list` |
| `refactor:` | `refactor: extract AgentCard from page` |
| `docs:` | `docs: add team onboarding guide` |
| `test:` | `test: add AgentDetailModal open/close` |
| `chore:` | `chore: add .dockerignore for faster builds` |

---

## Git Safety

`.env`, `*.db`, `logs/`, `venv/`, `node_modules/`, `__pycache__/`, `dist/`, `credentials/`, `.coverage`, `.pytest_cache/`, and `nul` (Windows reserved name) are all excluded via `.gitignore`. Never commit real secrets -- use `.env` locally and `.env.example` in git.
