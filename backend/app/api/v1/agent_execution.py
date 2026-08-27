"""
Agent Execution API — Orchestrator endpoints for running agent tasks.

Endpoints:
    POST /execute          — Execute a natural language request through the orchestrator
    GET  /status           — Get orchestrator status and stats
    GET  /runs             — Get execution run history
    GET  /runs/{run_id}    — Get a specific run
    POST /agents/{name}/execute — Execute a task on a specific agent
    GET  /connectors       — List all registered tool connectors
    GET  /connectors/health — Health status of all connectors
    POST /connectors/{name}/execute — Directly call a tool connector action
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from datetime import datetime

from app.core.aiden_orchestrator import aiden_orchestrator
from app.api.v1.deps import get_current_user
from app.schemas.agent_communication import (
    AgentTask,
    AgentType,
    RiskLevel,
)

router = APIRouter()


# ── Request / Response Models ────────────────────────────────────────

class ExecuteRequest(BaseModel):
    objective: str = Field(..., min_length=1, description="Natural language request to execute")
    project_id: Optional[str] = Field(None, description="Project context ID")
    context: Dict[str, Any] = Field(default_factory=dict, description="Additional context for the orchestrator")


class AgentExecuteRequest(BaseModel):
    objective: str = Field(..., min_length=1)
    context: Dict[str, Any] = Field(default_factory=dict)
    allowed_tools: List[str] = Field(default_factory=list)
    risk_level: str = Field("low")


class ConnectorExecuteRequest(BaseModel):
    action: str = Field(..., min_length=1)
    params: Dict[str, Any] = Field(default_factory=dict)
    dry_run: bool = Field(False)


class AgentInfo(BaseModel):
    name: str
    type: str
    description: str
    permissions: List[str] = []
    tools: List[str] = []


class OrchestratorStatus(BaseModel):
    status: str = "running"
    agents_registered: int = 0
    connectors_registered: int = 0
    total_runs: int = 0
    uptime_since: str = ""


# ── Orchestrator Endpoints ──────────────────────────────────────────

@router.post("/execute")
async def execute_request(
    request: ExecuteRequest,
    current_user=Depends(get_current_user),
):
    """
    Execute a natural language request through the AIDEN orchestrator.

    The orchestrator will:
    1. Classify the intent
    2. Select appropriate agents
    3. Create an execution plan
    4. Run agents (in parallel where possible)
    5. Synthesize and return results
    """
    context = request.context.copy()
    if request.project_id:
        context["project_id"] = request.project_id
    context["user_id"] = getattr(current_user, "id", 0) if current_user else 0

    result = await aiden_orchestrator.execute(
        objective=request.objective,
        context=context,
    )

    return {
        "success": result.get("status") == "success",
        "run_id": result.get("run_id"),
        "intent": result.get("intent"),
        "agents_used": result.get("agents_used", []),
        "tools_used": result.get("tools_used", []),
        "confidence": result.get("confidence", 0),
        "output": result.get("output", {}),
        "execution_time_ms": result.get("execution_time_ms", 0),
        "created_at": result.get("created_at"),
    }


@router.get("/status")
async def orchestrator_status(
    current_user=Depends(get_current_user),
):
    """Get orchestrator status and statistics."""
    agents = aiden_orchestrator.list_agents()
    connectors = aiden_orchestrator.list_connectors()
    runs = aiden_orchestrator.get_run_history()

    return {
        "status": "running",
        "agents_registered": len(agents),
        "connectors_registered": len(connectors),
        "total_runs": len(runs),
        "agents": [a["name"] for a in agents],
        "connectors": [c["name"] for c in connectors],
    }


@router.get("/runs")
async def list_runs(
    limit: int = Query(50, ge=1, le=200),
    current_user=Depends(get_current_user),
):
    """Get recent execution run history."""
    runs = aiden_orchestrator.get_run_history(limit=limit)
    return {"runs": runs, "total": len(runs)}


@router.get("/runs/{run_id}")
async def get_run(
    run_id: str,
    current_user=Depends(get_current_user),
):
    """Get a specific execution run by ID."""
    run = aiden_orchestrator.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found")
    return run


# ── Agent Endpoints ─────────────────────────────────────────────────

@router.get("/agents")
async def list_agents(
    current_user=Depends(get_current_user),
):
    """List all registered specialist agents."""
    agents = aiden_orchestrator.list_agents()
    return {"agents": agents, "total": len(agents)}


@router.get("/agents/{agent_name}")
async def get_agent(
    agent_name: str,
    current_user=Depends(get_current_user),
):
    """Get a specific agent's details."""
    agent = aiden_orchestrator.agents.get(agent_name)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_name}' not found")
    return {
        "name": agent.name,
        "type": agent.agent_type.value,
        "description": agent.description,
        "system_prompt": agent.system_prompt,
        "permissions": agent.permissions,
        "tools": [t.name if hasattr(t, "name") else str(t) for t in getattr(agent, "tools", [])],
    }


@router.post("/agents/{agent_name}/execute")
async def execute_agent(
    agent_name: str,
    request: AgentExecuteRequest,
    current_user=Depends(get_current_user),
):
    """Execute a task directly on a specific agent (bypass orchestrator routing)."""
    agent = aiden_orchestrator.agents.get(agent_name)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_name}' not found")

    risk_map = {
        "low": RiskLevel.LOW,
        "medium": RiskLevel.MEDIUM,
        "high": RiskLevel.HIGH,
        "critical": RiskLevel.CRITICAL,
    }

    task = AgentTask(
        project_id=request.context.get("project_id", ""),
        user_id=getattr(current_user, "id", 0) if current_user else 0,
        objective=request.objective,
        context=request.context,
        allowed_tools=request.allowed_tools,
        risk_level=risk_map.get(request.risk_level, RiskLevel.LOW),
    )

    result = await agent.execute(task, request.context)

    return {
        "task_id": result.task_id,
        "agent_name": result.agent_name,
        "status": result.status.value,
        "output": result.output,
        "confidence": result.confidence,
        "evidence": result.evidence,
        "tools_used": result.tools_used,
        "execution_time_ms": result.execution_time_ms,
        "error": result.error,
    }


# ── Connector Endpoints ─────────────────────────────────────────────

@router.get("/connectors")
async def list_connectors(
    current_user=Depends(get_current_user),
):
    """List all registered tool connectors."""
    connectors = aiden_orchestrator.list_connectors()
    return {"connectors": connectors, "total": len(connectors)}


@router.get("/connectors/health")
async def connector_health(
    tool_name: Optional[str] = Query(None, description="Specific connector name, or omit for all"),
    current_user=Depends(get_current_user),
):
    """Get health status of one or all connectors."""
    health = await aiden_orchestrator.get_connector_health(tool_name)
    return health


@router.post("/connectors/{tool_name}/execute")
async def execute_connector(
    tool_name: str,
    request: ConnectorExecuteRequest,
    current_user=Depends(get_current_user),
):
    """Directly call a tool connector action through the orchestrator."""
    result = await aiden_orchestrator.call_connector(
        tool_name=tool_name,
        action=request.action,
        params=request.params,
    )

    return {
        "tool_name": tool_name,
        "action": request.action,
        "dry_run": request.dry_run,
        "result": result,
    }
