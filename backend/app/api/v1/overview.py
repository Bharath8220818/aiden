"""Overview aggregate endpoint — powers the frontend Overview dashboard."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.overview import OverviewDashboardOut
from app.services.overview_service import OverviewService

router = APIRouter(prefix="/overview", tags=["overview"])


@router.get("", response_model=OverviewDashboardOut)
async def get_overview_dashboard(db: AsyncSession = Depends(get_db)) -> OverviewDashboardOut:
    return await OverviewService(db).dashboard()
