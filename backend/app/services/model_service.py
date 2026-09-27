"""Model-layer service — facade over the static registry + router.

Keeps route handlers thin and gives the rest of the app (orchestrator,
requirement analyzer, tests) one import point for:
- the agent ↔ base-model ↔ LoRA-adapter routing table,
- a single `agent_run()` helper that resolves the serving model ref from
  the registry and delegates to the configured AIProvider.

The active provider is controlled by `AI_PROVIDER` in backend/.env:
    AI_PROVIDER=ollama          → Ollama (default / local dev — no change)
    AI_PROVIDER=huggingface     → HF Inference API (needs HF_TOKEN)
    AI_PROVIDER=auto            → HF when HF_TOKEN present, else Ollama
"""

from __future__ import annotations

from typing import Any

from app.ai.models import registry as model_registry
from app.ai.models.router import RouteDecision, route
from app.ai.providers import get_provider


class UnknownAgentError(KeyError):
    """Raised when an agent id is not in the registry."""


def roster() -> list[dict[str, Any]]:
    """The 11-agent routing table (agents UI + /status consumption)."""
    return model_registry.route_table()


def bases() -> list[dict[str, Any]]:
    return [
        {
            "id": b.id,
            "role": b.role,
            "family": b.family,
            "local_tag": b.local_tag,
            "hf_id": b.hf_id,
            "quantization": b.quantization,
            "notes": b.notes,
        }
        for b in model_registry.BASE_MODELS.values()
    ]


def adapters() -> list[dict[str, Any]]:
    return [
        {
            "name": a.name,
            "base_model_id": a.base_model_id,
            "agents": list(a.agents),
            "rank": a.rank,
            "alpha": a.alpha,
            "target_modules": list(a.target_modules),
            "trained": a.trained,
            # Phase 11+ HF tracking fields
            "hf_repo": a.hf_repo,
            "hf_adapter_repo": a.hf_adapter_repo,
            "serving_provider": a.serving_provider,
            "deployment_mode": a.deployment_mode,
        }
        for a in model_registry.LORA_ADAPTERS.values()
    ]


def resolve_route(
    payload: dict[str, Any], *, input_kind: str = "auto", agent_id: str | None = None
) -> RouteDecision:
    try:
        return route(payload, input_kind=input_kind, agent_id=agent_id)
    except KeyError as exc:
        raise UnknownAgentError(str(exc.args[0] if exc.args else exc)) from exc


async def agent_run(
    agent_id: str,
    payload: dict[str, Any],
    *,
    system: str | None = None,
    input_kind: str = "auto",
) -> dict[str, Any]:
    """One routed agent invocation.

    Resolves the serving model ref from the registry, selects the correct
    AIProvider (Ollama / HuggingFace / …), and returns parsed JSON plus
    routing metadata.

    AIServiceError / AIServiceUnavailable bubble up to the caller which is
    responsible for falling back to deterministic heuristics.
    """
    decision = resolve_route(payload, input_kind=input_kind, agent_id=agent_id)
    prompt_text = decision.normalized_text or ""
    if not prompt_text:
        prompt_text = (
            (payload.get("text") or {}).get("rawText", "")
            if isinstance(payload.get("text"), dict)
            else str(payload.get("text") or payload.get("prompt") or "")
        )

    provider = get_provider()
    result = await provider.chat_json(prompt_text, system=system, model=decision.serving_model_ref)
    return {
        **result,
        "_route": decision.to_dict(),
        "_source": f"model:{decision.serving_model_ref}",
    }
