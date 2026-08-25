"""
AIDEN Master Orchestrator — Wires all agents to real tool connectors.

Routes user requests to the appropriate specialist agents,
runs independent tasks in parallel, and synthesizes results.

Architecture:
    User → Orchestrator → Agent Router → Specialist Agents → Tool Connectors → Results
"""

import asyncio
import logging
import time
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime

from app.schemas.agent_communication import (
    AgentTask,
    AgentResult,
    AgentType,
    TaskStatus,
    RiskLevel,
    ExecutionPlan,
    ExecutionStep,
)
from app.agents.sql_agent_v2 import SQLAgentV2
from app.agents.pipeline_agent_v2 import PipelineAgentV2
from app.agents.architecture_agent_v2 import ArchitectureAgentV2
from app.agents.monitoring_agent_v2 import MonitoringAgentV2
from app.agents.debug_agent_v2 import DebugAgentV2
from app.tools import TOOL_REGISTRY

logger = logging.getLogger(__name__)


# ── Intent Classification ───────────────────────────────────────────

INTENT_RULES: Dict[str, List[str]] = {
    "pipeline_status": ["status", "list", "show", "pipeline", "dag", "running", "failed"],
    "sql_query": ["table", "schema", "sql", "query", "select", "column", "database"],
    "investigation": ["slow", "fail", "error", "debug", "why", "root cause", "incident"],
    "pipeline_create": ["create", "build", "generate", "pipeline", "etl", "dag"],
    "architecture_create": ["architecture", "diagram", "design", "system design"],
    "monitoring": ["monitor", "health", "lag", "metric", "alert", "status"],
    "data_quality": ["quality", "validation", "test", "anomaly", "drift"],
}

INTENT_TO_AGENTS: Dict[str, List[str]] = {
    "pipeline_status": ["monitoring"],
    "sql_query": ["sql"],
    "investigation": ["monitoring", "debug"],
    "pipeline_create": ["pipeline"],
    "architecture_create": ["architecture"],
    "monitoring": ["monitoring"],
    "data_quality": ["monitoring", "sql"],
}

INTENT_TOOLS: Dict[str, List[str]] = {
    "sql": ["postgresql"],
    "pipeline": ["airflow"],
    "architecture": [],
    "monitoring": ["airflow", "kafka", "postgresql"],
    "debug": ["airflow", "postgresql"],
}


class AidenOrchestrator:
    """
    Master orchestrator that coordinates all AIDEN specialist agents.

    Responsibilities:
        1. Classify user intent
        2. Select required agents
        3. Create execution plans
        4. Run independent agents in parallel
        5. Synthesize results
        6. Require approval for risky actions
    """

    def __init__(self):
        self._agents: Dict[str, Any] = {}
        self._connectors = TOOL_REGISTRY
        self._run_history: List[Dict[str, Any]] = []
        self._initialize_agents()

    def _initialize_agents(self):
        """Create and register all specialist agents."""
        agents_list = [
            SQLAgentV2(),
            PipelineAgentV2(),
            ArchitectureAgentV2(),
            MonitoringAgentV2(),
            DebugAgentV2(),
        ]

        for agent in agents_list:
            self._agents[agent.name] = agent
            logger.info(f"Registered agent: {agent.name} ({agent.agent_type.value})")

        logger.info(f"AIDEN Orchestrator initialized with {len(self._agents)} agents and {len(self._connectors)} connectors")

    @property
    def agents(self) -> Dict[str, Any]:
        return self._agents

    @property
    def connectors(self) -> Dict[str, Any]:
        return self._connectors

    # ── Intent Classification ───────────────────────────────────────

    def classify_intent(self, request: str) -> Dict[str, Any]:
        """Classify a user request into an intent type and required agents."""
        lower = request.lower()

        scores = {}
        for intent, keywords in INTENT_RULES.items():
            score = sum(1 for kw in keywords if kw in lower)
            if score > 0:
                scores[intent] = score

        if not scores:
            return {
                "type": "complex",
                "intent": "general_inquiry",
                "agents": ["monitoring", "sql"],
                "confidence": 0.3,
            }

        best_intent = max(scores, key=scores.get)
        confidence = min(scores[best_intent] / 4.0, 1.0)

        return {
            "type": best_intent,
            "intent": best_intent,
            "agents": INTENT_TO_AGENTS.get(best_intent, ["monitoring"]),
            "confidence": confidence,
        }

    # ── Execution Plan ──────────────────────────────────────────────

    def create_plan(
        self,
        objective: str,
        agent_names: List[str],
        context: Optional[Dict[str, Any]] = None,
    ) -> ExecutionPlan:
        """Create a structured execution plan with steps for each agent."""
        steps = []
        for name in agent_names:
            tools = []
            for tool_name in INTENT_TO_AGENTS.get(name, []):
                tools.extend(INTENT_TOOLS.get(tool_name, []))

            step = ExecutionStep(
                agent_name=name,
                description=f"{name} agent: {objective}",
                tools_required=list(set(tools)),
                risk_level=RiskLevel.LOW,
            )
            steps.append(step)

        # Determine parallel groups: agents with no dependencies run in parallel
        # For now, we group agents that are independent (e.g., monitoring + sql can run in parallel)
        parallel_groups = []
        if len(steps) > 1:
            # Group monitoring + sql as parallel (they don't depend on each other)
            independent = [s.step_id for s in steps if s.agent_name in ("monitoring", "sql")]
            dependent = [s.step_id for s in steps if s.agent_name not in ("monitoring", "sql")]
            if independent:
                parallel_groups.append(independent)
            if dependent:
                for dep_id in dependent:
                    parallel_groups.append([dep_id])
        else:
            parallel_groups = [[s.step_id for s in steps]]

        return ExecutionPlan(
            objective=objective,
            steps=steps,
            parallel_groups=parallel_groups,
            risk_assessment=RiskLevel.LOW,
            estimated_time_seconds=len(steps) * 2.0,
        )

    # ── Execution ───────────────────────────────────────────────────

    async def execute_plan(
        self,
        plan: ExecutionPlan,
        context: Optional[Dict[str, Any]] = None,
    ) -> AgentResult:
        """Execute a plan, running parallel groups concurrently."""
        context = context or {}
        results: Dict[str, AgentResult] = {}
        all_evidence: List[str] = []
        all_tools: List[str] = []

        for group_idx, group in enumerate(plan.parallel_groups):
            logger.info(f"Executing parallel group {group_idx + 1}: {group}")

            tasks = []
            step_ids = []

            for step_id in group:
                step = next((s for s in plan.steps if s.step_id == step_id), None)
                if not step:
                    continue

                agent = self._agents.get(step.agent_name)
                if not agent:
                    logger.warning(f"Agent '{step.agent_name}' not found, skipping")
                    results[step_id] = AgentResult(
                        task_id=step_id,
                        agent_name=step.agent_name,
                        status=TaskStatus.FAILURE,
                        output={"error": f"Agent '{step.agent_name}' not registered"},
                    )
                    continue

                task = AgentTask(
                    task_id=step_id,
                    project_id=context.get("project_id", ""),
                    user_id=context.get("user_id", 0),
                    objective=step.description,
                    context=context,
                    allowed_tools=step.tools_required,
                    risk_level=step.risk_level,
                )

                tasks.append(agent.execute(task, context))
                step_ids.append(step_id)

            if tasks:
                gathered = await asyncio.gather(*tasks, return_exceptions=True)

                for sid, result in zip(step_ids, gathered):
                    if isinstance(result, Exception):
                        results[sid] = AgentResult(
                            task_id=sid,
                            agent_name="unknown",
                            status=TaskStatus.FAILURE,
                            output={"error": str(result)},
                        )
                    else:
                        results[sid] = result
                        all_evidence.extend(result.evidence)
                        all_tools.extend(result.tools_used)

        # Synthesize results
        total_confidence = sum(r.confidence for r in results.values()) / max(len(results), 1)
        total_time = sum(r.execution_time_ms for r in results.values())

        combined_output = {}
        for sid, result in results.items():
            combined_output[sid] = {
                "agent": result.agent_name,
                "status": result.status.value,
                "output": result.output,
                "confidence": result.confidence,
                "execution_time_ms": result.execution_time_ms,
            }

        return AgentResult(
            task_id=plan.plan_id,
            agent_name="orchestrator",
            agent_type=AgentType.ORCHESTRATOR,
            status=TaskStatus.SUCCESS,
            output={
                "plan_id": plan.plan_id,
                "objective": plan.objective,
                "results": combined_output,
                "total_agents": len(results),
                "total_time_ms": total_time,
            },
            confidence=total_confidence,
            evidence=list(set(all_evidence)),
            tools_used=list(set(all_tools)),
            execution_time_ms=total_time,
        )

    # ── High-Level Execute ──────────────────────────────────────────

    async def execute(
        self,
        objective: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        High-level execution: classify intent → create plan → execute → return results.

        This is the main entry point for the API.
        """
        run_id = f"run_{uuid.uuid4().hex[:8]}"
        start = time.monotonic()

        # 1. Classify intent
        intent = self.classify_intent(objective)

        # 2. Create plan
        plan = self.create_plan(
            objective=objective,
            agent_names=intent["agents"],
            context=context,
        )

        # 3. Execute plan
        result = await self.execute_plan(plan, context)

        elapsed_ms = (time.monotonic() - start) * 1000

        # 4. Store run in history
        run_record = {
            "run_id": run_id,
            "objective": objective,
            "intent": intent,
            "plan_id": plan.plan_id,
            "status": result.status.value,
            "confidence": result.confidence,
            "agents_used": [s.agent_name for s in plan.steps],
            "tools_used": result.tools_used,
            "evidence": result.evidence,
            "output": result.output,
            "execution_time_ms": elapsed_ms,
            "created_at": datetime.utcnow().isoformat(),
        }
        self._run_history.append(run_record)

        # Keep only last 100 runs
        if len(self._run_history) > 100:
            self._run_history = self._run_history[-100:]

        return run_record

    # ── Connector Helpers ───────────────────────────────────────────

    async def call_connector(
        self,
        tool_name: str,
        action: str,
        params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Directly call a tool connector through the orchestrator."""
        connector = self._connectors.get(tool_name)
        if not connector:
            return {"error": f"Connector '{tool_name}' not registered"}

        try:
            result = await connector.execute(action, params or {})
            return result.model_dump() if hasattr(result, "model_dump") else result
        except Exception as e:
            logger.error(f"Connector {tool_name}.{action} failed: {e}")
            return {"error": str(e)}

    async def get_connector_health(self, tool_name: Optional[str] = None) -> Dict[str, Any]:
        """Get health status of one or all connectors."""
        if tool_name:
            connector = self._connectors.get(tool_name)
            if not connector:
                return {"error": f"Connector '{tool_name}' not registered"}
            health = await connector.health()
            return health.model_dump() if hasattr(health, "model_dump") else health

        results = {}
        for name, connector in self._connectors.items():
            try:
                health = await connector.health()
                results[name] = health.model_dump() if hasattr(health, "model_dump") else health
            except Exception as e:
                results[name] = {"status": "error", "error": str(e)}
        return results

    # ── Agent Info ──────────────────────────────────────────────────

    def list_agents(self) -> List[Dict[str, Any]]:
        """List all registered agents with their info."""
        return [
            {
                "name": agent.name,
                "type": agent.agent_type.value,
                "description": agent.description,
                "permissions": agent.permissions,
                "tools": [t.name if hasattr(t, "name") else str(t) for t in getattr(agent, "tools", [])],
            }
            for agent in self._agents.values()
        ]

    def list_connectors(self) -> List[Dict[str, Any]]:
        """List all registered connectors with their registry entries."""
        return [
            connector.to_registry_entry()
            for connector in self._connectors.values()
        ]

    def get_run_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent execution run history."""
        return self._run_history[-limit:]

    def get_run(self, run_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific run by ID."""
        for run in self._run_history:
            if run["run_id"] == run_id:
                return run
        return None


# ── Singleton ────────────────────────────────────────────────────────

aiden_orchestrator = AidenOrchestrator()
