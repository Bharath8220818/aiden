# AIDEN — AI Data Engineering Platform

**Build production-ready data pipelines with natural language.**  
AIDEN is a full-stack AI-assisted data pipeline platform with a React 19 + TypeScript frontend and a FastAPI backend. It turns natural language descriptions into executable data pipelines.

---

## 🚀 Quick Start (Windows)

### Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| **Node.js** | 18+ | `node --version` |
| **Python** | 3.11+ | `python --version` |
| **Git** | Any | `git --version` |

### 1. Backend Setup

```batch
cd backend

:: Create virtual environment
python -m venv venv
venv\Scripts\activate

:: Install dependencies
pip install -r requirements.txt

:: Configure environment
copy .env.example .env
:: Edit .env with your settings

:: Fast startup on Windows (skip CUDA check)
set PYTORCH_NO_CUDA=1

:: Run database migrations
alembic upgrade head

:: Seed test user
python scripts\seed_user.py

:: Start backend
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 2. Frontend Setup (new terminal)

```batch
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

### 3. Test Credentials

| Email | Password |
|-------|----------|
| `femifriendly@gmail.com` | `Femi@2005` |

---

## 🏗️ Project Structure

```text
aiden/
├── backend/                          # FastAPI Python backend
│   ├── app/
│   │   ├── api/v1/                   # 18 API routers
│   │   ├── core/                     # 13 business logic modules
│   │   ├── agents/                   # 11 AI agents
│   │   ├── services/                 # 13 external integrations
│   │   ├── models/                   # 7 SQLAlchemy ORM models
│   │   ├── schemas/                  # 16 Pydantic schemas
│   │   ├── templates/                # 6 Jinja2 templates
│   │   ├── fine_tuning/              # LoRA training module
│   │   ├── main.py                   # FastAPI entry point
│   │   ├── config.py                 # Pydantic settings
│   │   ├── database.py               # Async SQLAlchemy engine
│   │   └── tasks.py                  # Celery background tasks
│   ├── scripts/                      # Utility scripts
│   ├── data/                         # Training datasets
│   ├── models/                       # Model storage
│   ├── tests/                        # pytest suite
│   ├── alembic/                      # DB migrations
│   └── requirements.txt
│
├── frontend/                         # React + Vite SPA
│   ├── src/
│   │   ├── api/                      # 13 API clients (axios)
│   │   ├── components/               # 80+ reusable components
│   │   ├── pages/                    # 34 route pages
│   │   ├── store/                    # 13 Zustand stores
│   │   ├── hooks/                    # 11 custom hooks
│   │   ├── types/                    # 11 TypeScript interfaces
│   │   └── utils/                    # Helpers
│   ├── package.json
│   └── vite.config.ts
│
├── infrastructure/docker/            # Docker Compose + Nginx
├── docs/                             # Documentation
└── README.md
```

---

## 📋 Scripts

### Frontend

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (localhost:5173) |
| `npm run build` | TypeScript check + production build |
| `npm run preview` | Preview production build |
| `npm test` | Run Vitest test suite |
| `npm run lint` | Run oxlint |

### Backend

| Command | Description |
|---------|-------------|
| `uvicorn app.main:app --reload --port 8000` | Dev server |
| `alembic upgrade head` | Run database migrations |
| `pytest -v` | Run test suite |
| `python scripts\seed_user.py` | Create test users |
| `python scripts\train_agent.py --agent intent` | Train intent agent |
| `python scripts\download_models.py` | Download HF models |

### Windows Tips

```batch
:: Kill stuck Python processes
taskkill /F /IM python.exe

:: Check what's listening on port 8000
netstat -ano | findstr :8000

:: Enable Python subprocess timeout for CUDA check
set PYTORCH_NO_CUDA=1
```

---

## 🌐 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/signup` | Register user |
| `POST` | `/api/v1/auth/login` | Login (OAuth2 form) |
| `GET` | `/api/v1/auth/me` | Current user profile |

### Pipelines

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/pipelines/from-prompt` | AI-powered pipeline creation |
| `POST` | `/api/v1/pipelines/` | Create structured pipeline |
| `GET` | `/api/v1/pipelines/` | List user's pipelines |
| `GET` | `/api/v1/pipelines/{id}` | Get pipeline details |
| `PUT` | `/api/v1/pipelines/{id}` | Update pipeline |
| `DELETE` | `/api/v1/pipelines/{id}` | Soft-delete pipeline |
| `POST` | `/api/v1/pipelines/{id}/run` | Execute pipeline |
| `POST` | `/api/v1/pipelines/{id}/cancel` | Cancel execution |
| `GET` | `/api/v1/pipelines/{id}/executions` | Execution history |
| `GET` | `/api/v1/pipelines/rag-search` | Semantic RAG search |
| `POST` | `/api/v1/pipelines/test-connection` | Test DB connection |

### Analytics, Approvals, Audit

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/analytics/dashboard` | Dashboard KPIs |
| `GET` | `/api/v1/analytics/export` | Export CSV report |
| `GET` | `/api/v1/approvals` | List approval requests |
| `POST` | `/api/v1/approvals/{id}/approve` | Approve request |
| `POST` | `/api/v1/approvals/{id}/reject` | Reject request |
| `GET` | `/api/v1/audit` | List audit logs |
| `GET` | `/api/v1/audit/export` | Export audit logs CSV |

### AI & Agents

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/agents` | List AI agents |
| `GET` | `/api/v1/agents/{id}/metrics` | Agent performance metrics |
| `POST` | `/api/v1/agents/train` | Train an agent |
| `POST` | `/api/v1/multimodal/analyze` | Analyze image (base64) |
| `POST` | `/api/v1/multimodal/upload` | Analyze image (file upload) |
| `GET` | `/api/v1/multimodal/status` | Service availability |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Root health check |
| `GET` | `/api/v1/health` | 6-service health check |
| `GET` | `/api/v1/health/live` | K8s liveness probe |
| `GET` | `/api/v1/health/ready` | K8s readiness probe |

### WebSocket

| Endpoint | Description |
|----------|-------------|
| `WS /api/v1/ws/{client_id}` | Real-time pipeline status updates |

---

## 🧩 Frontend Pages (34 routes)

| Category | Pages | Count |
|----------|-------|-------|
| **Core** | Dashboard, Settings | 2 |
| **Learning** | Learning Paths, Coding Problems, Coding Problem Detail, Data Modeling | 4 |
| **Design** | Pipeline Designer, Architecture Canvas, Schema Designer, Cloud Labs | 4 |
| **Operations** | Pipelines, Pipeline Details, Monitoring, Analytics | 4 |
| **AI** | AI Workspace, Agents, Multimodal | 3 |
| **Builder** | Pipeline Builder, Pipeline Studio | 2 |
| **Governance** | Approvals, Audit Logs, Team | 3 |
| **Resources** | Templates, Getting Started, Knowledge Base | 3 |
| **Auth** | Landing, Login, Signup | 3 |
| **Info** | About, Terms, Privacy, Changelog | 4 |
| **Admin/Error** | Admin Dashboard, 404 Not Found | 2 |

---

## 📊 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript 6, Vite 8, Tailwind CSS 3, Zustand 5, React Router 7, Framer Motion 12, Recharts 3 |
| **Backend** | Python 3.11+, FastAPI, SQLAlchemy 2.0 (async), Alembic, Pydantic 2 |
| **AI / LLM** | HuggingFace Transformers, Ollama (llama3.2:1b), Sentence Transformers |
| **RAG** | In-memory vector store (384-dim MiniLM), Qdrant (optional) |
| **Auth** | JWT (python-jose), bcrypt |
| **Infrastructure** | Docker, Docker Compose, Nginx, PostgreSQL, Redis |

---

## 🐛 Known Issues

| Issue | Workaround |
|-------|------------|
| Backend slow to start on Windows | `set PYTORCH_NO_CUDA=1` before `uvicorn` |
| `supabase` not installed | Auto-disables — no action needed |
| `asyncpg` not installed | SQLite works fine for dev — no action needed |
| Frontend chunk >500 kB warning | Code-splitting planned — warning is safe to ignore |

---

## 📝 License

MIT
