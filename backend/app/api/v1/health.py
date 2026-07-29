from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import datetime
from app.database import get_db, engine
from app.config import settings

router = APIRouter()

@router.get("/health")
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
