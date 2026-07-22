# AIDEN — Team Setup Guide

> **Last Updated:** July 2026  
> **Tech Stack:** React 19 + TypeScript + Vite | FastAPI + SQLAlchemy | SQLite | Tailwind CSS | Zustand

---

## 📋 Prerequisites

| Tool | Version | Check Command |
|------|---------|---------------|
| **Node.js** | ≥ 18.x | `node -v` |
| **npm** | ≥ 9.x | `npm -v` |
| **Python** | ≥ 3.10 | `python --version` |
| **Git** | ≥ 2.x | `git --version` |

---

## 🚀 Quick Start (5 minutes)

### 1. Clone the Repository

```bash
git clone https://github.com/Bharath8220818/aiden.git
cd aiden
```

### 2. Setup Backend

```bash
cd backend

# Create virtual environment (Windows)
python -m venv venv
venv\Scripts\activate

# Create virtual environment (Mac/Linux)
# python -m venv venv
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Seed test user (one-time)
python scripts/seed_user.py

# Start backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend runs at: **http://localhost:8000**  
API docs at: **http://localhost:8000/docs**

### 3. Setup Frontend

```bash
# Open a new terminal
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs at: **http://localhost:5173**

### 4. Verify Setup

```bash
# Test backend health
curl http://localhost:8000/health

# Test frontend — open in browser
# http://localhost:5173
```

### 5. Login with Test User

| Field | Value |
|-------|-------|
| **Email** | `femifriendly@gmail.com` |
| **Password** | `Femi@2005` |

---

## 📁 Project Structure

```
aiden/
├── backend/                          # FastAPI backend
│   ├── app/
│   │   ├── api/v1/                   # API routes
│   │   │   ├── auth.py              # Login, signup, /me endpoints
│   │   │   ├── pipelines.py         # Pipeline CRUD + execution
│   │   │   ├── websocket.py         # Real-time WebSocket events
│   │   │   ├── health.py            # Health check endpoint
│   │   │   └── deps.py              # Auth dependencies
│   │   ├── core/                     # Business logic
│   │   │   ├── intent_parser.py     # LLM + rule-based NLP parser
│   │   │   ├── agent_orchestrator.py# Multi-agent coordination
│   │   │   ├── pipeline_builder.py  # Code generation (DAG/dbt)
│   │   │   ├── pipeline_executor.py # Pipeline execution engine
│   │   │   └── security.py          # JWT + password hashing
│   │   ├── models/                   # SQLAlchemy models
│   │   ├── schemas/                  # Pydantic schemas
│   │   ├── services/
│   │   │   ├── hf_service.py        # HuggingFace model service
│   │   │   └── database_service.py  # DB operations
│   │   ├── agents/                   # AI agents
│   │   │   ├── base_agent.py
│   │   │   ├── extraction_agent.py
│   │   │   ├── analysis_agent.py
│   │   │   └── pipeline_builder_agent.py
│   │   ├── tools/                    # Agent tools
│   │   │   ├── database_tools.py
│   │   │   └── code_generator_tools.py
│   │   ├── config.py                # Settings
│   │   ├── database.py              # DB connection
│   │   └── main.py                  # App entry point
│   ├── templates/                    # Jinja2 templates
│   └── requirements.txt
│
├── frontend/                         # React + Vite
│   ├── src/
│   │   ├── api/                      # API clients
│   │   │   ├── auth.ts              # Auth API calls
│   │   │   ├── pipelines.ts         # Pipeline CRUD API calls
│   │   │   └── index.ts             # Axios instance
│   │   ├── components/
│   │   │   ├── auth/                 # Login, Signup, ProtectedRoute
│   │   │   ├── builder/              # Pipeline Canvas, Nodes
│   │   │   ├── chat/                 # Chat interface, Messages
│   │   │   ├── common/               # Header, CommandPalette, ThemeToggle
│   │   │   ├── dashboard/            # Stats cards
│   │   │   ├── layout/               # AppLayout, MobileNav
│   │   │   ├── providers/            # ToastProvider
│   │   │   └── ui/                   # Design system (13 components)
│   │   ├── hooks/                    # Custom hooks
│   │   │   ├── useTheme.ts          # Dark/light/system theme
│   │   │   └── useWebSocket.ts      # WebSocket connection
│   │   ├── pages/                    # 18 pages
│   │   │   ├── DashboardPage.tsx     # AI-first homepage
│   │   │   ├── LoginPage.tsx
│   │   │   ├── SignupPage.tsx
│   │   │   ├── PipelinesPage.tsx
│   │   │   ├── PipelineBuilderPage.tsx
│   │   │   ├── PipelineDetailsPage.tsx
│   │   │   ├── MonitoringPage.tsx
│   │   │   ├── AgentsPage.tsx        # AI agent fleet management
│   │   │   ├── SettingsPage.tsx
│   │   │   ├── TemplatesPage.tsx
│   │   │   ├── GettingStartedPage.tsx
│   │   │   ├── AboutPage.tsx
│   │   │   ├── ChangelogPage.tsx
│   │   │   ├── TermsPage.tsx
│   │   │   └── PrivacyPage.tsx
│   │   ├── store/                    # Zustand state
│   │   │   ├── authStore.ts
│   │   │   ├── pipelineStore.ts
│   │   │   └── notificationStore.ts
│   │   ├── types/                    # TypeScript types
│   │   └── App.tsx                   # Root with routing
│   ├── tailwind.config.js
│   ├── package.json
│   └── vite.config.ts
│
├── docs/                             # Documentation
├── infrastructure/docker/            # Docker compose files
└── README.md
```

---

## 🧪 Running Tests

### Frontend Tests (65+ tests)

```bash
cd frontend

# Run all tests
npm run test

# Run with coverage
npx vitest run --coverage

# Watch mode
npx vitest
```

### Backend Tests

```bash
cd backend
pytest -v
```

---

## 🛠️ Development Workflow

### Branch Strategy

```
main         → Production-ready code
├── dev      → Integration branch
├── feat/*   → Feature branches
└── fix/*    → Bug fix branches
```

### Code Standards

| Check | Command | Requirement |
|-------|---------|-------------|
| TypeScript | `npm run tsc --noEmit` | Zero errors |
| Tests | `npm run test` | All passing |
| Build | `npm run build` | Clean build |
| Lint | `npm run lint` | No warnings |

### Commit Convention

```
type(scope): description

Types: feat, fix, refactor, test, docs, chore
Scope: frontend, backend, ui, api, auth
```

Example:
```
feat(ui): add AI agents page with 15 agent cards
fix(api): resolve login 401 redirect loop
```

---

## 🗺️ Available Pages & Routes

| Route | Page | Auth Required | Description |
|-------|------|---------------|-------------|
| `/` | Dashboard | ✅ | AI-first homepage with prompt input |
| `/login` | Login | ❌ | Email + password login |
| `/signup` | Signup | ❌ | Registration form |
| `/pipelines` | Pipelines | ✅ | Pipeline list with search |
| `/pipelines/:id` | Pipeline Details | ✅ | Single pipeline view |
| `/builder` | Pipeline Builder | ✅ | AI chat + visual canvas |
| `/agents` | AI Agents | ✅ | Agent fleet management |
| `/monitoring` | Monitoring | ✅ | Pipeline health + alerts |
| `/settings` | Settings | ✅ | Profile, security, appearance |
| `/templates` | Templates | ✅ | Pre-built pipeline templates |
| `/getting-started` | Getting Started | ✅ | 3-step tutorial |
| `/about` | About | ❌ | About AIDEN |
| `/changelog` | Changelog | ❌ | Version history |
| `/terms` | Terms | ❌ | Terms of service |
| `/privacy` | Privacy | ❌ | Privacy policy |

---

## 🎨 Design System

### Color Palette (AI Theme)

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `primary-600` | `#7C3AED` (Purple) | `#A855F7` | Primary buttons, active states |
| `flow-500` | `#06B6D4` (Cyan) | `#22D3EE` | Data flow, accents, badges |
| `process-500` | `#F59E0B` (Amber) | `#FBBF24` | Processing, warnings |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` / `⌘K` | Open Command Palette |
| `Escape` | Close modals / Command Palette |
| `↑↓` | Navigate Command Palette items |
| `Enter` | Select Command Palette item |

### UI Components Available

Button, Card, Input, Modal, Toast, Skeleton, Dropdown, Tooltip, Progress, Toggle, BottomSheet, EmptyState, PageTransition, CommandPalette

---

## 🐳 Docker (Optional)

```bash
# Start all services
cd infrastructure/docker
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f
```

---

## 🚢 Deployment

| Service | URL | Tech |
|---------|-----|------|
| **Frontend** | https://aiden-f9ww-lilac.vercel.app | Vercel |
| **Backend** | https://aiden-backend-rgq3.onrender.com | Render |
| **Database** | Supabase PostgreSQL | Supabase |

### Deploy Frontend

```bash
cd frontend
npm run build
vercel --prod
```

### Environment Variables

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

Create `backend/.env`:

```env
DATABASE_URL=sqlite+aiosqlite:///./aiden.db
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

---

## 🔍 Troubleshooting

### Port Already in Use

```bash
# Windows (PowerShell)
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :8000
kill -9 <PID>
```

### Node Modules Issues

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Python Virtual Environment

```bash
cd backend
deactivate
rm -rf venv
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### Database Reset

```bash
cd backend
del aiden.db  # Windows
# rm aiden.db  # Mac/Linux
python scripts/seed_user.py
```

---

## 📊 Project Status

### Frontend

| Category | Count | Details |
|----------|-------|---------|
| **Pages** | 18 | All pages implemented |
| **UI Components** | 13 | Design system complete |
| **Custom Hooks** | 5 | useTheme, useWebSocket, etc. |
| **Zustand Stores** | 4 | auth, pipeline, notification, agent |
| **Tests** | 65 | All passing |
| **Build Chunks** | 22 | Code-split for performance |

### Backend

| Category | Count | Details |
|----------|-------|---------|
| **API Endpoints** | 12+ | Auth, pipelines, health, websocket |
| **Models** | 3 | User, Pipeline, PipelineExecution |
| **Agents** | 4 | Base, Extraction, Analysis, Builder |
| **AI Service** | ✅ | HuggingFace integration |
| **Tests** | ✅ | pytest suite |

---

## 📞 Need Help?

- **Issues:** Create a GitHub issue
- **Documentation:** Check `docs/` folder
- **API Docs:** http://localhost:8000/docs (when running)
- **Project Board:** Check GitHub Projects tab
