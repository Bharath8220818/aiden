#!/usr/bin/env bash
# AIDEN — POSIX setup (Git Bash / WSL / macOS / Linux)
set -euo pipefail

echo "== AIDEN setup =="

# --- Backend ---
cd backend
if [ ! -d venv ]; then
  echo "Creating backend venv..."
  python3 -m venv venv
fi
echo "Installing backend dependencies..."
venv/bin/python -m pip install --upgrade pip
venv/bin/python -m pip install -r requirements.txt
[ -f .env ] || { cp .env.example .env; echo "Created backend/.env (review it)"; }
venv/bin/python -m scripts.seed_database || echo "(seed skipped — start the DB first)"
cd ..

# --- Frontend ---
cd frontend
[ -f .env ] || { cp .env.example .env; echo "Created frontend/.env"; }
echo "Installing frontend dependencies (npm ci)..."
npm ci
cd ..

echo
echo "Done. Start dev servers:"
echo "  backend :  cd backend && venv/bin/python -m uvicorn app.main:app --port 8000"
echo "  frontend:  cd frontend && npm run dev"
echo "  or all services: docker compose up -d --build"
