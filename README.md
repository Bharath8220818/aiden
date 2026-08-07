# AIDEN — AI Data Engineering Platform

**Build production-ready data pipelines with natural language.**
AIDEN is a full-stack AI-assisted data engineering platform with a React + TypeScript frontend, a FastAPI backend, and Docker Compose infrastructure for local development.

---

## 🚀 Running the project

### Local development

1. Start the backend

```batch
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
:: edit backend\.env as needed
set PYTORCH_NO_CUDA=1
alembic upgrade head
python scripts\seed_user.py
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

2. Start the frontend

```batch
cd frontend
npm install
copy ..\backend\.env.example .env  # optional if you need env vars in frontend
npm run dev
```

3. Open the app

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`

### Docker Compose

```bash
cd infrastructure/docker
docker compose up -d
```

Stop services:

```bash
docker compose down
```

---

## 📁 Repository structure

```text
.
├── backend/                  # FastAPI backend, models, API routes, and scripts
├── frontend/                 # React + Vite frontend application
├── infrastructure/           # Docker Compose and runtime infrastructure files
├── docs/                     # Project documentation and run guides
├── models/                   # Local model caches and adapters
├── scripts/                  # Utilities for training, generation, and evaluation
└── README.md                 # Root project documentation
```

---

## 📘 Folder READMEs

- `backend/README.md` — backend development, env vars, and service notes
- `frontend/README.md` — frontend setup, env vars, and commands
- `infrastructure/README.md` — Docker Compose and container runtime documentation
- `docs/README.md` — running docs and docs index

---

## 🛠️ Frontend commands

```bash
cd frontend
npm install
npm run dev
npm run build
npm run preview
npm test
npm run lint
```

---

## 🧪 Backend commands

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
python scripts\seed_user.py
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pytest
```

---

## 🔧 Environment variables

- Backend: copy `backend/.env.example` to `backend/.env`
- Frontend: create `frontend/.env` with `VITE_API_URL=http://localhost:8000` and `VITE_WS_URL=ws://localhost:8000`

---

## 📚 Documentation

Visit `docs/README.md` for the running docs index and links to additional guides.
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
| Frontend chunk >500 kB warning | Warning only — all 34 pages use `React.lazy()` code-splitting with 22+ separate chunks |

---

## 📝 License

MIT
