"""AIDEN MCP API — tool discovery and execution endpoints (Stage 4.3)."""
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.services.mcp_server import MCPExecuteRequest, build_mcp_registry, mcp_server

router = APIRouter(tags=["mcp"])


@router.get("/tools")
async def list_tools(
    agent_type: Optional[str] = Query(None, description="Filter by agent binding"),
    rebuild: bool = Query(False, description="Rebuild registry from connectors first"),
):
    """Discover every MCP tool (optionally filtered by agent)."""
    if rebuild or not mcp_server.tools:
        count = build_mcp_registry()
    else:
        count = len(mcp_server.tools)
    tools = mcp_server.discover_tools(agent_type)
    return {
        "total": count,
        "filtered": len(tools),
        "tools": [t.model_dump() for t in tools],
    }


@router.get("/tools/{tool_name}")
async def get_tool(tool_name: str):
    tool = mcp_server.get_tool(tool_name)
    if not tool:
        raise HTTPException(status_code=404, detail=f"Tool not found: {tool_name}")
    return tool.model_dump()


@router.post("/execute")
async def execute_tool(request: MCPExecuteRequest):
    """Execute an MCP tool with RBAC + risk-based approval enforcement.

    Pass ``user_role`` in params until auth context is threaded through;
    defaults to engineer. When a tool requires approval the response carries
    ``approval_required: true`` instead of executing.
    """
    user_role = request.params.pop("user_role", "engineer")
    result = await mcp_server.execute_tool(
        tool_name=request.tool_name,
        params=request.params,
        user_role=user_role,
        agent=request.agent,
        dry_run=request.dry_run,
    )
    return result
