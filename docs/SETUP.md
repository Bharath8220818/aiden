# AIDEN — Team Onboarding Guide

> **Goal:** Get every team member running the full stack (backend + frontend) in under 15 minutes.

## Prerequisites

| Tool | Version | Check | Purpose |
|------|---------|-------|---------|
| Python | 3.11+ | `python --version` | Backend runtime |
| Node.js | 18+ | `node --version` | Frontend runtime |
| npm | 9+ | `npm --version` | Frontend package manager |
| Git | 2.30+ | `git --version` | Version control |
| Docker Desktop | Latest | `docker --version` | Infrastructure services (optional but recommended) |

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/YOUR_ORG/aiden.git
cd aiden
```

**Team members:** Use SSH if you've set up keys:
```bash
git clone git@github.com:YOUR_ORG/aiden.git
cd aiden
```

---

## Step 2: Backend Setup

### 2a. Create a virtual environment

<details>
<summary><b>Windows (Command Prompt)</b></summary>

```cmd
cd backend
python -m venv venv
venv\Scripts\activate
```
</details>

<details>
<summary><b>Windows (PowerShell)</b></summary>

```powershell
cd backend
python -m venv venv
venv\Scripts\Activate.ps1
# If you get a security error, run this once:
# Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
</details>

<details>
<summary><b>macOS / Linux</b></summary>

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
```
</details>

### 2b. Install dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

> ⏱️ **First install** takes 2–5 minutes (torch, transformers, and sentence-transformers are large packages). Subsequent installs are cached.

### 2c. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your preferred database. For **quickest start** (SQLite, no Docker needed), leave it as-is:

```
DATABASE_URL=sqlite+aiosqlite:///./aiden.db
```

### 2d. Run database migrations

```bash
alembic upgrade head
```

**Expected output:**
```
INFO  [alembic.runtime.migration] Context impl SQLiteImpl.
INFO  [alembic.runtime.migration] Will assume non-transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade  -> 5fb00d78ec1a (initial)
```

### 2e. Start the backend

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Verify it's running:**
- API root: [http://localhost:8000](http://localhost:8000) → `{"message":"Welcome to AIDEN","version":"1.0.0"}`
- Health: [http://localhost:8000/health](http://localhost:8000/health) → `{"status":"healthy","service":"AIDEN"}`
- API docs: [http://localhost:8000/docs](http://localhost:8000/docs) (Swagger UI)

**Test authentication (using auto-seeded users):**

The backend auto-creates two default users on first startup:

```
Admin: admin@example.com / Admin123!   ← superuser (full access)
Demo:  demo@example.com / demo1234      ← regular user (limited access)
```

Test login via curl:
```bash
curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=demo@example.com&password=demo1234"
```

**Expected response:**
```json
{"access_token":"eyJ...","token_type":"bearer"}
```

Or test signup (create your own user):
```bash
curl -s -X POST http://localhost:8000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"yourname@company.com","username":"yourname","full_name":"Your Name","password":"YourPass123!"}'
```

> **Tip:** Override seed credentials via environment variables:
> ```bash
> SEED_ADMIN_EMAIL=ops@company.com SEED_ADMIN_PASSWORD=StrongP@ss! uvicorn app.main:app
> ```
> Or disable seeding entirely: `SKIP_DB_SEED=true`

---

## Step 3: Frontend Setup

### 3a. Install dependencies

```bash
cd frontend
npm install
```

> ⏱️ First install takes 1–3 minutes.

### 3b. Configure environment variables

```bash
cp .env.example .env
```

For local development, the defaults work — the `.env` points to `http://localhost:8000`.

### 3c. Start the frontend dev server

```bash
npm run dev
```

The Vite dev server starts at [http://localhost:5173](http://localhost:5173). It proxies API requests to the backend (port 8000) automatically.

### 3d. Verify it's running

Open [http://localhost:5173](http://localhost:5173) in your browser. You should see the AIDEN login page.

**Run the tests:**
```bash
npm test -- --run
# Expected: all tests passing
```

**Check TypeScript:**
```bash
npx tsc --noEmit
# Expected: no errors
```

**Build for production (optional):**
```bash
npm run build
# Expected: builds to frontend/dist/
```

---

## Step 4: Infrastructure (Docker) — Optional

Docker Compose provides Postgres, Redis, Qdrant, and MinIO for full-featured development.

### 4a. Start infrastructure services

```bash
cd infrastructure/docker
docker compose up -d
```

This starts:
| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL | 5432 | Production database |
| Redis | 6379 | Celery task queue / caching |
| Qdrant | 6333 | Vector database for RAG |
| MinIO | 9000, 9001 | S3-compatible object storage |

### 4b. Switch backend to PostgreSQL

Edit `backend/.env`:

```env
DATABASE_URL=postgresql+asyncpg://aiden:aiden123@localhost:5432/aiden
```

Then re-run migrations:

```bash
cd backend
alembic upgrade head
```

### 4c. Run everything via Docker Compose (one command)

```bash
cd infrastructure/docker
docker compose up --build
```

This builds and starts **all services** (Postgres, Redis, Qdrant, MinIO, backend, frontend). The frontend is served on [http://localhost](http://localhost) via Nginx.

**On first startup, the backend automatically:**
1. Creates database tables (via `Base.metadata.create_all`)
2. Runs Alembic migrations (via `docker-entrypoint.sh`)
3. Seeds default users:
   - `admin@example.com` / `Admin123!` (superuser)
   - `demo@example.com` / `demo1234` (demo user)

> You can override seed credentials via environment variables in `docker-compose.yml`:
> ```yaml
> SEED_ADMIN_EMAIL: ops@company.com
> SEED_ADMIN_PASSWORD: S3cur3P@ss!
> SKIP_DB_SEED: "true"   # disable seeding entirely
> ```

---

## Step 5: Git Workflow for the Team

### Branch strategy

```
main           ← production-ready, protected
├── develop    ← integration branch (optional)
├── feature/*  ← new features
├── fix/*      ← bug fixes
└── docs/*     ← documentation
```

### Daily workflow

```bash
# 1. Pull latest main
git checkout main
git pull origin main

# 2. Create a feature branch
git checkout -b feature/your-descriptive-name

# 3. Make changes, commit frequently
git add <relevant-files>
git commit -m "feat: concise description of what changed"

# 4. Keep branch in sync with main
git fetch origin
git rebase origin/main  # or: git merge origin/main

# 5. Push and open a Pull Request
git push origin feature/your-descriptive-name
# → Open PR on GitHub
```

### Commit message convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | When to use |
|--------|-------------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `refactor:` | Code change that neither fixes nor adds |
| `docs:` | Documentation only |
| `test:` | Adding or fixing tests |
| `chore:` | Build, CI, dependency changes |
| `style:` | Formatting, linting (no logic change) |

**Examples:**
```
feat: add agent detail modal with CPU bar and error banner
fix: resolve N+1 query in pipeline listing endpoint
docs: update API surface table in README
test: add AgentDetailModal open/close tests
```

### Before pushing — always run:

```bash
# Frontend
cd frontend && npx tsc --noEmit && npm test -- --run && npm run build

# Backend
cd backend && python -c "import compileall, sys; compileall.compile_dir('.')"
```

---

## Step 6: Required Tools & Extensions

### Recommended VS Code extensions

| Extension | Purpose |
|-----------|---------|
| [Python](https://marketplace.visualstudio.com/items?itemName=ms-python.python) | Python language support |
| [Pylance](https://marketplace.visualstudio.com/items?itemName=ms-python.vscode-pylance) | Python type checking |
| [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) | Frontend linting |
| [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) | Code formatting |
| [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss) | Tailwind class autocomplete |

### VS Code workspace settings

Create `.vscode/settings.json` in the project root:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "python.defaultInterpreterPath": "backend/venv/Scripts/python.exe",
  "python.terminal.activateEnvironment": true,
  "[python]": {
    "editor.defaultFormatter": "ms-python.python"
  },
  "files.exclude": {
    "**/__pycache__": true,
    "**/.pytest_cache": true
  }
}
```

---

## Step 7: Troubleshooting

### Backend won't start

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `ModuleNotFoundError: No module named '...'` | Dependencies not installed | `pip install -r requirements.txt` |
| `sqlite3.OperationalError: unable to open database file` | DB path is wrong | Use absolute path or run from `backend/` |
| `pydantic_settings.ValidationError` | `.env` has extra/missing fields | Compare with `.env.example` |
| `Address already in use` | Port 8000 taken | Kill existing process or change port |
| `alembic.util.CommandError` | Database not created | Run `alembic upgrade head` |

### Frontend won't start

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `'vite' is not recognized` | Dependencies not installed | `npm install` |
| `Module not found: Error: Can't resolve '...'` | Missing package | `npm install` |
| `Error: listen EADDRINUSE :::5173` | Port 5173 taken | Kill existing Vite process |
| CORS errors in browser | Backend URL mismatch | Ensure `VITE_API_URL` matches backend |
| Blank page / 404 on refresh | SPA routing not configured | For dev, this shouldn't happen; for prod, ensure Nginx fallback to `index.html` |

### Docker issues

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `port is already allocated` | Local service using the port | Stop local Postgres/Redis before starting Docker |
| `Cannot connect to the Docker daemon` | Docker not running | Start Docker Desktop |
| Build takes >10 minutes | First build pulls/installs everything | Subsequent builds use cache |
| `pip install` fails during build | Network issues / timeouts | Retry or use a mirror |

### Contact / Help

If you're stuck:
1. Check the [GitHub Issues](https://github.com/YOUR_ORG/aiden/issues) for existing solutions
2. Ask in the team Slack/Discord channel
3. Tag the project lead for urgent blockers

---

## Quick Reference — One-Line Start (for people who've done Step 2 & 3 once)

```bash
# ── Terminal 1: Backend ──
# Windows (CMD/PowerShell):
cd backend && venv\Scripts\activate && uvicorn app.main:app --reload --port 8000
# macOS / Linux:
# cd backend && source venv/bin/activate && uvicorn app.main:app --reload --port 8000

# ── Terminal 2: Frontend ──
cd frontend && npm run dev

# ── Terminal 3: Docker infra (optional) ──
cd infrastructure/docker && docker compose up -d
```
