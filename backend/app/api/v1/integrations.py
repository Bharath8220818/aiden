"""MCP integration endpoints — server registry + status control."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import AuthContext, require_permission
from app.services.registry_service import RegistryService

router = APIRouter(prefix="/integrations", tags=["integrations"])


@router.get("/mcp")
async def list_mcp_servers(
    ctx: AuthContext = Depends(require_permission("connection.read")),
    db: AsyncSession = Depends(get_db),
):
    return await RegistryService(db).mcp_servers()


@router.post("/mcp/{server_id}/status")
async def set_mcp_status(
    server_id: str,
    payload: dict,
    ctx: AuthContext = Depends(require_permission("agent.control")),
    db: AsyncSession = Depends(get_db),
):
    status = str(payload.get("status") or "connected")
    if status not in {"connected", "degraded", "disconnected"}:
        from app.core.exceptions import ValidationError

        raise ValidationError(f"Invalid MCP status: {status}")
    return await RegistryService(db).mcp_status_update(server_id, status)
