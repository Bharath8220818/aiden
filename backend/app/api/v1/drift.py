"""Drift detection endpoints — snapshot capture, history, and status.

Deterministic v1 (spec §P1.5): profile → snapshot → compare → incident.
No ML; the profiler output is stable so a hash change *is* a schema change.
"""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, Query
from pydantic import Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import AuthContext, require_permission
from app.models import Pipeline, SchemaSnapshot
from app.schemas.common import APIModel
from app.services.drift_service import DriftService, TableProfile

router = APIRouter(prefix="/drift", tags=["drift"])


def _snapshot_out(s: SchemaSnapshot) -> dict[str, Any]:
    return {
        "id": str(s.id),
        "pipelineId": str(s.pipeline_id),
        "table": s.table_name,
        "columns": s.columns,
        "rowCount": s.row_count,
        "schemaHash": s.schema_hash,
        "columnsChanged": s.columns_changed,
        "changeSummary": s.change_summary,
        "capturedAt": s.captured_at.isoformat() if s.captured_at else None,
    }


class SnapshotRequest(APIModel):
    """Capture request — a real table profile when no profiler is wired."""

    pipeline_id: uuid.UUID = Field(alias="pipelineId")
    table: str = Field(min_length=1, max_length=255)
    columns: list[dict[str, Any]] | None = Field(
        None, description="Omit to reuse the previous snapshot's columns (snapshot-only capture)."
    )
    row_count: int | None = Field(None, alias="rowCount")
    create_incident: bool = Field(True, alias="createIncident")


@router.post("/snapshots")
async def capture_snapshot(
    payload: SnapshotRequest,
    ctx: AuthContext = Depends(require_permission("pipeline.read")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Persist a schema snapshot and detect drift against the previous one."""
    pipeline = await db.get(Pipeline, payload.pipeline_id)
    if pipeline is None:
        from app.core.exceptions import NotFoundError

        raise NotFoundError("Pipeline not found")

    previous = await DriftService(db).latest_snapshot(pipeline.id, payload.table)
    columns = payload.columns
    if columns is None:
        if previous is None:
            from app.core.exceptions import ValidationError

            raise ValidationError(
                "No previous snapshot for this table — provide `columns` for the baseline"
            )
        columns = previous.columns or []

    from app.services.drift_service import ColumnProfile

    profile = TableProfile(
        table=payload.table,
        exists=bool(columns),
        row_count=payload.row_count,
        columns=[
            ColumnProfile(
                name=str(c.get("name", "")),
                data_type=str(c.get("dataType") or c.get("type") or "text"),
                nullable=bool(c.get("nullable", True)),
            )
            for c in columns
        ],
    )
    return await DriftService(db).capture(
        pipeline.id,
        payload.table,
        profile,
        create_incident_on_drift=payload.create_incident,
    )


@router.get("/snapshots")
async def list_snapshots(
    pipeline_id: uuid.UUID = Query(None, alias="pipelineId"),
    table: str = Query(None, max_length=255),
    limit: int = Query(20, ge=1, le=100),
    ctx: AuthContext = Depends(require_permission("pipeline.read")),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    """Snapshot history, newest first (optionally filtered by pipeline/table)."""
    query = select(SchemaSnapshot).order_by(SchemaSnapshot.captured_at.desc()).limit(limit)
    if pipeline_id is not None:
        query = query.where(SchemaSnapshot.pipeline_id == pipeline_id)
    if table:
        query = query.where(SchemaSnapshot.table_name == table)
    rows = list((await db.execute(query)).scalars().all())
    return [_snapshot_out(s) for s in rows]


@router.get("/snapshots/latest")
async def latest_snapshots(
    pipeline_id: uuid.UUID = Query(..., alias="pipelineId"),
    ctx: AuthContext = Depends(require_permission("pipeline.read")),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    """Latest snapshot per monitored table for one pipeline."""
    rows = list(
        (
            await db.execute(
                select(SchemaSnapshot)
                .where(SchemaSnapshot.pipeline_id == pipeline_id)
                .order_by(SchemaSnapshot.table_name, SchemaSnapshot.captured_at.desc())
            )
        )
        .scalars()
        .all()
    )
    latest: dict[str, SchemaSnapshot] = {}
    for row in rows:
        latest.setdefault(row.table_name, row)
    return [_snapshot_out(s) for s in latest.values()]


@router.get("/status")
async def drift_status(
    ctx: AuthContext = Depends(require_permission("monitoring.read")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Watcher status — monitored tables + last drift detection."""
    from datetime import datetime

    total = len(
        list((await db.execute(select(SchemaSnapshot.id))).scalars().all())
    )
    last = (
        await db.execute(select(SchemaSnapshot).order_by(SchemaSnapshot.captured_at.desc()).limit(1))
    ).scalars().first()
    drifted = 0
    if last is not None and last.columns_changed:
        drifted = 1
    return {
        "watcher": "active",
        "monitoredTables": total,
        "lastCaptureAt": last.captured_at.isoformat() if last else None,
        "driftedSnapshots": drifted,
        "signals": [
            "table existence",
            "column existence",
            "column type",
            "nullability",
            "row count",
        ],
        "checkedAt": datetime.now().isoformat(),
    }
