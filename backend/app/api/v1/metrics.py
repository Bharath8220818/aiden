"""AIDEN Observability API — Prometheus metrics + LLM cost reporting (Stage 3.3/3.4)."""
from fastapi import APIRouter, Response

from app.monitoring.metrics import metrics_text, PROMETHEUS_AVAILABLE
from app.services.cost_tracker import CostTracker
from app.services.model_registry import ModelRegistry
from app.services.prompt_manager import PromptManager

router = APIRouter(tags=["metrics"])


@router.get("/metrics")
async def prometheus_metrics():
    """Prometheus scrape endpoint (text exposition format)."""
    return Response(
        content=metrics_text(),
        media_type="text/plain; version=0.0.4; charset=utf-8",
    )


@router.get("/metrics/status")
async def metrics_status():
    return {
        "prometheus_client_installed": PROMETHEUS_AVAILABLE,
        "backend": "prometheus" if PROMETHEUS_AVAILABLE else "in-memory-fallback",
    }


@router.get("/metrics/costs")
async def llm_cost_summary():
    """Aggregate LLM token/cost usage per model and agent."""
    return CostTracker.summary()


@router.get("/metrics/models")
async def model_registry_listing():
    """Model registry: available models, task mapping, fallback chains."""
    return {
        "models": ModelRegistry.MODELS,
        "task_model_map": ModelRegistry.TASK_MODEL_MAP,
        "default": ModelRegistry.DEFAULT_MODEL,
    }


@router.get("/metrics/prompts")
async def prompt_versions():
    """Prompt registry: every prompt name and its versions."""
    return {"prompts": PromptManager.list_prompts()}
