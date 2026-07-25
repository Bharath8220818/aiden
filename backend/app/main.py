from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.database import engine, Base
from app.models import Pipeline, User, Approval, AuditLog, AnalyticsEvent  # noqa: F401 — register models with Base.metadata
from app.api.v1 import pipelines, auth, analytics, approvals, audit
from app.api.v1.websocket import websocket_endpoint

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create database tables
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

# CORS middleware — allow all in production (Vercel + Render)
# Set CORS_ORIGINS env var to restrict (comma-separated URLs)
cors_origins = settings.CORS_ORIGINS if settings.CORS_ORIGINS else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(pipelines.router, prefix="/api/v1/pipelines", tags=["pipelines"])
app.include_router(pipelines.executions_router, prefix="/api/v1/executions", tags=["executions"])
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["analytics"])
app.include_router(approvals.router, prefix="/api/v1/approvals", tags=["approvals"])
app.include_router(audit.router, prefix="/api/v1/audit", tags=["audit"])

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
