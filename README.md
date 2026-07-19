# AIDEN — AI-Driven Data Pipeline Platform

AIDEN is a full-stack AI-assisted platform for creating, managing, and monitoring data pipelines using natural language prompts. The frontend is built with React 19 + TypeScript + Tailwind CSS, and the backend is a FastAPI async Python application with SQLAlchemy.

---

## 🚀 Quick Start

### Prerequisites
| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.11+ | Backend runtime |
| Node.js | 18+ | Frontend runtime |
| Redis | 7+ (optional) | Celery task queue |

### 1. Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# Run Alembic migrations (creates initial DB tables)
set PYTHONPATH=.
venv\Scripts\alembic.exe upgrade head

# Start the API server
venv\Scripts\uvicorn.exe app.main:app --reload --host 127.0.0.1 --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## ✅ Verified Workflow (End-to-End Test)

All core flows have been verified via the live API:

```
1. Health Check       → GET  /health                      ✅ {"status":"healthy"}
2. Signup             → POST /api/v1/auth/signup          ✅ 201 Created
3. Login              → POST /api/v1/auth/login           ✅ JWT token returned
4. Get Current User   → GET  /api/v1/auth/me              ✅ User profile returned
5. Pipeline from Prompt → POST /api/v1/pipelines/from-prompt ✅ Pipeline created
6. List Pipelines     → GET  /api/v1/pipelines/           ✅ User scoped list
7. Run Pipeline       → POST /api/v1/pipelines/{id}/run   ✅ Execution record created
```

---

## 📦 External Tools Required

### Required (for basic local dev)
| Tool | Install |
|------|---------|
| Python 3.11+ | [python.org](https://www.python.org/) |
| Node.js 18+ | [nodejs.org](https://nodejs.org/) |
| npm (bundled with Node) | Comes with Node.js |

### Required (for the complete stack)
| Tool | Install | Used By |
|------|---------|---------|
| Redis 7+ | `docker compose up redis` or [redis.io](https://redis.io/download) | Celery task broker |
| PostgreSQL 15 | `docker compose up postgres` or [postgresql.org](https://www.postgresql.org/) | Production database |
| Docker Desktop | [docker.com](https://www.docker.com/products/docker-desktop/) | Running full infrastructure |

### Optional (for AI / ML features)
| Tool | Install | Used By |
|------|---------|---------|
| HuggingFace Transformers | `pip install transformers accelerate` | AI prompt parsing, model loading |
| HuggingFace smolagents | `pip install smolagents` | Multi-agent orchestration |
| Sentence-Transformers | `pip install sentence-transformers` | Embeddings for RAG retrieval |
| TRL + Datasets | `pip install trl datasets` | LoRA fine-tuning pipeline |
| Ollama | [ollama.ai](https://ollama.ai/) | Local LLM inference (alternative) |
| Qdrant | `docker compose up qdrant` | Vector storage for RAG |
| PyTorch (CUDA) | [pytorch.org](https://pytorch.org/) | GPU-accelerated model inference |

---

## 📋 Pending Work & Roadmap

### 🔴 High Priority (blocking production use)
| Item | Impact | Status |
|------|--------|--------|
| **Real pipeline execution engine** | `POST /pipelines/{id}/run` only creates a DB record — no actual data movement | 🟡 Celery task scaffolded |
| **Rewrite `hf_service.py`** | Currently a mock returning hardcoded JSON — needs real model loading, quantization (4-bit), caching, pipeline creation, and sentence embeddings | 🔴 Mock only |
| **Create `agent_orchestrator.py`** | Multi-agent system with smolagents (ExtractionAgent, AnalysisAgent, PipelineBuilderAgent) does not exist | 🔴 Missing |
| **Rewrite `intent_parser.py`** | Currently rule-based keyword matching — needs NLP-powered parsing via HuggingFace pipeline with Llama 3 | 🟡 Rule-based fallback |
| **Add missing Python deps** | `sentence-transformers`, `smolagents`, `trl`, `datasets`, `torch` not in requirements.txt | 🔴 Missing |
| **Backend test suite** | No pytest files exist — API endpoints are untested | 🔴 Missing |
| **Monitoring page** | `MonitoringPage.tsx` is an empty placeholder | 🔴 Missing |

### 🟡 Medium Priority
| Item | Impact | Status |
|------|--------|--------|
| **Update `config.py` with HF settings** | Needs HF_TOKEN, HF_CACHE_DIR, USE_4BIT_QUANTIZATION, INTENT_MODEL, AGENT_MODEL, EMBEDDING_MODEL | ❌ Missing |
| **Create fine-tuning pipeline** | LoRA training with SFTTrainer in `backend/app/fine_tuning/train.py` | ❌ Missing |
| **Create training dataset** | 100-500 JSONL examples for intent parsing fine-tuning | ❌ Missing |
| **Create `Dockerfile.prod`** | Multi-stage Docker build with model caching at build time | ❌ Missing |
| **PipelineDetailsPage** | Shows only name/description — no execution history UI | 🟡 Minimal |
| **Duplicate ChatInterface** | Two copies exist (`components/chat/` and `components/ChatInterface.tsx`) | 🟡 Needs cleanup |
| **PipelineCanvas not wired** | Visual canvas uses hardcoded demo nodes, not real pipeline config | 🟡 Static |
| **WebSocket not fully active** | Server and client exist but no real events flow | 🟡 Scaffolded |
| **Dashboard prompt panel** | "Use prompt" button now wired, but no template-to-API link | ✅ Done |

### 🟢 Low Priority (polish)
| Item | Details |
|------|---------|
| Dashboard `fetchExecutions(0)` | Passes `0` as pipeline ID — harmless but incorrect |
| No CI/CD pipeline | No GitHub Actions or build automation |
| Alembic migration | Initial migration created — needs future iterations |
| Dark mode toggle | Not implemented |
| Animation / transitions | Minimal — could be enhanced |

---

## 📐 Project Structure

```
aiden/
├── backend/                          # Python FastAPI backend
│   ├── alembic/                      # Database migrations
│   │   ├── versions/                 # Migration scripts
│   │   ├── env.py                    # Alembic environment config
│   │   └── script.py.mako            # Migration template
│   ├── app/
│   │   ├── api/v1/                   # REST endpoints
│   │   │   ├── auth.py              # Signup, login, me
│   │   │   ├── pipelines.py         # Pipeline CRUD + execution
│   │   │   ├── websocket.py         # Real-time connections
│   │   │   └── deps.py              # Auth dependency
│   │   ├── core/
│   │   │   ├── security.py          # JWT + password hashing
│   │   │   └── intent_parser.py     # NLP prompt → pipeline config
│   │   ├── models/                  # SQLAlchemy models
│   │   │   ├── user.py
│   │   │   ├── pipeline.py
│   │   │   └── execution.py
│   │   ├── schemas/                 # Pydantic request/response schemas
│   │   ├── services/                # Business logic
│   │   │   ├── database_service.py  # External DB connections
│   │   │   └── hf_service.py        # HuggingFace (mock)
│   │   ├── tasks.py                 # Celery async tasks
│   │   ├── config.py                # Settings via pydantic-settings
│   │   ├── database.py              # Async SQLAlchemy engine
│   │   └── main.py                  # FastAPI application entry
│   ├── .env                         # Local dev environment config
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                        # React SPA
│   ├── src/
│   │   ├── api/                     # Axios API clients
│   │   │   ├── auth.ts
│   │   │   ├── pipelines.ts
│   │   │   └── index.ts
│   │   ├── components/
│   │   │   ├── auth/                # Login, Signup, ProtectedRoute
│   │   │   ├── builder/             # PipelineCanvas (ReactFlow), AgentManagerPanel
│   │   │   ├── chat/                # ChatInterface, MessageInput, MessageList
│   │   │   ├── common/              # Header, ErrorBoundary, LoadingSpinner
│   │   │   ├── dashboard/           # StatsCard
│   │   │   └── layout/              # AppLayout, MobileNav
│   │   ├── hooks/                   # useWebSocket hook
│   │   ├── pages/                   # 8 route pages
│   │   ├── store/                   # Zustand stores (auth, pipeline, notification)
│   │   └── types/                   # TypeScript type definitions
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
├── infrastructure/docker/           # Docker Compose + Nginx + Alembic config
│   ├── docker-compose.yml           # 6 services (postgres, redis, qdrant, minio, backend, frontend)
│   └── nginx/                       # Production reverse proxy
├── docs/
│   ├── PROJECT_STATUS_REPORT.md     # Detailed project analysis
│   └── RUN_DOC.md                   # Local development run guide
├── .gitignore
└── README.md
```

---

## 📡 API Surface

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/signup` | Register new user |
| POST | `/api/v1/auth/login` | Login (OAuth2 form) |
| GET | `/api/v1/auth/me` | Get current user profile |

### Pipelines
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/pipelines/from-prompt` | Create from natural language |
| POST | `/api/v1/pipelines/` | Create from structured data |
| GET | `/api/v1/pipelines/` | List user's pipelines (filtered, paginated) |
| GET | `/api/v1/pipelines/{id}` | Get single pipeline |
| PUT | `/api/v1/pipelines/{id}` | Update pipeline |
| DELETE | `/api/v1/pipelines/{id}` | Soft-delete pipeline |
| POST | `/api/v1/pipelines/{id}/run` | Trigger execution |
| GET | `/api/v1/pipelines/{id}/executions` | Execution history |
| GET | `/api/v1/executions/{id}/logs` | Execution logs |

### Real-time
| Type | Endpoint | Description |
|------|----------|-------------|
| WebSocket | `/api/v1/ws` | Real-time status updates |

---

## 🧪 Validation Commands

```bash
# --- Backend ---
cd backend
set PYTHONPATH=.

# Check health
venv\Scripts\python.exe -c "import urllib.request; import json; print(json.loads(urllib.request.urlopen('http://127.0.0.1:8000/health').read()))"

# Run Alembic migrations
venv\Scripts\alembic.exe upgrade head

# --- Frontend ---
cd frontend

# TypeScript check
npx tsc --noEmit

# Run tests
npm test -- --run

# Production build
npm run build

# --- Full stack Docker ---
cd infrastructure/docker
docker compose up --build
```

---

## 📊 Current Status

| Check | Result |
|-------|--------|
| Backend health | ✅ `{"status":"healthy"}` |
| User signup / login | ✅ JWT auth, bcrypt hashing |
| Pipeline CRUD | ✅ Full REST API |
| Pipeline from prompt | ✅ Intent parser with rule-based fallback |
| Alembic migrations | ✅ Initial migration applied |
| Celery tasks | ✅ Scaffolded (`app/tasks.py`) |
| TypeScript compilation | ✅ Clean — zero errors |
| Frontend tests | ✅ 3/3 passing |
| Frontend production build | ✅ Successful |

---

## 🔗 Links

- **Live dev servers**: Backend http://localhost:8000 | Frontend http://localhost:5173
- **Project Analysis**: [docs/PROJECT_STATUS_REPORT.md](docs/PROJECT_STATUS_REPORT.md)
- **Local Run Guide**: [docs/RUN_DOC.md](docs/RUN_DOC.md)
