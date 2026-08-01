import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.database import engine, Base
from app.models import Pipeline, User, ApprovalRequest, AuditLogEntry, AnalyticsEvent  # noqa: F401 — register models with Base.metadata
from app.api.v1 import pipelines, auth, analytics, approvals, audit, executions
from app.api.v1 import multimodal as multimodal_router
from app.api.v1 import agents, schemas, architecture, coding, learning, team, templates, voice, health
from app.api.v1.websocket import websocket_endpoint

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Log key configuration status
    logger.info("=" * 50)
    logger.info(f"{settings.APP_NAME} v{settings.APP_VERSION} starting up")

    # CUDA / Multimodal status
    try:
        import torch
        cuda = torch.cuda.is_available()
        logger.info(f"CUDA: {'✅ AVAILABLE' if cuda else '❌ NOT AVAILABLE (CPU mode)'}")
    except ImportError:
        cuda = False
        logger.info("CUDA: ❌ torch not installed (CPU mode)")

    if settings.MULTIMODAL_ENABLED:
        logger.info(f"Multimodal: ✅ ENABLED ({settings.MULTIMODAL_MODEL})")
    else:
        logger.info("Multimodal: ⏸️  DISABLED (enable with MULTIMODAL_ENABLED=True + CUDA GPU)")
    logger.info("=" * 50)

    # ── Database connection status ──
    from app.database import _database_url
    if "supabase" in _database_url:
        logger.info("Database: Supabase PostgreSQL (hosted)")
    elif "sqlite" in _database_url:
        logger.warning("Database: SQLite (local file) — not recommended for production")
    else:
        logger.info("Database: PostgreSQL")

    # ── Supabase client status ──
    if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
        logger.info(f"Supabase client: ✅ configured ({settings.SUPABASE_URL})")
    else:
        logger.warning("Supabase client: ⚠️  not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing)")

    # Create database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed default users so team members can log in immediately
    from app.core.init_db import ensure_default_users
    from app.database import AsyncSessionLocal

    async with AsyncSessionLocal() as session:
        await ensure_default_users(session)

    yield
    # Shutdown: Dispose engine
    await engine.dispose()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# CORS middleware — allows both Vite dev server and production Docker nginx.
# Override via CORS_ORIGINS env var (comma-separated URLs).
# NOTE: ``allow_origins=["*"]`` combined with ``allow_credentials=True`` is
# rejected by modern browsers (violates the CORS spec). Always use explicit
# origins when credentials are required (e.g. JWT auth headers).
cors_origins = settings.CORS_ORIGINS if settings.CORS_ORIGINS else [
    # ── Vite dev server ──
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    # ── Create React App ──
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    # ── Docker nginx ──
    "http://localhost:80",
    "http://127.0.0.1:80",
    # ── Simple localhost / IP ──
    "http://localhost",
    "http://127.0.0.1",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
# ── Core ──
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(pipelines.router, prefix="/api/v1/pipelines", tags=["pipelines"])
app.include_router(executions.router, prefix="/api/v1/executions", tags=["executions"])

# ── Analytics & Governance ──
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["analytics"])
app.include_router(approvals.router, prefix="/api/v1/approvals", tags=["approvals"])
app.include_router(audit.router, prefix="/api/v1/audit", tags=["audit"])

# ── AI & Agents ──
app.include_router(agents.router, prefix="/api/v1/agents", tags=["agents"])
app.include_router(multimodal_router.router, prefix="/api/v1/multimodal", tags=["multimodal"])

# ── Design & Architecture ──
app.include_router(schemas.router, prefix="/api/v1/schemas", tags=["schemas"])
app.include_router(architecture.router, prefix="/api/v1/architecture", tags=["architecture"])
app.include_router(templates.router, prefix="/api/v1/templates", tags=["templates"])

# ── Learning & Coding ──
app.include_router(learning.router, prefix="/api/v1/learning", tags=["learning"])
app.include_router(coding.router, prefix="/api/v1/coding", tags=["coding"])

# ── Collaboration ──
app.include_router(team.router, prefix="/api/v1/team", tags=["team"])

# ── Voice & Health ──
app.include_router(voice.router, prefix="/api/v1/voice", tags=["voice"])
app.include_router(health.router, prefix="/api/v1/health", tags=["health"])

# WebSocket endpoint
app.add_api_websocket_route("/api/v1/ws/{client_id}", websocket_endpoint)

@app.get("/")
async def root():
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "version": settings.APP_VERSION,
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.APP_NAME
    }
