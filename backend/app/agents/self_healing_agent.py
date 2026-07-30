"""
Self-Healing Agent — wraps ``SelfHealingEngine`` as a smolagents agent.

This agent can be invoked by the orchestrator to diagnose and fix pipeline
execution failures autonomously.  When ``smolagents`` is not installed the
agent degrades gracefully and returns an informative message.

Usage::

    from app.agents.self_healing_agent import SelfHealingAgent

    agent = SelfHealingAgent()
    result = await agent.execute(
        "Pipeline 'Sales ETL' failed with 'column customer_id does not exist'"
    )
"""

import json
import logging
from typing import Any, Dict, Optional

from app.agents.base_agent import BaseAIDENAgent
from app.core.self_healing import SelfHealingEngine

logger = logging.getLogger(__name__)


class SelfHealingAgent(BaseAIDENAgent):
    """
    smolagents-compatible agent that wraps the :class:`SelfHealingEngine`.

    When the engine is available, it analyses error messages, proposes
    fixes, assesses risk, and drives the approval or auto-apply workflow.

    The agent's ``run()`` method accepts a task string describing the
    failure and returns a JSON-serialised healing result.
    """

    def __init__(self):
        self._engine = SelfHealingEngine()
        super().__init__(
            name="SelfHealingAgent",
            tools=[],  # The engine handles everything inline
            system_prompt=(
                "You are a Self-Healing Agent for AIDEN data pipelines. "
                "Your role is to diagnose pipeline execution failures, "
                "propose fixes, assess risk, and apply automatic recovery "
                "where safe.\n\n"
                "When you receive a failure description:\n"
                "1. Identify the root cause (schema drift, data quality, "
                "performance, connection, or code error)\n"
                "2. Propose a concrete fix\n"
                "3. Assess risk (LOW → auto-apply, MEDIUM → suggest with "
                "auto-approve delay, HIGH/CRITICAL → require human approval)\n"
                "4. Return a structured JSON result with the diagnosis, "
                "fix, risk, and approval status"
            ),
        )

    async def execute(self, task: str, context: Optional[Dict[str, Any]] = None) -> str:
        """
        Execute a self-healing task.

        Args:
            task: A string describing the pipeline execution failure.
            context: Optional dict with keys ``pipeline_id``, ``execution_id``,
                     ``pipeline_config``, etc.

        Returns:
            A JSON string with the healing result.
        """
        logger.info("SelfHealingAgent executing: %s", task[:120])

        # Extract error message from context or task
        error_text = task
        pipeline_id = None
        execution_id = None

        if context:
            pipeline_id = context.get("pipeline_id")
            execution_id = context.get("execution_id")
            error_text = context.get("error", task)

        from app.database import AsyncSessionLocal
        from sqlalchemy import select
        from app.models.execution import PipelineExecution
        from app.models.pipeline import Pipeline

        pipeline = None
        execution = None

        if pipeline_id and execution_id:
            async with AsyncSessionLocal() as db:
                pipe_result = await db.execute(
                    select(Pipeline).where(Pipeline.id == pipeline_id)
                )
                pipeline = pipe_result.scalar_one_or_none()

                exec_result = await db.execute(
                    select(PipelineExecution).where(PipelineExecution.id == execution_id)
                )
                execution = exec_result.scalar_one_or_none()

        if pipeline is None and pipeline_id:
            # Fallback: create a minimal pipeline object
            pipeline = Pipeline(
                id=pipeline_id,
                name=context.get("pipeline_name", f"Pipeline #{pipeline_id}"),
                source_type=context.get("source_type", "unknown"),
                destination_type=context.get("destination_type", "unknown"),
                config=context.get("pipeline_config", {}),
                is_active=True,
                user_id=context.get("user_id"),
            )

        if execution is None and execution_id:
            execution = PipelineExecution(
                id=execution_id,
                pipeline_id=pipeline_id or 0,
                status="failed",
                error_message=error_text,
                logs=[],
            )

        if pipeline is None:
            return json.dumps({
                "status": "error",
                "message": "No pipeline context available — cannot heal.",
            })

        result = await self._engine.diagnose_and_heal(pipeline, execution, error_text)

        return json.dumps({
            "status": "success" if not result.error else "error",
            "diagnosis": {
                "category": result.diagnosis.category.value,
                "summary": result.diagnosis.summary,
                "confidence": result.diagnosis.confidence,
            },
            "fix": result.fix.to_dict() if result.fix else None,
            "risk": result.risk.value,
            "approval_id": result.approval_id,
            "auto_applied": result.auto_applied,
            "engine_error": result.error,
        })
