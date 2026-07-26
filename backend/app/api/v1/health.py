"""
Health Check Endpoint — Detailed system status
Checks database, HuggingFace, Qdrant, Redis, and multimodal services.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.database import get_db
from app.config import settings
from app.services.hf_service import hf_service
from app.services.multimodal_service import multimodal_service
import logging
import time
from typing import Dict, Any

logger = logging.getLogger(__name__)

router = APIRouter()


class HealthStatus:
    """Container for health check results"""

    def __init__(self):
        self.status = "healthy"
        self.checks = {}
        self.timestamp = time.time()

    def check(self, name: str, status: str, details: Any = None, error: str = None):
        self.checks[name] = {
            "status": status,
            "details": details,
            "error": error,
        }
        # Only failing checks make the system unhealthy;
        # skipped and warning are acceptable states
        if status == "failing":
            self.status = "unhealthy"
        return self

    def to_dict(self) -> Dict:
        return {
            "status": self.status,
            "timestamp": self.timestamp,
            "duration_seconds": time.time() - self.timestamp,
            "checks": self.checks,
        }


@router.get("")
async def health_check(db: AsyncSession = Depends(get_db)) -> Dict:
    """Detailed health check for all services"""
    status = HealthStatus()

    # ─── 1. Database Check ──────────────────────────────────────────────
    try:
        await db.execute(text("SELECT 1"))
        status.check("database", "passing", details="PostgreSQL/SQLite connected")
    except Exception as e:
        status.check("database", "failing", error=str(e))

    # ─── 2. HuggingFace Service Check ─────────────────────────────────
    try:
        if hf_service.is_available():
            status.check("huggingface", "passing", details="HF models available")
        else:
            status.check("huggingface", "warning", details="HF unavailable (fallback mode)")
    except Exception as e:
        status.check("huggingface", "failing", error=str(e))

    # ─── 3. Qdrant / RAG Memory Check ──────────────────────────────────
    try:
        from app.core.rag_memory import rag_memory
        count = rag_memory.count()
        if count is not None and count > 0:
            status.check("rag_memory", "passing", details=f"{count} stored intents")
        elif count is not None:
            status.check("rag_memory", "passing", details="RAG memory ready (empty)")
        else:
            status.check("rag_memory", "warning", details="RAG memory not initialized")
    except Exception as e:
        status.check("rag_memory", "failing", error=str(e))

    # ─── 4. Redis Check ─────────────────────────────────────────────────
    try:
        import redis
        if settings.REDIS_URL:
            r = redis.from_url(settings.REDIS_URL)
            r.ping()
            status.check("redis", "passing", details=f"Redis connected ({settings.REDIS_URL[:20]}...)")
        else:
            status.check("redis", "skipped", details="Redis not configured")
    except ImportError:
        status.check("redis", "skipped", details="Redis module not installed")
    except Exception as e:
        status.check("redis", "warning", details="Redis unavailable", error=str(e))

    # ─── 5. Multimodal Service Check ────────────────────────────────────
    try:
        if multimodal_service.is_available():
            status.check("multimodal", "passing", details="Multimodal model loaded")
        else:
            status.check("multimodal", "warning", details="Multimodal service unavailable")
    except Exception as e:
        status.check("multimodal", "failing", error=str(e))

    # ─── 6. Database Migration Check ────────────────────────────────────
    try:
        if settings.DATABASE_URL and "postgresql" not in settings.DATABASE_URL:
            result = await db.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
            tables = [row[0] for row in result.fetchall()]
            for expected in ["users", "pipelines", "pipeline_executions"]:
                if expected not in tables:
                    status.check("schema", "warning", details=f"Missing expected table: {expected}")
                    break
            else:
                status.check("schema", "passing", details="Schema tables present")
        else:
            status.check("schema", "skipped", details="SQLite validation skipped (PostgreSQL detected)")
    except Exception as e:
        status.check("schema", "warning", error=str(e))

    return status.to_dict()


@router.get("/live")
async def liveness_check():
    """Simple liveness probe for container orchestration"""
    return {"status": "alive"}


@router.get("/ready")
async def readiness_check(db: AsyncSession = Depends(get_db)) -> Dict:
    """Readiness probe — ensures database is ready"""
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "ready"}
    except Exception:
        return {"status": "not_ready"}
