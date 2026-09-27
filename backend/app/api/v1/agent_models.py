"""Model layer endpoints — the 11-agent ↔ 4-base ↔ LoRA-adapter routing table.

Mounted under /agents/model so the existing /agents router keeps its shape:
    GET  /api/v1/agents/model/registry  → bases + adapters + agents + route table
    GET  /api/v1/agents/model/route     → classify + route a multimodal payload
    POST /api/v1/agents/model/run       → one routed agent invocation (model/heuristic)
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import AuthContext, require_permission
from app.services import model_service
from app.services.model_service import UnknownAgentError

router = APIRouter(prefix="/agents/model", tags=["agents"])


@router.get("/registry")
async def get_registry(
    ctx: AuthContext = Depends(require_permission("agent.read")),
) -> dict[str, Any]:
    """Bases, adapters and the full 11-agent route table."""
    return {
        "bases": model_service.bases(),
        "adapters": model_service.adapters(),
        "routes": model_service.roster(),
    }


@router.get("/route")
async def resolve_route(
    payload: str = Query("", description="Free-text requirement used for modality classification"),
    input_kind: str = Query("auto", description="auto | text | image | audio"),
    agent_id: str | None = Query(None, description="Target agent (default: requirement_analysis)"),
    ctx: AuthContext = Depends(require_permission("agent.read")),
):
    """Resolve the routing decision for a multimodal payload (no model call)."""
    try:
        decision = model_service.resolve_route({"text": payload}, input_kind=input_kind, agent_id=agent_id)
    except UnknownAgentError:
        from app.core.exceptions import NotFoundError

        raise NotFoundError(f"Unknown agent: {agent_id}") from None
    return decision.to_dict()


@router.post("/run")
async def agent_run(
    payload: dict[str, Any],
    ctx: AuthContext = Depends(require_permission("agent.control")),
    db: AsyncSession = Depends(get_db),
):
    """One routed agent invocation.

    When Ollama serves the resolved model ref the parsed JSON answer is
    returned with `_source: model:<ref>`; without a model the endpoint
    reports `source: heuristic` with a scaffold answer so UIs can render an
    honest degraded mode.
    """
    agent_id = str(payload.pop("agent_id", "requirement_analysis"))
    input_kind = str(payload.pop("input_kind", "auto"))
    try:
        decision = model_service.resolve_route(payload, input_kind=input_kind, agent_id=agent_id)
    except UnknownAgentError:
        from app.core.exceptions import NotFoundError

        raise NotFoundError(f"Unknown agent: {agent_id}") from None

    from app.services.ai_client import AIServiceError, ollama_available

    if await ollama_available():
        try:
            result = await model_service.agent_run(agent_id, payload, input_kind=input_kind)
            return result
        except AIServiceError:
            pass  # fall through to the honest degraded answer

    return {
        "source": "heuristic",
        "detail": "Model backend unavailable — deterministic scaffold response.",
        "agent_id": decision.agent_id,
        "input_kind": decision.input_kind,
        "route": decision.to_dict(),
    }
