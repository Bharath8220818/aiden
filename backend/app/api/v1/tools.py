"""
Tool Gateway API — list, test, and interact with connected data-engineering tools.

Endpoints:
  GET  /api/v1/tools              — List all registered tool connectors
  GET  /api/v1/tools/{name}       — Get a specific tool's details
  POST /api/v1/tools/{name}/test  — Test connection to a tool
  GET  /api/v1/tools/{name}/health — Get tool health status
  GET  /api/v1/tools/{name}/list  — List tool resources (DAGs, topics, etc.)
  POST /api/v1/tools/{name}/execute — Execute an action on the tool
  GET  /api/v1/tools/{name}/logs  — Get tool logs
  GET  /api/v1/tools/{name}/metrics — Get tool metrics
"""

import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.v1.deps import get_current_user
from app.models.user import User
from app.tools import TOOL_REGISTRY, get_connector, list_connectors

logger = logging.getLogger(__name__)
router = APIRouter()


class ExecuteRequest(BaseModel):
    action: str
    params: Optional[Dict[str, Any]] = None


class ToolResponse(BaseModel):
    name: str
    display_name: str
    category: str
    icon: str
    description: str
    status: str
    capabilities: list[str]


@router.get("/", response_model=list[ToolResponse])
async def list_tools(current_user: User = Depends(get_current_user)):
    """List all registered tool connectors with their status."""
    return list_connectors()


@router.get("/{name}")
async def get_tool(name: str, current_user: User = Depends(get_current_user)):
    """Get details for a specific tool connector."""
    connector = get_connector(name)
    if not connector:
        raise HTTPException(status_code=404, detail=f"Tool '{name}' not found")
    entry = connector.to_registry_entry()
    entry["config_keys"] = list(connector.config.keys())
    return entry


@router.post("/{name}/test")
async def test_tool(name: str, current_user: User = Depends(get_current_user)):
    """Test connection to a tool."""
    connector = get_connector(name)
    if not connector:
        raise HTTPException(status_code=404, detail=f"Tool '{name}' not found")
    result = await connector.test()
    return result


@router.get("/{name}/health")
async def tool_health(name: str, current_user: User = Depends(get_current_user)):
    """Get tool health status."""
    connector = get_connector(name)
    if not connector:
        raise HTTPException(status_code=404, detail=f"Tool '{name}' not found")
    result = await connector.health()
    return result


@router.get("/{name}/list")
async def list_tool_resources(
    name: str,
    resource_type: str = "default",
    current_user: User = Depends(get_current_user),
):
    """List resources from a tool (DAGs, topics, models, buckets, etc.)."""
    connector = get_connector(name)
    if not connector:
        raise HTTPException(status_code=404, detail=f"Tool '{name}' not found")
    resources = await connector.list(resource_type)
    return {"resources": resources, "count": len(resources)}


@router.get("/{name}/list/{resource_type}")
async def list_tool_resources_typed(
    name: str,
    resource_type: str,
    current_user: User = Depends(get_current_user),
):
    """List resources of a specific type from a tool."""
    connector = get_connector(name)
    if not connector:
        raise HTTPException(status_code=404, detail=f"Tool '{name}' not found")
    resources = await connector.list(resource_type)
    return {"resources": resources, "count": len(resources)}


@router.post("/{name}/execute")
async def execute_tool_action(
    name: str,
    request: ExecuteRequest,
    current_user: User = Depends(get_current_user),
):
    """Execute an action on a tool (trigger DAG, create topic, run model, etc.)."""
    connector = get_connector(name)
    if not connector:
        raise HTTPException(status_code=404, detail=f"Tool '{name}' not found")
    result = await connector.execute(request.action, request.params)
    if "error" in result and "success" not in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("/{name}/logs")
async def tool_logs(
    name: str,
    resource_type: str = "default",
    resource_id: str = "",
    limit: int = 50,
    current_user: User = Depends(get_current_user),
):
    """Get logs from a tool."""
    connector = get_connector(name)
    if not connector:
        raise HTTPException(status_code=404, detail=f"Tool '{name}' not found")
    logs = await connector.logs(resource_type, resource_id, limit)
    return {"logs": logs, "count": len(logs)}


@router.get("/{name}/metrics")
async def tool_metrics(name: str, current_user: User = Depends(get_current_user)):
    """Get current metrics from a tool."""
    connector = get_connector(name)
    if not connector:
        raise HTTPException(status_code=404, detail=f"Tool '{name}' not found")
    metrics = await connector.metrics()
    return metrics


@router.get("/health/all")
async def all_tools_health(current_user: User = Depends(get_current_user)):
    """Get health status of all connected tools."""
    results = {}
    for name, connector in TOOL_REGISTRY.items():
        try:
            results[name] = await connector.health()
        except Exception as e:
            results[name] = {"status": "error", "details": {"error": str(e)}}
    return results
