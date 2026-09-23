"""Health endpoints.

- GET /health/healthz  → liveness: always "healthy" if the process runs.
- GET /health/full     → readiness: checks database + configured optional services.
  Optional AI/aux services never fail the whole check; they report "degraded".
"""

from __future__ import annotations

import socket
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.schemas.common import FullHealthResponse, HealthzResponse, ServiceCheck

router = APIRouter(prefix="/health", tags=["health"])
settings = get_settings()


@router.get("/healthz", response_model=HealthzResponse)
async def healthz() -> dict:
    return {"status": "healthy"}


async def _check_tcp(host: str, port: int, timeout: float = 1.5) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


async def _check_http(url: str, timeout: float = 2.0) -> bool:
    try:
        async with httpx.AsyncClient(timeout=timeout, verify=False) as client:
            resp = await client.get(url)
            return resp.status_code < 500
    except Exception:
        return False


@router.get("/full", response_model=FullHealthResponse)
async def full_health(db: AsyncSession = Depends(get_db)) -> dict:
    checks: dict[str, ServiceCheck] = {}

    # Database is mandatory.
    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = ServiceCheck(status="ok")
    except Exception:
        checks["database"] = ServiceCheck(status="degraded", detail="unreachable")

    # Optional services — reported but never fatal.
    if settings.REDIS_URL:
        parsed = urlparse(settings.REDIS_URL.replace("redis://", "http://", 1))
        ok = await _check_tcp(parsed.hostname or "localhost", parsed.port or 6379)
        checks["redis"] = ServiceCheck(status="ok" if ok else "degraded")
    else:
        checks["redis"] = ServiceCheck(status="not_configured")

    if settings.QDRANT_URL:
        ok = await _check_http(settings.QDRANT_URL.rstrip("/") + "/")
        checks["qdrant"] = ServiceCheck(status="ok" if ok else "degraded")
    else:
        checks["qdrant"] = ServiceCheck(status="not_configured")

    if settings.OLLAMA_URL:
        ok = await _check_http(settings.OLLAMA_URL.rstrip("/") + "/api/tags")
        checks["ollama"] = ServiceCheck(status="ok" if ok else "degraded")
    else:
        checks["ollama"] = ServiceCheck(status="not_configured")

    overall = (
        "healthy"
        if checks["database"].status == "ok"
        and all(c.status in {"ok", "not_configured"} for c in checks.values())
        else "degraded"
    )
    return {"status": overall, "checks": checks}
