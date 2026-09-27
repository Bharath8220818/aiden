"""AIDEN model layer — 4 base models, 8 LoRA adapters, 11 agents.

Public API:
    from app.ai.models import AGENTS, AGENT_ROUTES, BASE_MODELS, registry, ...
"""

from app.ai.models.registry import (
    AGENT_ROUTES,
    AGENTS,
    BASE_MODELS,
    AgentSpec,
    BaseModelSpec,
    LoRAAdapterSpec,
    adapter_for_agent,
    agent_ids,
    base_model_for_agent,
    lora_adapter_for_agent,
    resolve_model_ref,
    route_table,
)
from app.ai.models.router import (
    AgentInputKind,
    RouteDecision,
    route,
)

__all__ = [
    "AGENT_ROUTES",
    "AGENTS",
    "AgentInputKind",
    "AgentSpec",
    "BASE_MODELS",
    "BaseModelSpec",
    "LoRAAdapterSpec",
    "RouteDecision",
    "adapter_for_agent",
    "agent_ids",
    "base_model_for_agent",
    "lora_adapter_for_agent",
    "resolve_model_ref",
    "route",
    "route_table",
]
