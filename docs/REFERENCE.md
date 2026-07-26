# AIDEN — Complete Project Reference

> **Date:** July 25, 2026
> **Purpose:** A top-to-bottom guide covering every folder, file, function, feature, design decision, and pending work item in the AIDEN project.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Folder Structure Explained](#3-folder-structure-explained)
4. [Frontend Deep Dive](#4-frontend-deep-dive)
5. [Backend Deep Dive](#5-backend-deep-dive)
6. [Infrastructure & Deployment](#6-infrastructure--deployment)
7. [AI & ML Pipeline](#7-ai--ml-pipeline)
8. [Design System](#8-design-system)
9. [Data Flow Patterns](#9-data-flow-patterns)
10. [Pending Work & Roadmap](#10-pending-work--roadmap)

---

## 1. Project Overview

AIDEN is a full-stack AI-assisted data pipeline platform. It lets users describe a data pipeline in natural language (e.g., *"Build a daily sales ETL from PostgreSQL to Snowflake"*) and generates the pipeline code, DAG, tests, and configuration automatically.

### Core Value Proposition

| Capability | How AIDEN Does It |
|-----------|-------------------|
| **Natural Language → Pipeline** | Intent Parser (Ollama → HuggingFace → rule-based fallback) |
| **Multi-Agent Orchestration** | 15 specialized agents coordinated by an orchestrator |
| **RAG Memory** | 384-dim MiniLM embeddings store past intents for few-shot context |
| **Self-Healing** | Error diagnosis, fix proposals, risk assessment, approval workflow |
| **Pipeline Execution** | Multi-stage engine with WebSocket real-time status |
| **Diagram Analysis** | Vision-language (LLaVA/Qwen-VL) for pipeline diagram understanding |

### Target Users

- Data engineers who want to build pipelines faster
- Teams that need a collaborative pipeline management platform
- Organizations that want AI-assisted data governance and monitoring

### Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 + TypeScript 6.x + Vite 8.x + Tailwind CSS 3.x |
| **State** | Zustand 5.x (6 stores) |
| **Routing** | React Router 7.x (22 pages) |
| **Animations** | Framer Motion 12.x |
| **Backend** | Python 3.13 + FastAPI + SQLAlchemy 2.x (async) |
| **Auth** | JWT (python-jose) + bcrypt (passlib) |
| **Database** | SQLite (dev) / PostgreSQL 15 (prod) via Alembic |
| **AI/LLM** | Ollama (llama3.2:1b), HuggingFace Transformers, smolagents |
| **Vector DB** | In-memory (384-dim MiniLM) / Qdrant (optional) |
| **Vision** | LLaVA 7B / Qwen-VL (multimodal service) |
| **Infrastructure** | Docker Compose, Nginx, Redis, MinIO |

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            AIDEN SYSTEM ARCHITECTURE                            │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                          FRONTEND (React SPA)                           │   │
│  │                                                                         │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │   │
│  │  │ Dashboard│ │ Pipelines│ │ Builder  │ │ Analytics│ │ Agents   │     │   │
│  │  │ Page     │ │ Page     │ │ Page     │ │ Page     │ │ Page     │     │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘     │   │
│  │       │             │            │            │            │           │   │
│  │       ▼             ▼            ▼            ▼            ▼           │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │  │                    API CLIENTS (Axios)                          │   │   │
│  │  │  auth.ts  pipelines.ts  analytics.ts  approvals.ts  audit.ts   │   │   │
│  │  │  multimodal.ts                                                  │   │   │
│  │  └─────────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                    │                                             │
│                          REST / WS │                                             │
│                                    ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         BACKEND (FastAPI)                               │   │
│  │                                                                         │   │
│  │  ┌──────────────────────────────────────────────────────────────────┐   │   │
│  │  │                    API GATEWAY (api/v1/)                         │   │   │
│  │  │  auth.py  pipelines.py  analytics.py  approvals.py  audit.py     │   │   │
│  │  │  websocket.py  health.py  multimodal.py  deps.py                │   │   │
│  │  └──────────────────────────────────────────────────────────────────┘   │   │
│  │                                    │                                     │   │
│  │                                    ▼                                     │   │
│  │  ┌──────────────────────────────────────────────────────────────────┐   │   │
│  │  │                     SERVICE LAYER                               │   │   │
│  │  │  hf_service.py  multimodal_service.py  database_service.py      │   │   │
│  │  │  supabase_service.py                                             │   │   │
│  │  └──────────────────────────────────────────────────────────────────┘   │   │
│  │                                    │                                     │   │
│  │                                    ▼                                     │   │
│  │  ┌──────────────────────────────────────────────────────────────────┐   │   │
│  │  │                      CORE LAYER                                 │   │   │
│  │  │  intent_parser.py  agent_orchestrator.py  pipeline_builder.py   │   │   │
│  │  │  pipeline_executor.py  rag_memory.py  self_healing.py           │   │   │
│  │  │  security.py  init_db.py  db_connector.py                       │   │   │
│  │  └──────────────────────────────────────────────────────────────────┘   │   │
│  │                                    │                                     │   │
│  │                                    ▼                                     │   │
│  │  ┌──────────────────────────────────────────────────────────────────┐   │   │
│  │  │                     DATA LAYER (Models + DB)                    │   │   │
│  │  │  User  Pipeline  PipelineExecution  Approval  AuditLog          │   │   │
│  │  │  SQLite (dev) / PostgreSQL (prod)  •  Alembic migrations        │   │   │
│  │  └──────────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                    │                                             │
│         ┌──────────────────────────┼──────────────────────────┐                 │
│         ▼                          ▼                          ▼                 │
│  ┌──────────────┐        ┌──────────────────┐       ┌──────────────┐           │
│  │  Ollama      │        │  HuggingFace      │       │  Qdrant      │           │
│  │  (llama3.2)  │        │  (Transformers)   │       │  (Vector DB) │           │
│  │  Local LLM   │        │  Cloud LLM tier   │       │  RAG store   │           │
│  └──────────────┘        └──────────────────┘       └──────────────┘           │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Folder Structure Explained

### Root Level Files

| File | Purpose | Key Details |
|------|---------|-------------|
| `README.md` | Project overview, quick start, API docs | 800+ lines, covers all features |
| `Makefile` | One-command setup (20 targets) | `make install`, `make dev`, `make test`, `make docker-up` |
| `.gitattributes` | Git LFS rules + line endings | Tracks `.gguf`, `.safetensors`, `.bin` via Git LFS |
| `.gitignore` | Ignored files | models/, data/, venv/, node_modules/, .env |

### `backend/` — FastAPI Python Backend

#### `backend/app/api/v1/` — API Routers (9 files)

| File | Purpose | Endpoints |
|------|---------|-----------|
| `auth.py` | User authentication | `POST /signup`, `POST /login`, `GET /me` |
| `pipelines.py` | Pipeline CRUD + execution | 12 endpoints (CRUD, run, cancel, from-prompt, RAG search, test-connection) |
| `analytics.py` | Dashboard metrics | `GET /dashboard`, `GET /pipelines/{id}`, `GET /export` |
| `approvals.py` | Approval workflow | `GET /`, `POST /{id}/approve`, `POST /{id}/reject` |
| `audit.py` | Audit log queries | `GET /`, `GET /export` |
| `websocket.py` | Real-time updates | `WS /ws/{client_id}` |
| `health.py` | Detailed health checks | `GET /health`, `GET /health/live`, `GET /health/ready` |
| `multimodal.py` | Vision-language analysis | `POST /analyze`, `POST /upload`, `GET /status` |
| `deps.py` | JWT dependency injection | `get_current_user`, `get_current_active_user` |

#### `backend/app/core/` — Business Logic (12 files)

| File | Purpose |
|------|---------|
| `intent_parser.py` | 3-tier natural language → pipeline config (Ollama → HF → rule-based) |
| `agent_orchestrator.py` | Coordinates 15 specialized agents via smolagents |
| `agent_registry.py` | Registers and discovers agents |
| `agent_loader.py` | Loads PEFT fine-tuned adapters |
| `pipeline_builder.py` | Generates pipeline code (Airflow DAGs, dbt models) |
| `pipeline_executor.py` | Multi-stage execution engine (init → extract → transform → load → finalize) |
| `rag_memory.py` | Vector store for semantic search (384-dim MiniLM embeddings) |
| `self_healing.py` | Error diagnosis, fix proposals, risk assessment, approval workflow |
| `db_connector.py` | Database connection testing (PostgreSQL, SQLite, BigQuery) |
| `init_db.py` | Seeds default users on first startup |
| `security.py` | JWT token creation/validation, password hashing |

#### `backend/app/agents/` — Specialized AI Agents (5 files)

| File | Purpose |
|------|---------|
| `base_agent.py` | Abstract base class with system prompts, tools, logging |
| `extraction_agent.py` | Schema discovery and data sampling |
| `analysis_agent.py` | Data profiling and anomaly detection |
| `pipeline_builder_agent.py` | Code generation (Airflow DAGs, dbt models) |
| `self_healing_agent.py` | Error diagnosis and fix proposal generation |

#### `backend/app/services/` — External Integrations (4 files)

| File | Purpose |
|------|---------|
| `hf_service.py` | HuggingFace model loading, embedding generation, LLM inference |
| `multimodal_service.py` | LLaVA/Qwen-VL vision-language inference with CPU fallback |
| `database_service.py` | Generic database operations |
| `supabase_service.py` | Supabase auth integration (scaffolded) |

#### `backend/app/models/` — SQLAlchemy ORM (7 files)

| Model | Table | Key Fields |
|-------|-------|------------|
| `User` | `users` | id, username, email, hashed_password, is_active, is_superuser |
| `Pipeline` | `pipelines` | id, name, source_type, destination_type, config (JSON), schedule, code, status |
| `PipelineExecution` | `pipeline_executions` | id, pipeline_id, status, started_at, duration, logs (JSON) |
| `Approval` | `approvals` | id, pipeline_id, action, status, requested_by, risk_score |
| `AuditLog` | `audit_logs` | id, user_id, action, resource, ip_address, status |
| `AnalyticsEvent` | `analytics_events` | id, pipeline_id, metric_name, metric_value, timestamp |

#### `backend/app/schemas/` — Pydantic Schemas (6 files)

| File | Key Schemas |
|------|-------------|
| `auth.py` | `SignupRequest`, `LoginRequest`, `UserResponse` |
| `pipeline.py` | `PipelineCreate`, `PipelineUpdate`, `PipelineResponse`, `PromptRequest` |
| `token.py` | `Token`, `TokenPayload` |
| `analytics.py` | `DashboardResponse`, `KPIData`, `TrendData` |
| `approval.py` | `ApprovalResponse`, `ApprovalAction` |
| `audit.py` | `AuditLogResponse`, `AuditFilter` |

#### `backend/scripts/` — Utility Scripts (7 files)

| File | Purpose | Usage |
|------|---------|-------|
| `generate_synthetic_data.py` | Generates 620+ training examples across 5 agents | `python scripts/generate_synthetic_data.py` |
| `generate_multimodal_data.py` | Generates 200 synthetic diagram analysis examples | `python scripts/generate_multimodal_data.py` |
| `train_agent.py` | LoRA fine-tuning for any agent type | `python scripts/train_agent.py --agent intent --data data/...` |
| `train_multimodal.py` | LoRA fine-tuning for LLaVA/Qwen-VL | `python scripts/train_multimodal.py --data data/...` |
| `download_models.py` | Downloads HF models (intent, embedding, code, agent, multimodal) | `python scripts/download_models.py --model embedding` |
| `seed_user.py` | Creates test users | `python scripts/seed_user.py` |
| `test_ai.py` | Quick AI integration test | `python scripts/test_ai.py` |

---

### `frontend/` — React + Vite SPA

#### `frontend/src/pages/` — Route Pages (22 files + 1 duplicate)

| Page | Route | Features |
|------|-------|----------|
| `LoginPage.tsx` | `/login` | Email/password form, social login buttons |
| `SignupPage.tsx` | `/signup` | Registration form with validation |
| `DashboardPage.tsx` | `/` | Stats cards, prompt input, quick actions, activity feed |
| `PipelinesPage.tsx` | `/pipelines` | Pipeline list with status badges |
| `PipelineBuilderPage.tsx` | `/builder` | 3-panel: history + chat + canvas flow |
| `PipelineDetailsPage.tsx` | `/pipelines/:id` | Single pipeline detail view |
| `AgentPage.tsx` | `/agents` | 15 agent cards, search/filter/sort, detail modals |
| `AnalyticsPage.tsx` | `/analytics` | KPI cards, Recharts (Area/Pie/Bar), insights |
| `ApprovalsPage.tsx` | `/approvals` | Approval request list with approve/reject |
| `AuditLogsPage.tsx` | `/audit-logs` | Searchable table, date range, pagination, CSV export |
| `MonitoringPage.tsx` | `/monitoring` | Pipeline health monitoring (scaffolded) |
| `NotificationsPage.tsx` | `/notifications` | Notification history |
| `SettingsPage.tsx` | `/settings` | User settings |
| `GettingStartedPage.tsx` | `/getting-started` | Onboarding guide |
| `TemplatesPage.tsx` | `/templates` | Pipeline templates |
| `MultimodalPage.tsx` | `/multimodal` | PipelineAnalyzer component (image upload + analysis) |
| `Chat.tsx` | `/chat` | Chat interface (standalone) |
| `NotFoundPage.tsx` | `*` | 404 catch-all |
| `AboutPage.tsx` | `/about` | About AIDEN |
| `TermsPage.tsx` | `/terms` | Terms of service |
| `PrivacyPage.tsx` | `/privacy` | Privacy policy |
| `ChangelogPage.tsx` | `/changelog` | Version changelog |

#### `frontend/src/components/` — Reusable Components

| Directory | Files | Purpose |
|-----------|-------|---------|
| `auth/` | `Login.tsx`, `Signup.tsx`, `ProtectedRoute.tsx` | Authentication UI and route guards |
| `builder/` | `PipelineCanvas.tsx`, `PipelineNode.tsx`, `NodePalette.tsx`, `NodePropertiesPanel.tsx`, `NodeDetailsModal.tsx`, `CanvasControls.tsx`, `AgentManagerPanel.tsx` | Pipeline builder workspace |
| `chat/` | `ChatInterface.tsx`, `MessageInput.tsx`, `MessageList.tsx`, `SuggestionChips.tsx` | Chat-based interaction |
| `analytics/` | `MetricsKpiCard.tsx`, `AIInsightCard.tsx` | Analytics dashboard components |
| `dashboard/` | `StatsCard.tsx` | Dashboard stat cards |
| `common/` | `Header.tsx`, `ErrorBoundary.tsx`, `LoadingSpinner.tsx`, `CommandPalette.tsx`, `AmbientFlow.tsx` | Shared UI components |
| `layout/` | `AppLayout.tsx`, `MobileNav.tsx` | App shell and responsive navigation |
| `ui/` | `Button.tsx`, `Card.tsx`, `Input.tsx`, `Modal.tsx`, `Toast.tsx`, `Skeleton.tsx`, `PageTransition.tsx`, etc. | Design system primitives |
| `multimodal/` | `PipelineAnalyzer.tsx` | Image upload + vision analysis UI |
| `providers/` | `ThemeProvider.tsx`, `ToastProvider.tsx` | React context providers |

#### `frontend/src/store/` — Zustand State Stores (7 stores)

| Store | State | Actions |
|-------|-------|---------|
| `authStore` | user, token, isAuthenticated | login, logout, signup, checkAuth |
| `pipelineStore` | pipelines, currentPipeline, executions | fetchPipelines, createFromPrompt, runPipeline |
| `agentStore` | agents, selectedAgent, activities | fetchAgents, addActivity |
| `analyticsStore` | kpis, trends, costs, insights | fetchDashboard |
| `notificationStore` | notifications, toasts | addNotification, dismissNotification |
| `themeStore` | mode (dark/light) | toggleTheme |
| `index.ts` | Re-exports all stores | — |

#### `frontend/src/api/` — Axios API Clients (7 files)

| File | Key Methods |
|------|-------------|
| `index.ts` | Axios instance with JWT interceptor |
| `auth.ts` | `login()`, `signup()`, `getMe()` |
| `pipelines.ts` | `getAll()`, `create()`, `createFromPrompt()`, `run()` |
| `analytics.ts` | `getDashboard()`, `getPipelineMetrics()`, `exportReport()` |
| `approvals.ts` | `getAll()`, `approve()`, `reject()` |
| `audit.ts` | `list()`, `exportCSV()` |
| `multimodal.ts` | `analyze()`, `uploadAndAnalyze()`, `getStatus()` |

---

### `infrastructure/docker/` — Docker Configuration

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Development stack: Postgres, Redis, Qdrant, MinIO, backend, frontend, Nginx |
| `docker-compose.prod.yml` | Production stack (missing MinIO service) |
| `nginx/nginx.conf` | Reverse proxy: SPA fallback, API proxy, WebSocket proxy |
| `alembic.ini` + `alembic/` | Database migration configuration |

---

## 4. Frontend Deep Dive

### Route Structure

```
/                     → DashboardPage (protected, default)
/login                → LoginPage (public)
/signup               → SignupPage (public)
/pipelines            → PipelinesPage (protected)
/pipelines/:id        → PipelineDetailsPage (protected)
/builder              → PipelineBuilderPage (protected)
/monitoring           → MonitoringPage (protected)
/agents               → AgentsPage (protected)
/analytics            → AnalyticsPage (protected)
/notifications        → NotificationsPage (protected)
/approvals            → ApprovalsPage (protected)
/audit-logs           → AuditLogsPage (protected)
/settings             → SettingsPage (protected)
/multimodal           → MultimodalPage (protected)
/getting-started      → GettingStartedPage (protected)
/templates            → TemplatesPage (protected)
/about, /terms, /privacy, /changelog → Public info pages
*                     → NotFoundPage (catch-all)
```

### Component Architecture Pattern

Every page follows this pattern:

```tsx
const PageName: React.FC = () => {
  // 1. State (useState, useMemo, useCallback)
  // 2. Store hooks (useStore())
  // 3. Effects (useEffect for data fetching)
  // 4. Event handlers
  // 5. Computed values (useMemo)
  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
    {/* Page content */}
  </motion.div>;
};
```

### State Management Flow

```
User Action → Component → Zustand Store Action → API Client (Axios) → Backend
                                                      │
                                                 JWT Interceptor
                                                 (auto-attaches token)
                                                      │
                                                 Response → Store Update → Re-render
```

---

## 5. Backend Deep Dive

### API Router Pattern

Every router follows this pattern:

```python
router = APIRouter()

@router.get("/endpoint")
async def handler(
    # 1. Path/query/body params
    # 2. Depends(get_current_user) for auth
    db: AsyncSession = Depends(get_db),
):
    # 3. Business logic
    # 4. Return dict or Pydantic model
```

### Authentication Flow

```
Login: POST /api/v1/auth/login
  → Verify password (bcrypt)
  → Create JWT (python-jose, HS256)
  → Return { access_token, token_type: "bearer" }

Verify: Depends(get_current_user)
  → Extract Bearer token from Authorization header
  → Decode JWT, extract user_id
  → Query user from DB
  → Return User model
```

### Intent Parsing (3-Tier)

```
User Prompt → IntentParser.parse()
  │
  ├── Tier 1: Ollama (local LLM)
  │   → llama3.2:1b via Ollama API
  │   → Extracts JSON from response
  │   → Validates required fields
  │
  ├── Tier 2: HuggingFace (cloud LLM)
  │   → Llama 3.2 3B Instruct via HF Inference API
  │   → Same extraction + validation
  │
  └── Tier 3: Rule-based fallback
      → Keyword matching
      → Default values for missing fields
```

### Pipeline Execution Engine

```
POST /pipelines/{id}/run
  → Create PipelineExecution (status: "pending")
  → Execute multi-stage process:
      1. _init_stage(): Validate config, generate DAG
      2. _extract_stage(): Connect to source, read data
      3. _transform_stage(): Apply transformations
      4. _load_stage(): Write to destination
      5. _finalize_stage(): Update execution record
  → Emit WebSocket status updates at each stage
  → Return execution ID
```

---

## 6. Infrastructure & Deployment

### Docker Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `postgres` | postgres:15 | 5432 | Primary database |
| `redis` | redis:7 | 6379 | Cache + message broker |
| `qdrant` | qdrant/qdrant:v1.7.0 | 6333 | Vector database |
| `minio` | minio/minio | 9000/9001 | S3-compatible storage |
| `backend` | Python 3.11 | 8000 | FastAPI application |
| `frontend` | Nginx alpine | 80 | React SPA |
| `nginx` | Nginx | 80/443 | Reverse proxy |

### Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `DATABASE_URL` | ✅ | `sqlite+aiosqlite:///./aiden.db` | Database connection string |
| `JWT_SECRET_KEY` | ✅ | — | JWT signing key (generate with `secrets.token_urlsafe(64)`) |
| `CORS_ORIGINS` | ✅ | `[]` | Allowed frontend origins |
| `REDIS_URL` | ⚠️ | `redis://localhost:6379/0` | Redis connection string |
| `QDRANT_URL` | ❌ | `http://localhost:6333` | Qdrant connection |
| `HF_TOKEN` | ❌ | — | HuggingFace API token |
| `MULTIMODAL_ENABLED` | ❌ | `False` | Enable vision-language service |
| `MULTIMODAL_MODEL` | ❌ | `llava-hf/llava-v1.6-mistral-7b-hf` | Vision-language model ID |

---

## 7. AI & ML Pipeline

### Model Inventory

| Model | Size | Purpose | Status |
|-------|------|---------|--------|
| `TinyLlama/TinyLlama-1.1B-Chat-v1.0` | ~2.2 GB | Intent parsing (HF tier) | ⚠️ Downloadable |
| `llama3.2:1b` (Ollama) | ~1 GB | Intent parsing (local tier) | ✅ Pre-installed |
| `sentence-transformers/all-MiniLM-L6-v2` | ~90 MB | Embeddings for RAG | ✅ Downloaded |
| `llava-hf/llava-v1.6-mistral-7b-hf` | ~7 GB | Multimodal vision-language | ❌ Not downloaded |
| `HuggingFaceTB/SmolAgent` | ~2 GB | Agent orchestration | ❌ Not downloaded |

### Training Pipeline

```
Synthetic Data Generator
  → 620+ JSONL examples across 5 agents
  → 200 multimodal examples
      │
      ▼
LoRA Fine-Tuning (train_agent.py / train_multimodal.py)
  → 4-bit quantization (if CUDA) or CPU fallback
  → PEFT LoRA adapters (~50 MB each)
  → Output: models/adapters/{agent_type}/
      │
      ▼
Agent Loading (agent_loader.py)
  → Auto-detects adapters on startup
  → Loads base model + PEFT adapter
  → Falls back to base model if adapter missing
```

### RAG Memory

```
User Query → Generate embedding (MiniLM, 384-dim)
  → Search in-memory vector store (cosine similarity)
  → Return top-k similar past intents
  → Inject as few-shot examples into LLM prompt
  → Store new intent for future queries
```

---

## 8. Design System

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `bg-[#050816]` | `#050816` | Deepest background (hero sections) |
| `bg-[#0D1A2A]` | `#0D1A2A` | Main content background |
| `bg-[#111827]` | `#111827` | Card/surface background |
| `border-[#1E293B]` | `#1E293B` | Subtle borders |
| `text-gray-400` | `#9CA3AF` | Secondary text |
| `text-gray-500` | `#6B7280` | Muted text |
| `text-gray-200` | `#E5E7EB` | Primary text |
| `text-white` | `#FFFFFF` | Headings |
| `purple-400` | `#A78BFA` | Primary accent |
| `purple-500` | `#7C3AED` | Interactive elements |
| `purple-600` | `#9333EA` | Buttons, gradients |
| `cyan-500` | `#06B6D4` | Secondary accent |
| `green-500` | `#22C55E` | Success states |
| `red-500` | `#EF4444` | Error states |
| `amber-500` | `#F59E0B` | Warning states |

### Gradient Patterns

- **Primary button:** `bg-gradient-to-r from-purple-600 to-cyan-600`
- **Hero text:** `bg-gradient-to-r from-purple-400 via-cyan-300 to-purple-400 bg-clip-text text-transparent`
- **Card glow:** `shadow-glow-purple` — purple tinted shadow on hover
- **Hero glow:** `purple-500/10 blur-[120px]` — large glowing orb behind hero

### Typography

- **Font family:** System font stack (Tailwind default)
- **Headings:** `font-bold text-2xl` to `text-5xl`
- **Body:** `text-sm text-gray-400`
- **Monospace:** `font-mono` for technical labels and code blocks

### Spacing

- **Page max width:** `max-w-7xl`
- **Card padding:** `p-5` or `p-6`
- **Section gap:** `space-y-8`
- **Grid columns:** `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`

### Component Patterns

| Component | Classes | Key Styles |
|-----------|---------|------------|
| Glass card | `glass-card p-5 rounded-xl bg-[#111827] border border-[#1E293B]` | Dark surface, subtle border |
| Primary button | `btn-primary px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg` | Gradient background |
| Badge (success) | `badge-success px-2 py-0.5 rounded-full bg-green-500/20 text-green-400` | Translucent background |
| Badge (running) | `badge-info px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400` | Translucent background |
| Badge (error) | `badge-error px-2 py-0.5 rounded-full bg-red-500/20 text-red-400` | Translucent background |

---

## 9. Data Flow Patterns

### Auth Flow (Frontend → Backend)

```
1. User fills login form
2. LoginPage → authStore.login(email, password)
3. authStore → authApi.login(email, password)
4. Axios POST /api/v1/auth/login
5. Backend: verify password → create JWT → return token
6. authStore: store token in localStorage + memory
7. Axios interceptor: attach Bearer token to all subsequent requests
8. ProtectedRoute: check authStore.isAuthenticated → redirect to /login if false
```

### Pipeline Creation Flow (Prompt → Executable)

```
1. User types "Build daily sales ETL from PostgreSQL to Snowflake"
2. DashboardPage → pipelineStore.createFromPrompt(prompt)
3. POST /api/v1/pipelines/from-prompt
4. Backend: IntentParser.parse(prompt)
   a. Ollama → extract JSON config
   b. Validate fields (source, destination, schedule)
   c. RAG memory: search similar intents
   d. Return PipelineCreate
5. Create Pipeline in DB
6. Return PipelineResponse to frontend
7. Frontend: navigate to /pipelines/:id
```

### Real-Time WebSocket Flow

```
1. Frontend connects: WS /api/v1/ws/{client_id}
2. Backend: register client, start heartbeat
3. User triggers pipeline run: POST /pipelines/{id}/run
4. Backend: execute pipeline, at each stage:
   → Emit { type: "pipeline_status", payload: { stage, status, records, duration } }
5. Frontend: handleWebSocketMessage → update nodes in PipelineCanvas
6. On completion: emit { type: "pipeline_complete", payload: { name } }
   → Show notification
```

### Multimodal Analysis Flow

```
1. User uploads image in PipelineAnalyzer
2. multimodalApi.uploadAndAnalyze(file, prompt)
3. POST /api/v1/multimodal/upload (multipart form)
4. Backend: multimodal_service.analyze_diagram(image, prompt)
   a. Decode base64 image
   b. Prepare conversation (LLaVA or Qwen-VL format)
   c. Generate response via model.generate()
   d. Extract assistant response
   e. Return { success, analysis, model, prompt, tokens }
5. Frontend: display analysis result
```

---

## 10. Pending Work & Roadmap

### Priority 1 — Must Fix (Blockers)

| # | Task | File | What's Broken | Fix |
|---|------|------|--------------|-----|
| 1 | **Nginx infra config** | `infrastructure/docker/nginx/nginx.conf` | Broken server block (hanging `# }` comment) | Rewrite with clean `server { }` directive |
| 2 | **CORS for frontend** | Backend `.env` → `CORS_ORIGINS` | Frontend login fails with CORS error on port 5174 | Add port 5174 to CORS_ORIGINS and restart |
| 3 | **LLaVA model download** | `python scripts/download_models.py --model multimodal` | Model not downloaded (~7 GB) | Run download command (takes 30-60 min) |

### Priority 2 — Should Add (Important)

| # | Task | Area | Current State | What's Needed |
|---|------|------|---------------|---------------|
| 4 | **Multimodal training** | `scripts/train_multimodal.py` | Dataset + script ready, model not downloaded | Download LLaVA → run `train_multimodal.py --epochs 3` |
| 5 | **Backend tests** | `backend/tests/` | No test files exist | Write pytest tests for auth, pipelines, health, multimodal |
| 6 | **Frontend tests** | `frontend/src/test/` | Minimal coverage (login modal tests only) | Add tests for PipelineCanvas, Dashboard, Analytics |
| 7 | **Docker prod compose** | `docker-compose.prod.yml` | Missing MinIO service | Add MinIO service + volumes |
| 8 | **Health endpoint integration** | `/api/v1/health` | Implemented but not wired into monitoring | Connect monitoring page to real health data |
| 9 | **.editorconfig + .pre-commit-config.yaml** | Project root | Missing | Add for team consistency |
| 10 | **`animate-fade-in` Tailwind config** | `frontend/tailwind.config.js` | PipelineAnalyzer uses it but may not be defined | Add keyframes + utility class |

### Priority 3 — Nice to Have (Future)

| # | Task | Area | Details |
|---|------|------|---------|
| 11 | **Agent training** | `scripts/train_agent.py` | Run LoRA fine-tuning for all 5 agent types |
| 12 | **Kafka integration** | `infrastructure/kafka/` | Streaming pipeline events (folder doesn't exist) |
| 13 | **Prometheus + Grafana** | `infrastructure/prometheus/`, `infrastructure/grafana/` | Metrics collection and monitoring dashboards |
| 14 | **Rate limiting** | `backend/app/core/rate_limit.py` | API rate limits (file doesn't exist) |
| 15 | **Security audit** | `.secrets.baseline`, `SECURITY.md` | Secret detection and vulnerability reporting |
| 16 | **CI/CD deploy workflow** | `.github/workflows/deploy.yml` | Auto-deploy to staging/production |
| 17 | **Dependabot config** | `.github/dependabot.yml` | Automated dependency updates |
| 18 | **Data versioning** | `data/.dvc` | DVC for dataset versioning |
| 19 | **Mobile nav multimodal link** | `frontend/src/components/layout/MobileNav.tsx` | Add `/multimodal` to bottom nav bar |

### Completion Snapshot

| Area | Completion | Key Metrics |
|------|-----------|-------------|
| **Backend API** | ~92% | 9 routers, 30+ endpoints, all working |
| **Frontend UI** | ~88% | 22 pages, all render, builder + analytics fully featured |
| **Auth Flow** | ~90% | JWT, signup/login/me, demo users |
| **Pipeline Engine** | ~75% | CRUD + execution + WebSocket, needs real data movement |
| **AI/ML** | ~60% | Intent parsing + RAG working, agent orchestration scaffolded |
| **Multimodal** | ~65% | Service + API + frontend implemented, model not downloaded |
| **Testing** | ~35% | Frontend: few component tests. Backend: none |
| **Documentation** | ~85% | README, SETUP, REFERENCE, PROJECT_STATUS all maintained |
| **Infrastructure** | ~55% | Docker compose works, prod missing MinIO, nginx infra broken |
| **CI/CD** | ~40% | GitHub Actions CI exists, no deploy workflow |

### Quick Fix Commands

```bash
# Fix CORS
cd backend
echo 'CORS_ORIGINS=["http://localhost:5173","http://localhost:5174","http://localhost:3000"]' >> .env

# Download LLaVA model (7 GB)
cd backend
python scripts/download_models.py --model multimodal

# Restart backend
uvicorn app.main:app --reload --port 8000

# Generate training data + train (after model download)
python scripts/generate_multimodal_data.py
python scripts/train_multimodal.py --data data/training/multimodal_dataset.jsonl --epochs 1 --batch 1

# Run frontend tests
cd frontend && npm test -- --run

# Build frontend
npm run build
```

---

*This document is auto-generated from the actual project source. Last updated: July 25, 2026.*
