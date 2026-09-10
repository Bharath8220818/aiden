# AIDEN — AI Data Engineering Control Plane

**Design, build, run, and self-heal data platforms from natural language.**

AIDEN (Autonomous Intelligence Data Engineering Nexus) is an AI-native control plane for data engineering. It does **not** replace Airflow, Kafka, dbt, Spark, or Snowflake — it is the unified layer that connects, monitors, and heals them: a React 19 + TypeScript frontend, a FastAPI backend with a multi-agent AI system, a Tool Gateway with v2 connectors, and a CLI for terminal access to the agents.

---

## ✨ What AIDEN does

| Capability | How |
|------------|-----|
| **Design** | Architecture Studio — ReactFlow canvas, 60+ components, animated data-flow edges, AI Copilot that modifies the canvas, live-infrastructure mode |
| **Build** | Natural-language → pipeline (Intent Parser + Pipeline Agent → DAG, SQL, dbt) |
| **Connect** | Tool Gateway — 5 connectors (Airflow, Kafka, PostgreSQL, dbt, Spark) with a universal `test/health/list/get/execute/logs/metrics` interface |
| **Monitor** | Unified Operations Center, real-time agent activity over WebSocket, Prometheus metrics endpoint |
| **Detect & Diagnose** | Monitoring + Debug agents with RAG memory (Qdrant + MiniLM) for similar-incident search |
| **Heal** | Self-Healing Agent — classifies failures (schema drift, connection, code), proposes fixes with risk levels, human approval gate |
| **Notify** | Alert engine with email (SMTP/Brevo) + in-app notifications |
| **CLI** | `aiden` — terminal access to pipelines, agents, SQL, incidents |
| **MCP** | `/api/v1/mcp` — tools served from connector capabilities with RBAC + risk-based approval |

---

## 🚀 Quick start

### Option A — Docker Compose (recommended)

```bash
cd infrastructure/docker
docker compose up -d
# Frontend  http://localhost
# API docs  http://localhost:8000/docs
```

Services: `postgres` (5432), `redis` (6379), `qdrant` (6333), `minio` (9000), `backend` (8000), `frontend` (80/443).

### Option B — Local development

**Backend**

```bash
cd backend
python -m venv venv
venv\Scripts\activate            # Windows
pip install -r requirements.txt
copy .env.example .env           # edit as needed
alembic upgrade head
python scripts\seed_user.py
set PYTORCH_NO_CUDA=1
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Frontend**

```bash
cd frontend
npm install
# .env: VITE_API_URL=http://127.0.0.1:8000  VITE_WS_URL=ws://127.0.0.1:8000
npm run dev
```

Open `http://localhost:5173`. Seeded logins (configurable via `SEED_*_PASSWORD`):
`admin@example.com / Admin123!` and `demo@example.com / demo1234`.

---

## 📁 Repository structure

```text
├── backend/            FastAPI backend — 34 routers, 11 AI agents, Tool Gateway, MCP server
├── frontend/           React 19 + Vite app — 40 pages, Architecture Studio, Ops Center
├── cli/                aiden_cli — interactive REPL, agent & pipeline commands
├── infrastructure/     Docker Compose, nginx, Prometheus config
├── deployment/         Kubernetes manifests (backend/frontend deployments, services, ingress)
├── docs/               Project documentation, status report, fine-tuning guide
├── models/             Local model caches & LoRA adapters (intent-parser)
└── scripts/            Training, data generation, and evaluation utilities
```

---

## 📘 Folder READMEs

- [`backend/README.md`](backend/README.md) — backend setup, env vars, agents, API surface
- [`frontend/README.md`](frontend/README.md) — frontend setup, commands, page map
- [`infrastructure/README.md`](infrastructure/README.md) — Docker Compose, Prometheus, Windows notes
- [`deployment/kubernetes/README.md`](deployment/kubernetes/README.md) — K8s manifests
- [`docs/README.md`](docs/README.md) — docs index

---

## 🛠️ Commands cheat sheet

**Frontend**

```bash
cd frontend
npm run dev        # Vite dev server (5173)
npm run build      # tsc -b + vite build
npm test           # Vitest
npm run lint       # oxlint
```

**Backend**

```bash
cd backend
pytest                                     # test suite
alembic upgrade head                       # migrations
python scripts\download_models.py          # local model weights
python scripts\train_agent.py --agent intent
python scripts\evaluate_intent.py
```

**CLI**

```bash
cd cli
pip install -e .
aiden login
aiden pipeline list
aiden agent run pipeline "daily sales ETL from Postgres to Snowflake"
```

---

## 🔧 Environment variables

| Location | Key vars |
|----------|----------|
| `backend/.env` | `DATABASE_URL`, `REDIS_URL`, `QDRANT_URL`, `JWT_SECRET_KEY`, `HF_TOKEN`, `LLM_BASE_URL`, `LLM_MODEL`, `EMBEDDING_MODEL`, `INTENT_ADAPTER_PATH`, `QDRANT_ENABLED`, `MINIO_*` |
| `frontend/.env` | `VITE_API_URL`, `VITE_WS_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (or `VITE_SUPABASE_PUBLISHABLE_KEY`) |

Start from `backend/.env.example`. SQLite works for local dev; PostgreSQL (Supabase pooler) for production.

---

## 📊 Tech stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript 7, Vite 8, Tailwind CSS 3, Zustand 5, React Router 7, ReactFlow 11, Framer Motion 12, Recharts 3, Monaco Editor |
| **Backend** | Python 3.11+ (3.13 tested), FastAPI 0.141, SQLAlchemy 2.0 (async), Alembic, Pydantic 2, Celery 5.6, Prometheus client |
| **AI / LLM** | HuggingFace Transformers 4.57, smolagents, TinyLlama-1.1B (CPU) or Ollama, PEFT/LoRA adapters |
| **RAG** | Qdrant + MiniLM-L6-v2 (384-dim) with in-memory fallback; three-layer memory (Redis / PostgreSQL / Qdrant) |
| **Auth** | JWT (python-jose) + bcrypt, Supabase Auth (Email + GitHub OAuth) |
| **Infra** | Docker, Docker Compose, Nginx, PostgreSQL 16, Redis 7, Qdrant, MinIO, Prometheus, Kubernetes manifests |

---

## ✅ Current status (September 2026)

- **Frontend** — 40 pages, all built; 34-error TS regression fixed Aug 27
- **Backend** — 34 routers (incl. `mcp`, `incidents`, `projects`, `environments`, `webhooks`, `connections`, `admin`, `monitoring`, `metrics`), 31 wired into `main.py`
- **Agents** — 11 v2 agents with structured schemas + master orchestrator, wired to Tool Gateway connectors with fallback execution
- **Memory** — three-layer memory system (Redis hot cache, PostgreSQL persistence, Qdrant vectors)
- **CLI** — rebuilt interactive REPL with orchestrator commands
- **CI** — GitHub Actions builds backend & frontend Docker images on push/PR
- **Pending** — agent fine-tuning (adapters ready, training pending), Render/Vercel deploy verification, Google OAuth, email confirmation flow — see [`docs/PROJECT_STATUS_REPORT.md`](docs/PROJECT_STATUS_REPORT.md)

---

## 🐛 Known issues & workarounds

| Issue | Workaround |
|-------|------------|
| Slow backend startup on Windows (PyTorch import) | `set PYTORCH_NO_CUDA=1` before `uvicorn` |
| Direct Supabase DB host is IPv6-only | Use the pooler host with `statement_cache_size=0` (already configured) |
| pgbouncer rejects prepared statements | `statement_cache_size=0` on the async engine (already configured) |
| Docker Desktop restarts on Windows | See `infrastructure/docker/ensure-qdrant.ps1` and `docs/QDRANT_WINDOWS.md` |
| `bcrypt>=4.1` breaks passlib 1.7.4 | Pinned to `bcrypt==4.0.1` in `requirements.txt` |
| Large frontend chunk warning | Code-splitting in place (React.lazy, per-page chunks) |

---

## 📚 Documentation

- [`docs/AIDEN_Comprehensive_Project_Documentation.md`](docs/AIDEN_Comprehensive_Project_Documentation.md) — full platform documentation (20 sections)
- [`docs/PROJECT_STATUS_REPORT.md`](docs/PROJECT_STATUS_REPORT.md) — status, pending tasks, next-level roadmap
- [`docs/INTENT_AGENT_FINETUNING.md`](docs/INTENT_AGENT_FINETUNING.md) — fine-tuning pipeline & datasets
- [`docs/QDRANT_WINDOWS.md`](docs/QDRANT_WINDOWS.md) — Qdrant on Windows

## 📝 License

MIT
