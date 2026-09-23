"""Monitoring endpoints — service health, series, Kafka lag, quality, alerts."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import AuthContext, require_permission
from app.services.registry_service import RegistryService

router = APIRouter(prefix="/monitoring", tags=["monitoring"])


@router.get("/services")
async def services(
    ctx: AuthContext = Depends(require_permission("monitoring.read")),
    db: AsyncSession = Depends(get_db),
):
    return await RegistryService(db).monitoring_services()


@router.get("/series")
async def series(
    ctx: AuthContext = Depends(require_permission("monitoring.read")),
    db: AsyncSession = Depends(get_db),
):
    return await RegistryService(db).monitoring_series()


@router.get("/kafka/topics")
async def kafka_topics(
    ctx: AuthContext = Depends(require_permission("monitoring.read")),
    db: AsyncSession = Depends(get_db),
):
    return await RegistryService(db).monitoring_topics()


@router.get("/quality")
async def quality_checks(
    ctx: AuthContext = Depends(require_permission("monitoring.read")),
    db: AsyncSession = Depends(get_db),
):
    return await RegistryService(db).monitoring_quality()


@router.get("/alerts")
async def alerts(
    ctx: AuthContext = Depends(require_permission("monitoring.read")),
    db: AsyncSession = Depends(get_db),
):
    return await RegistryService(db).monitoring_alerts()


@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: str,
    ctx: AuthContext = Depends(require_permission("monitoring.read")),
    db: AsyncSession = Depends(get_db),
):
    await RegistryService(db).acknowledge_alert(alert_id)
    return {"status": "ok", "alertId": alert_id}
