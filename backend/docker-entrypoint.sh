#!/bin/bash
set -e

# ─── AIDEN Backend Docker Entrypoint ───────────────────────────────────
# Runs on every container start. Idempotent — safe to run repeatedly.
#
# Environment variables (all optional):
#   SKIP_DB_SEED   — set to "true" to skip user seeding
#   SEED_ADMIN_*   — admin credentials (see init_db.py)
#   SEED_DEMO_*    — demo credentials (see init_db.py)
#   DATABASE_URL   — PostgreSQL connection string (set by docker-compose)
# ────────────────────────────────────────────────────────────────────────

echo "=== AIDEN Backend — Starting ==="

# ── 1. Wait for PostgreSQL to be ready ────────────────────────────────
if [ -n "$DATABASE_URL" ] && echo "$DATABASE_URL" | grep -qE "^.*://.*@.*:[0-9]+/.*"; then
  echo "→ Waiting for PostgreSQL..."
  # Extract host:port from DATABASE_URL
  # postgresql+asyncpg://user:pass@host:port/db
  DB_HOST=$(echo "$DATABASE_URL" | sed -E 's|.*@([^:/]+).*|\1|')
  DB_PORT=$(echo "$DATABASE_URL" | sed -E 's|.*:([0-9]+)/.*|\1|')
  DB_PORT=${DB_PORT:-5432}

  for i in $(seq 1 30); do
    if python -c "import socket; s=socket.socket(); s.settimeout(2); s.connect(('$DB_HOST', $DB_PORT)); s.close()" 2>/dev/null; then
      echo "  ✓ PostgreSQL is ready"
      break
    fi
    echo "  waiting... ($i/30)"
    sleep 1
  done
else
  echo "→ Using SQLite — no need to wait for PostgreSQL"
fi

# ── 2. Run Alembic migrations (if configured) ─────────────────────────
# This is optional: the app also calls Base.metadata.create_all on startup.
# Alembic migrations give you proper change tracking across team members.
if command -v alembic &> /dev/null && [ -f alembic.ini ]; then
  echo "→ Running Alembic migrations..."
  alembic upgrade head 2>&1 | sed 's/^/  /'
  echo "  ✓ Migrations complete"
else
  echo "→ Alembic not configured — relying on app startup table creation"
fi

# ── 3. Seed default users ─────────────────────────────────────────────
# The app seeds users on startup too, but running it here ensures
# users exist before the first health check passes.
echo "→ Seeding default database users..."
python -c "
import asyncio
from app.core.init_db import ensure_default_users
from app.database import AsyncSessionLocal

async def _seed():
    async with AsyncSessionLocal() as session:
        await ensure_default_users(session)

asyncio.run(_seed())
" 2>&1 | sed 's/^/  /'
echo "  ✓ User seeding complete"

# ── 4. Start the application server ────────────────────────────────────
echo ""
echo "=== Starting Uvicorn ==="
exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers 4 \
  --proxy-headers \
  --forwarded-allow-ips='*' \
  --log-level info
