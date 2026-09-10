"""AIDEN Connections API — stored tool connections per project.

Credentials are accepted once at creation, referenced via secret_ref, and
never returned by the API. Health checks delegate to the Tool Gateway
connector registry.
"""
import logging
import time

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.database import get_db
from app.models.connection import Connection
from app.models.user import User
from app.schemas.connection import ConnectionCreate, ConnectionUpdate, ConnectionResponse, ConnectionTestResult

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=list[ConnectionResponse])
async def list_connections(
    project_id: int = Query(..., description="Filter by project"),
    tool_type: str = Query(None, description="Filter by tool type"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Connection).where(Connection.project_id == project_id)
    if tool_type:
        query = query.where(Connection.tool_type == tool_type)
    query = query.order_by(Connection.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=ConnectionResponse, status_code=201)
async def create_connection(
    data: ConnectionCreate,
    project_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Store a new tool connection. The optional secret is referenced, never stored raw."""
    conn = Connection(
        project_id=project_id,
        name=data.name,
        tool_type=data.tool_type,
        environment_id=data.environment_id,
        config=data.config or {},
        # If a secret was provided, we reference it (in production, write to Vault
        # and store the path; for now a deterministic reference keeps parity).
        secret_ref=f"conn_secret_{data.name}" if data.secret else None,
        status="disconnected",
        created_by=current_user.id,
    )
    db.add(conn)
    await db.commit()
    await db.refresh(conn)
    return conn


@router.get("/{connection_id}", response_model=ConnectionResponse)
async def get_connection(
    connection_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Connection).where(Connection.id == connection_id))
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    return conn


@router.patch("/{connection_id}", response_model=ConnectionResponse)
async def update_connection(
    connection_id: int,
    data: ConnectionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Connection).where(Connection.id == connection_id))
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    update = data.model_dump(exclude_unset=True)
    if "secret" in update:
        conn.secret_ref = f"conn_secret_{conn.name}" if update.pop("secret") else conn.secret_ref
    for field, value in update.items():
        setattr(conn, field, value)
    await db.commit()
    await db.refresh(conn)
    return conn


@router.delete("/{connection_id}")
async def delete_connection(
    connection_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Connection).where(Connection.id == connection_id))
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    await db.delete(conn)
    await db.commit()
    return {"status": "deleted", "id": connection_id}


@router.post("/{connection_id}/test", response_model=ConnectionTestResult)
async def test_connection(
    connection_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Health-check the stored connection through the Tool Gateway connector."""
    result = await db.execute(select(Connection).where(Connection.id == connection_id))
    conn = result.scalar_one_or_none()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")

    start = time.monotonic()
    status, details = "error", {}
    try:
        from app.tools import TOOL_REGISTRY
        connector = TOOL_REGISTRY.get(conn.tool_type)
        if connector is None:
            status = "unknown_tool"
            details = {"error": f"No connector registered for '{conn.tool_type}'"}
        else:
            health = await connector.health()
            status = health.status if hasattr(health, "status") else str(health.get("status", "unknown"))
            details = health.details if hasattr(health, "details") else dict(health) if isinstance(health, dict) else {}
    except Exception as e:
        details = {"error": str(e)}

    latency_ms = (time.monotonic() - start) * 1000

    # Persist health snapshot
    conn.status = status
    conn.last_health_check = {"status": status, "latency_ms": round(latency_ms, 2), "details": details}
    await db.commit()

    return ConnectionTestResult(
        connection_id=connection_id,
        tool_type=conn.tool_type,
        status=status,
        latency_ms=round(latency_ms, 2),
        details=details,
    )
