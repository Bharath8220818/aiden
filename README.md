# AIDEN

AIDEN is a full-stack AI-assisted data pipeline platform with multimodal capabilities. The frontend is a React 19 + TypeScript + Tailwind CSS SPA, and the backend is a FastAPI application with async SQLAlchemy, JWT auth, Ollama/LLM-powered intent parsing, RAG memory, and multi-agent orchestration.

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/YOUR_ORG/aiden.git
cd aiden

# 2. Backend
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Generate a secure JWT secret:
python -c "import secrets; print(f'JWT_SECRET_KEY={secrets.token_urlsafe(64)}')" >> .env

# Run database migrations + seed test user
alembic upgrade head
python scripts/seed_user.py

# Start backend
uvicorn app.main:app --reload --port 8000

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev

# 4. (Optional) Local LLM for intent parsing (recommended)
ollama pull llama3.2:1b

# 5. (Optional) Multimodal vision-language (for diagram analysis)
pip install torchvision pillow
python scripts/download_models.py --model multimodal    # ~7 GB download
echo "MULTIMODAL_ENABLED=True" >> .env

# 6. Verify multimodal setup
# (with your backend server already running)
TOKEN=$(python -c "import requests; r=requests.post('http://localhost:8000/api/v1/auth/login', \
data={'username': 'femifriendly', 'password': 'Femi@2005'}); print(r.json()['access_token'])")
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/multimodal/status
# Expected: {"available": true|false, "model": "llava-hf/llava-v1.6-mistral-7b-hf"}
```

> **Test credentials** (after `python scripts/seed_user.py`):
> Email: `femifriendly@gmail.com` / Password: `Femi@2005`

Open [http://localhost:5173](http://localhost:5173).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Zustand, React Router, Recharts, Framer Motion |
| **Backend** | Python 3.11+, FastAPI, SQLAlchemy 2.0 (async), Alembic, Pydantic |
| **AI / LLM** | Ollama (llama3.2:1b), HuggingFace Transformers, Sentence Transformers, smolagents |
| **RAG** | In-memory vector store (384-dim MiniLM embeddings), Qdrant (optional) |
| **Auth** | JWT (python-jose), bcrypt, OAuth2 |
| **Infrastructure** | Docker, Docker Compose, Nginx, PostgreSQL, Redis, MinIO |

---

## Project Structure

```text
aiden/
├── .gitattributes                    # Git LFS rules for model files
├── .gitignore
├── README.md
│
├── backend/                           # FastAPI Python backend
│   ├── app/
│   │   ├── api/v1/                   # Auth, pipelines, analytics, approvals, audit, websocket
│   │   │   ├── auth.py               #   POST /signup, /login, GET /me
│   │   │   ├── pipelines.py          #   CRUD + from-prompt, run, cancel, RAG search
│   │   │   ├── analytics.py          #   GET /dashboard, /export
│   │   │   ├── approvals.py          #   GET /, POST /approve, /reject
│   │   │   ├── audit.py              #   GET /, GET /export
│   │   │   ├── websocket.py          #   WS /ws/{client_id}
│   │   │   └── deps.py               #   JWT dependency injection
│   │   ├── core/                     # Business logic engine
│   │   │   ├── intent_parser.py      #   3-tier: Ollama → HF → rule-based
│   │   │   ├── agent_orchestrator.py #   Multi-agent coordination (smolagents)
│   │   │   ├── agent_registry.py     #   Agent registration
│   │   │   ├── agent_loader.py       #   PEFT adapter loader
│   │   │   ├── pipeline_builder.py   #   Pipeline code generation
│   │   │   ├── pipeline_executor.py  #   Execution engine
│   │   │   ├── rag_memory.py         #   RAG vector store (384-dim embeddings)
│   │   │   ├── self_healing.py       #   Self-healing engine
│   │   │   ├── db_connector.py       #   Database connection testing
│   │   │   ├── init_db.py            #   Seed default users
│   │   │   └── security.py           #   JWT, password hashing
│   │   ├── agents/                   # Specialized AI agents
│   │   │   ├── base_agent.py         #   BaseAIDENAgent abstract class
│   │   │   ├── extraction_agent.py   #   Schema discovery
│   │   │   ├── analysis_agent.py     #   Data profiling
│   │   │   ├── pipeline_builder_agent.py  # Code generation
│   │   │   └── self_healing_agent.py #   Error diagnosis + fix
│   │   ├── services/                 # External service integrations
│   │   │   ├── hf_service.py         #   HuggingFace model loading + embeddings
│   │   │   ├── database_service.py   #   Database operations
│   │   │   └── supabase_service.py   #   Supabase auth integration
│   │   ├── models/                   # SQLAlchemy ORM models
│   │   │   ├── user.py, pipeline.py, execution.py
│   │   │   ├── approval.py, audit.py, analytics.py
│   │   ├── schemas/                  # Pydantic schemas
│   │   │   ├── auth.py, pipeline.py, token.py
│   │   │   ├── analytics.py, approval.py, audit.py
│   │   ├── templates/                # Jinja2 templates
│   │   │   ├── airflow_dag.j2        # Airflow DAG template
│   │   │   └── dbt_model.j2          # dbt model template
│   │   ├── tools/                    # Agent tools
│   │   │   ├── code_generator_tools.py
│   │   │   └── database_tools.py
│   │   ├── fine_tuning/              # LoRA fine-tuning module
│   │   │   └── train.py
│   │   ├── config.py                 # Pydantic settings
│   │   ├── database.py               # Async SQLAlchemy engine
│   │   ├── main.py                   # FastAPI application entrypoint
│   │   └── tasks.py                  # Background task definitions
│   ├── data/                         # Training datasets
│   │   ├── training/                 #   Multimodal training data
│   │   ├── synthetic/                #   Generated synthetic data
│   │   ├── intent_dataset.jsonl      #   Intent parsing (200 examples)
│   │   ├── self_healing_dataset.jsonl#   Self-healing (150 examples)
│   │   ├── monitoring_dataset.jsonl  #   Monitoring (100 examples)
│   │   ├── extraction_dataset.jsonl  #   Extraction (80 examples)
│   │   └── pipeline_builder_dataset.jsonl  # Builder (90 examples)
│   ├── models/                       # Model storage
│   │   ├── adapters/                 #   LoRA adapters (tracked in Git)
│   │   ├── base/                     #   Base models (gitignored)
│   │   ├── merged/                   #   Merged GGUF models (gitignored)
│   │   └── cache/                    #   HF Hub cache (gitignored)
│   ├── scripts/                      # Utility scripts
│   │   ├── train_agent.py            #   Unified LoRA trainer (5 agent types)
│   │   ├── train_multimodal.py       #   Multimodal LoRA trainer (LLaVA/Qwen-VL)
│   │   ├── generate_synthetic_data.py#   Template + LLM data generator
│   │   ├── generate_multimodal_data.py#  Multimodal synthetic data generator
│   │   ├── download_models.py        #   HF model downloader (intent, embedding, code, agent, multimodal)
│   │   └── seed_user.py              #   Create test users
│   ├── tests/                        # pytest test suite
│   │   ├── test_api/                 #   Auth, pipelines, execution tests
│   │   ├── test_core/                #   Intent parser, RAG memory tests
│   │   └── test_services/            #   DB connector tests
│   ├── alembic/                      # Database migrations
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/                          # React + Vite frontend
│   ├── src/
│   │   ├── api/                      # Axios API clients  │   │   │   ├── auth.ts, pipelines.ts
  │   │   │   ├── analytics.ts, approvals.ts, audit.ts
  │   │   │   ├── multimodal.ts         #   Vision-language API client
│   │   │   └── index.ts              # Axios instance + interceptors
│   │   ├── components/
│   │   │   ├── auth/                 # Login, Signup, ProtectedRoute
│   │   │   ├── builder/              # PipelineCanvas, NodePalette, etc.
│   │   │   ├── chat/                 # ChatInterface, MessageInput, SuggestionChips
│   │   │   ├── analytics/            # MetricsKpiCard, AIInsightCard
│   │   │   ├── dashboard/            # StatsCard
│   │   │   ├── common/               # Header, ErrorBoundary, LoadingSpinner, etc.
│   │   │   ├── layout/               # AppLayout, MobileNav
│   │   │   ├── ui/                   # Button, Card, Input, Modal, Toast, etc.
│   │   │   ├── multimodal/           # Multimodal UI (scaffold)
│   │   │   └── providers/            # ThemeProvider, ToastProvider
│   │   ├── pages/                    # 22 route pages
│   │   ├── store/                    # Zustand stores
│   │   ├── hooks/                    # useWebSocket, useTheme, etc.
│   │   ├── types/                    # TypeScript interfaces
│   │   └── utils/                    # Helpers (cn)
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── vercel.json
│   └── package.json
│
├── infrastructure/docker/            # Docker Compose + Nginx
│   ├── docker-compose.yml            # Dev stack
│   ├── docker-compose.prod.yml       # Production stack
│   └── nginx/nginx.conf              # Reverse proxy config
│
├── docs/                             # Documentation
│   ├── SETUP.md, ARCHITECTURE.md, API.md
│   └── PROJECT_STATUS_REPORT.md
│
└── .gitattributes                    # Git LFS + line ending rules
```

---

## Deployment Flow Concept

### Overview

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Browser    │    │  FastAPI     │    │  Database    │
│  (React SPA) │───▶│  (Backend)   │───▶│ (PostgreSQL) │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                   │
       │  /api/v1/*        │  asyncpg/SQLAlchemy│
       │  (REST)           │                   │
       │                   │                   │
       │  WS /api/v1/ws    │                   │
       │  (WebSocket)      │                   │
       │                   │                   │
       ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Frontend    │    │  AI Layer    │    │  Cache/Queue │
│  (Vercel/CDN)│    │(Ollama/HF)   │    │ (Redis)      │
└──────────────┘    └──────────────┘    └──────────────┘
```

### Frontend Deployment

The React SPA is built into static files (`npm run build`) and served via:

| Option | Platform | Notes |
|--------|----------|-------|
| **Vercel** | `vercel deploy` | Zero-config, automatic HTTPS, CDN |
| **Docker** | `frontend/Dockerfile` | Nginx-alpine serving static files |
| **S3 + CloudFront** | `aws s3 sync` | Pair with CloudFront CDN for global distribution |

```nginx
# nginx.conf — Frontend
location / {
    root /usr/share/nginx/html;
    index index.html;
    try_files $uri $uri/ /index.html;  # SPA fallback
}

location /api/ {
    proxy_pass http://backend:8000/api/;
}

location /ws/ {
    proxy_pass http://backend:8000/ws/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
}
```

### Backend Deployment

The FastAPI backend runs as a Python ASGI application behind a production WSGI/ASGI server:

```yaml
# docker-compose snippet
services:
  backend:
    build: ./backend
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000
    environment:
      - DATABASE_URL=postgresql+asyncpg://user:pass@postgres:5432/aiden
      - REDIS_URL=redis://redis:6379/0
    depends_on: [postgres, redis]
```

| Component | Production | Development |
|-----------|-----------|-------------|
| **Server** | Uvicorn behind Gunicorn | `uvicorn --reload` |
| **Database** | PostgreSQL 15 + asyncpg | SQLite + aiosqlite |
| **Cache** | Redis 7 | In-memory fallback |
| **Vector DB** | Qdrant | In-memory fallback |
| **LLM** | Ollama (local) or HF (cloud) | Ollama (local) |

### Database Deployment

| Environment | Connection | Migration |
|-------------|-----------|-----------|
| **Local Dev** | `sqlite+aiosqlite:///./aiden.db` | `alembic upgrade head` |
| **Production** | `postgresql+asyncpg://user:pass@host:5432/aiden` | `alembic upgrade head` |
| **CI/CD** | Ephemeral PostgreSQL (GitHub Actions) | `alembic upgrade head` |

```bash
# Migration workflow
alembic revision --autogenerate -m "description"
alembic upgrade head
```

### Multimodal Deployment (model required)

The multimodal pipeline adds vision-language capabilities for analyzing pipeline diagrams, schema screenshots, and architecture images:

```
┌──────────────┐    ┌─────────────────────────┐    ┌──────────────┐
│  Image       │    │  multimodal_service.py  │    │  LLaVA /     │
│  Upload (UI) │───▶│  /api/v1/multimodal/*   │───▶│  Qwen-VL     │
│  (planned)   │    │  (implemented)           │    │  (7B model)  │
└──────────────┘    └─────────────────────────┘    └──────────────┘
                            │
                            ▼
                    ┌──────────────────┐
                    │  Fine-Tuned      │
                    │  Adapter (PEFT)  │
                    │  models/adapters/ │
                    └──────────────────┘
```

**Implemented components:**
- `multimodal_service.py` — Singleton vision-language service (LLaVA default, Qwen-VL optional), 4-bit quantization, PEFT adapter loading
- `POST /api/v1/multimodal/analyze` — Base64 image + text prompt
- `POST /api/v1/multimodal/upload` — File upload + text prompt
- `GET /api/v1/multimodal/status` — Service availability check
- `train_multimodal.py` — LoRA fine-tuning on image+text data
- `frontend/src/api/multimodal.ts` — Frontend API client

**To enable:** set `MULTIMODAL_ENABLED=True` in `.env` and download the model with `python scripts/download_models.py --model multimodal`

### Network Architecture (Docker)

```
Internet → Nginx (port 80/443)
              │
              ├── / → Frontend static files (SPA)
              ├── /api/ → Backend (port 8000)
              ├── /ws/ → WebSocket (port 8000)
              │
Backend connects to:
  ├── PostgreSQL (port 5432)
  ├── Redis (port 6379)
  ├── Qdrant (port 6333, optional)
  ├── Ollama (port 11434, local)
  └── MinIO (port 9000, optional S3 storage)
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
| `POST` | `/api/v1/pipelines/from-prompt` | AI-powered pipeline creation (Ollama → HF → rule-based) |
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

### Analytics / Approvals / Audit

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/analytics/dashboard` | Dashboard KPIs, trends, costs |
| `GET` | `/api/v1/analytics/pipelines/{id}` | Pipeline metrics |
| `GET` | `/api/v1/analytics/export` | Export CSV/PDF report |
| `GET` | `/api/v1/approvals` | List approval requests |
| `POST` | `/api/v1/approvals/{id}/approve` | Approve request |
| `POST` | `/api/v1/approvals/{id}/reject` | Reject request |
| `GET` | `/api/v1/audit` | List audit logs |
| `GET` | `/api/v1/audit/export` | Export audit logs CSV |

### WebSocket

`WS /api/v1/ws/{client_id}` — Real-time pipeline status updates

---

## Model Training

Training datasets (620 examples across 5 agents) are already generated in `backend/data/`. To regenerate or create larger datasets:

```bash
python scripts/generate_synthetic_data.py --agent all --count 500
```

Train an agent with LoRA fine-tuning:

```bash
python scripts/train_agent.py --agent intent --data data/intent_dataset.jsonl --epochs 3

# Train all 5 agents sequentially
for agent in intent self_healing monitoring extraction pipeline_builder; do
    python scripts/train_agent.py --agent $agent --data data/${agent}_dataset.jsonl --output ./models
done
```

Outputs go to `./models/{agent_type}/` — auto-detected by `agent_loader.py` on next restart.

Trainable agents: `intent`, `self_healing`, `monitoring`, `extraction`, `pipeline_builder`

---

## Current Status

| Area | Status |
|------|--------|
| Frontend build | ✅ Production build succeeds |
| Backend API | 15+ endpoints (auth, pipelines, analytics, approvals, audit, websocket) |
| Backend DB | SQLite (dev) + PostgreSQL (prod) via Alembic migrations |
| Auth flow | JWT, signup, login, protected routes |
| LLM Integration | Ollama (llama3.2:1b) → HF → rule-based fallback |
| RAG Memory | 384-dim MiniLM embeddings, in-memory vector store |
| Multi-Agent | Orchestrator w/ 4 agents (extraction, analysis, builder, self-healing) |
| Pipeline Builder | AI-powered creation from natural language |
| Code Generation | Airflow DAG + dbt model generation |
| Self-Healing | Error diagnosis, fix proposals, approval workflow |
| Training Pipeline | LoRA fine-tuning for 5 agent types, 620 synthetic examples |
| Monitoring | WebSocket live updates, execution logs |
| Multimodal Service | LLaVA/Qwen-VL service, API routes (/analyze, /upload, /status), training script, frontend API client |
| CI/CD | GitHub Actions |

---

### Known Limitations

- Pipeline execution creates records but does not run a real data movement engine yet — execution is a simulated state machine
- HuggingFace model loading (for the HF LLM tier) requires internet and a valid `HF_TOKEN` (the Ollama tier works fully offline)
- Frontend main JS chunk exceeds 500 kB (code-splitting planned)
- Frontend has existing lint warnings (hook deps, unused catch params)
- Dual CSS systems: Tailwind + MUI/Emotion (potential bundle bloat; migration to Tailwind-only in progress)
- Multimodal service and API endpoints are implemented and tested; the LLaVA model must be downloaded separately (`--model multimodal`) and enabled (`MULTIMODAL_ENABLED=True`) before use
- Frontend multimodal UI components are scaffolded but not yet built (`frontend/src/components/multimodal/`)

## Development

```bash
# Frontend checks
cd frontend && npx tsc --noEmit && npm test -- --run && npm run build

# Backend checks
cd backend && pytest -v

# Start backend
uvicorn app.main:app --reload --port 8000

# Pull models (Ollama)
ollama pull llama3.2:1b
```

### Commit Convention

| Prefix | Example |
|--------|---------|
| `feat:` | `feat: add multimodal image analysis endpoint` |
| `fix:` | `fix: resolve RAG min_score default mismatch` |
| `refactor:` | `refactor: split HF service imports` |
| `docs:` | `docs: update deployment flow diagram` |
| `test:` | `test: add intent parser Ollama fallback test` |
| `chore:` | `chore: add .gitattributes with Git LFS rules` |

---

## Git Safety

`.env`, `*.db`, `logs/`, `models/cache/`, `models/base/`, `models/merged/`, `venv/`, `node_modules/`, `__pycache__/`, `dist/`, and large model binaries (`*.gguf`, `*.safetensors`, `*.bin`) are excluded via `.gitignore` and `.gitattributes`. LoRA adapters (`models/adapters/`) are tracked in Git since they're small (~50 MB). Never commit real secrets — use `.env` locally and `.env.example` in git.
