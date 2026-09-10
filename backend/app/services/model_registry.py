"""AIDEN LLMOps — Model Registry (Stage 3.4).

Maps task types to the LLM that should serve them and carries per-model cost
metadata used by the cost tracker. Fallback chains let an agent degrade from a
primary model to a cheaper one instead of failing.
"""
from typing import Dict, List, Optional


class ModelRegistry:
    """Registry of available LLMs and per-task model selection."""

    MODELS: Dict[str, dict] = {
        "gpt-4": {
            "provider": "openai",
            "cost_per_1k_input_tokens": 0.03,
            "cost_per_1k_output_tokens": 0.06,
            "context_window": 8192,
            "tier": "premium",
        },
        "gpt-4o-mini": {
            "provider": "openai",
            "cost_per_1k_input_tokens": 0.00015,
            "cost_per_1k_output_tokens": 0.0006,
            "context_window": 128000,
            "tier": "standard",
        },
        "gpt-3.5-turbo": {
            "provider": "openai",
            "cost_per_1k_input_tokens": 0.0005,
            "cost_per_1k_output_tokens": 0.0015,
            "context_window": 16385,
            "tier": "economy",
        },
        "claude-3-sonnet": {
            "provider": "anthropic",
            "cost_per_1k_input_tokens": 0.003,
            "cost_per_1k_output_tokens": 0.015,
            "context_window": 200000,
            "tier": "standard",
        },
    }

    # Task type → preferred model. Unknown tasks get the default.
    TASK_MODEL_MAP: Dict[str, str] = {
        "architecture": "gpt-4",
        "planning": "gpt-4",
        "pipeline_generation": "gpt-4",
        "sql_generation": "gpt-4o-mini",
        "debugging": "gpt-4o-mini",
        "monitoring": "gpt-4o-mini",
        "summarization": "gpt-3.5-turbo",
    }

    DEFAULT_MODEL = "gpt-4o-mini"

    @classmethod
    def get_model_for_task(cls, task_type: str) -> str:
        return cls.TASK_MODEL_MAP.get(task_type, cls.DEFAULT_MODEL)

    @classmethod
    def get_model_info(cls, model: str) -> Optional[dict]:
        return cls.MODELS.get(model)

    @classmethod
    def get_fallback_chain(cls, model: str) -> List[str]:
        """Return [model, fallback1, fallback2] ordered by preference."""
        chain: Dict[str, List[str]] = {
            "gpt-4": ["gpt-4", "gpt-4o-mini", "gpt-3.5-turbo"],
            "gpt-4o-mini": ["gpt-4o-mini", "gpt-3.5-turbo"],
            "gpt-3.5-turbo": ["gpt-3.5-turbo"],
        }
        return chain.get(model, [model, cls.DEFAULT_MODEL])

    @classmethod
    def estimate_cost(cls, model: str, input_tokens: int, output_tokens: int) -> float:
        info = cls.MODELS.get(model)
        if not info:
            return 0.0
        return (
            input_tokens / 1000 * info["cost_per_1k_input_tokens"]
            + output_tokens / 1000 * info["cost_per_1k_output_tokens"]
        )
