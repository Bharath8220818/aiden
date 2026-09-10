"""AIDEN LLMOps — Cost Tracker (Stage 3.4).

Records token usage and estimated cost per model into the metrics module
(Prometheus when installed, in-memory fallback otherwise) plus a bounded
in-process ledger that the /api/v1/metrics/costs endpoint reports.
"""
import threading
import time
from collections import defaultdict
from typing import Dict, List

from app.monitoring.metrics import llm_tokens, llm_cost
from app.services.model_registry import ModelRegistry


class CostTracker:
    """Track LLM token usage and cost per model / agent / task."""

    _lock = threading.Lock()
    _ledger: List[dict] = []
    _MAX_LEDGER = 1000

    @classmethod
    def track(
        cls,
        model: str,
        input_tokens: int,
        output_tokens: int,
        agent: str = "unknown",
        task_type: str = "unknown",
    ) -> float:
        """Record one LLM call. Returns the estimated cost in USD."""
        cost = ModelRegistry.estimate_cost(model, input_tokens, output_tokens)

        llm_tokens.labels(model=model).inc(input_tokens + output_tokens)
        llm_cost.labels(model=model).inc(cost)

        with cls._lock:
            cls._ledger.append(
                {
                    "ts": time.time(),
                    "model": model,
                    "agent": agent,
                    "task_type": task_type,
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "cost_usd": round(cost, 6),
                }
            )
            if len(cls._ledger) > cls._MAX_LEDGER:
                cls._ledger = cls._ledger[-cls._MAX_LEDGER:]
        return cost

    @classmethod
    def summary(cls) -> Dict:
        """Aggregate cost summary for the metrics endpoint."""
        by_model: Dict[str, float] = defaultdict(float)
        by_agent: Dict[str, float] = defaultdict(float)
        total = 0.0
        calls = 0
        with cls._lock:
            entries = list(cls._ledger)
        for e in entries:
            by_model[e["model"]] += e["cost_usd"]
            by_agent[e["agent"]] += e["cost_usd"]
            total += e["cost_usd"]
            calls += 1
        return {
            "total_cost_usd": round(total, 4),
            "total_calls": calls,
            "by_model": dict(by_model),
            "by_agent": dict(by_agent),
        }
