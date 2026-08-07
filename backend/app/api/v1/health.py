from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import datetime
import sys
import asyncio
from app.database import get_db, AsyncSessionLocal
from app.config import settings

router = APIRouter()


@router.get("/healthz")
async def healthz():
    """
    Lightweight health check for Render and monitoring.
    Checks database connectivity only -- does NOT load ML models.
    Response time: <500ms.
    """
    try:
        async with AsyncSessionLocal() as session:
            await asyncio.wait_for(
                session.execute(text("SELECT 1")), timeout=5
            )
        return {
            "status": "ok",
            "database": "connected",
            "service": settings.APP_NAME,
            "version": settings.APP_VERSION,
        }
    except asyncio.TimeoutError:
        return {
            "status": "error",
            "database": "timeout",
            "detail": "Database connection timed out after 5s",
        }
    except Exception as e:
        return {
            "status": "error",
            "database": "disconnected",
            "detail": str(e),
        }


@router.get("/full")
async def health_full():
    """
    Full health check -- includes ML model status (may be slow).
    For deeper diagnostics.
    """
    status = {
        "status": "ok",
        "python_version": sys.version,
    }

    # Database (with timeout to avoid hanging on pool exhaustion)
    try:
        async with AsyncSessionLocal() as session:
            await asyncio.wait_for(
                session.execute(text("SELECT 1")), timeout=5
            )
        status["database"] = "connected"
    except asyncio.TimeoutError:
        status["database"] = "timeout"
        status["status"] = "degraded"
    except Exception as e:
        status["database"] = f"error: {e}"
        status["status"] = "degraded"

    # CUDA / torch (lazy -- only imported if installed)
    try:
        import torch
        status["cuda"] = torch.cuda.is_available()
        status["torch_version"] = torch.__version__
    except ImportError:
        status["cuda"] = False
        status["torch_version"] = "not installed"

    # HuggingFace transformers
    try:
        import transformers
        status["transformers_version"] = transformers.__version__
    except ImportError:
        status["transformers_version"] = "not installed"

    # sentence-transformers embeddings
    try:
        import sentence_transformers
        status["embeddings"] = "installed"
    except ImportError:
        status["embeddings"] = "not installed"

    # Qdrant vector DB (lazy probe — never fails the health check)
    try:
        from qdrant_client import QdrantClient
        probe = QdrantClient(
            url=settings.QDRANT_URL, timeout=2.0, check_compatibility=False
        )
        collections = probe.get_collections().collections
        status["qdrant"] = "connected"
        status["qdrant_collections"] = [c.name for c in collections]
    except Exception as e:
        status["qdrant"] = f"unavailable: {e}"
        status["qdrant_collections"] = []

    return status


@router.get("/")
async def health_check():
    """Basic health check."""
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/live")
async def liveness():
    """Kubernetes liveness probe."""
    return {"status": "alive", "timestamp": datetime.utcnow().isoformat()}


@router.get("/ready")
async def readiness(db: AsyncSession = Depends(get_db)):
    """Kubernetes readiness probe - checks DB connectivity."""
    try:
        await db.execute(text("SELECT 1"))
        db_healthy = True
    except Exception:
        db_healthy = False

    return {
        "status": "ready" if db_healthy else "not_ready",
        "database": "connected" if db_healthy else "disconnected",
        "timestamp": datetime.utcnow().isoformat(),
    }
