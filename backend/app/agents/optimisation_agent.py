"""
Optimisation Agent — Performance and cost tuning for pipelines.

Analyzes pipeline execution metrics and suggests optimizations
for cost, performance, and resource utilization.
"""

import logging
from typing import Dict, Any, Optional, List

from app.agents.base_agent import BaseAIDENAgent

logger = logging.getLogger(__name__)


class OptimisationAgent(BaseAIDENAgent):
    """Analyze and suggest pipeline optimizations."""

    def __init__(self):
        super().__init__(
            name="optimisation_agent",
            tools=[],
            system_prompt="You are an optimisation agent tuning pipeline performance.",
        )

    async def run(self, execution_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze execution and return optimization suggestions."""
        suggestions = []
        cost_savings = 0.0

        duration = execution_data.get("duration_seconds", 0)
        records = execution_data.get("records_processed", 0)

        if duration > 300 and records < 10000:
            suggestions.append("Low throughput detected — consider increasing parallelism or reducing batch size")
            cost_savings += 5.0

        if execution_data.get("retries", 0) > 2:
            suggestions.append("High retry count — investigate transient errors or increase timeout")
            cost_savings += 2.0

        # Auto-scaling recommendation
        if duration > 600:
            suggestions.append("Duration exceeds 10 minutes — consider enabling auto-scaling")
            cost_savings += 10.0

        if not suggestions:
            suggestions.append("No optimizations needed — pipeline is performing well")

        return {
            "suggestions": suggestions,
            "estimated_monthly_savings": f"${cost_savings:.2f}",
            "pipeline_id": execution_data.get("pipeline_id"),
        }
