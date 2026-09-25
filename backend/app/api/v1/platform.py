"""Platform pulse — public aggregate stats for the landing demo.

    GET /platform/pulse   (public: coarse aggregates only, no user data)

The landing terminal shows real platform activity; this endpoint is its
source. Cheap aggregate queries, a 15s TTL, and no secrets in the payload.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.platform_pulse_service import get_pulse

router = APIRouter(prefix="/platform", tags=["platform"])


@router.get("/pulse")
async def pulse(db: AsyncSession = Depends(get_db)) -> dict:
    return await get_pulse(db)
