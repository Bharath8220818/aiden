"""AIDEN Executor — runs a plan's step DAG through the AgentRegistry.

Steps are executed in dependency waves derived from ``depends_on`` (falls back
to ``parallel_group`` when present). Steps in the same wave run concurrently
via asyncio.gather; downstream steps receive upstream outputs via
``context["upstream"]`` keyed by step_id. Every plan/step lifecycle transition
is broadcast over WebSocket so the agent-activity feed can render the graph.
"""
import asyncio
import logging
import time
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


def _plan_waves(plan: dict) -> List[List[dict]]:
    """Compute execution waves from depends_on (respecting explicit parallel_group hints).

    A step becomes ready once all of its depends_on steps are scheduled in
    earlier waves. Steps that never become ready (cycle / unknown dep) are
    appended to the final wave so the run still completes with an error.
    """
    steps: List[dict] = plan.get("steps", [])
    if not steps:
        return []

    by_id = {s["step_id"]: s for s in steps}
    wave_of: Dict[str, int] = {}
    waves: List[List[dict]] = []

    pending = [s for s in steps]
    while pending:
        ready = [
            s for s in pending
            if all(d in wave_of for d in s.get("depends_on", []) if d in by_id)
        ]
        if not ready:
            # Dependency cycle or unknown deps — schedule the remainder anyway.
            logger.warning(f"Plan {plan.get('plan_id')}: unresolvable dependencies; scheduling remainder")
            ready = pending
        for s in ready:
            wave_of[s["step_id"]] = len(waves)
        waves.append(sorted(ready, key=lambda s: s.get("parallel_group", 0)))
        pending = [s for s in pending if s["step_id"] not in wave_of]

    return waves


class PlanEventPublisher:
    """WebSocket publisher for plan-graph lifecycle events. Fails silent."""

    @staticmethod
    async def _broadcast(payload: dict) -> None:
        try:
            from app.api.v1.websocket import manager
            await manager.broadcast(payload)
        except Exception:  # pragma: no cover — WebSocket not up in some contexts
            pass

    @classmethod
    async def plan_started(cls, plan: dict) -> None:
        await cls._broadcast({
            "type": "plan_graph",
            "run_id": plan.get("plan_id"),
            "timestamp": time.time(),
            "data": {
                "phase": "started",
                "plan_id": plan.get("plan_id"),
                "objective": plan.get("objective", ""),
                "intent": plan.get("intent"),
                "nodes": [
                    {
                        "step_id": s["step_id"],
                        "agent": s.get("agent", ""),
                        "objective": s.get("objective", ""),
                        "depends_on": s.get("depends_on", []),
                        "status": "pending",
                    }
                    for s in plan.get("steps", [])
                ],
            },
        })

    @classmethod
    async def step_update(cls, plan_id: str, step: dict, status: str,
                          detail: str = "", execution_time_ms: float = 0,
                          tools_used: Optional[List[str]] = None) -> None:
        await cls._broadcast({
            "type": "plan_graph",
            "run_id": plan_id,
            "timestamp": time.time(),
            "data": {
                "phase": "step",
                "plan_id": plan_id,
                "step_id": step.get("step_id", ""),
                "agent": step.get("agent", ""),
                "depends_on": step.get("depends_on", []),
                "status": status,
                "detail": detail,
                "execution_time_ms": execution_time_ms,
                "tools_used": tools_used or [],
            },
        })

    @classmethod
    async def plan_completed(cls, plan_id: str, status: str, summary: str = "",
                             execution_time_ms: float = 0) -> None:
        await cls._broadcast({
            "type": "plan_graph",
            "run_id": plan_id,
            "timestamp": time.time(),
            "data": {
                "phase": "completed",
                "plan_id": plan_id,
                "status": status,
                "summary": summary,
                "execution_time_ms": execution_time_ms,
            },
        })


class Executor:
    """Plan DAG → agent results runner with graph event broadcasting."""

    @classmethod
    async def execute_plan(cls, plan: dict, context: dict = None, broadcast: bool = True) -> dict:
        """Execute all steps of a plan DAG. Returns aggregated results."""
        context = context or {}
        results: Dict[str, dict] = {}
        waves = _plan_waves(plan)

        if broadcast:
            await PlanEventPublisher.plan_started(plan)

        total_start = time.monotonic()
        for wave in waves:
            wave_results = await asyncio.gather(*[
                cls._run_step(step, results, context, plan, broadcast)
                for step in wave
            ])
            for step, result in zip(wave, wave_results):
                results[step["step_id"]] = result

        aggregate = cls._aggregate(plan, results)
        aggregate["execution_time_ms"] = (time.monotonic() - total_start) * 1000

        if broadcast:
            await PlanEventPublisher.plan_completed(
                plan_id=plan.get("plan_id", ""),
                status=aggregate["status"],
                summary=aggregate["summary"],
                execution_time_ms=aggregate["execution_time_ms"],
            )
        return aggregate

    @classmethod
    async def _run_step(cls, step: dict, upstream: Dict[str, dict], context: dict,
                        plan: dict, broadcast: bool) -> dict:
        from app.agents.registry import agent_registry

        agent_name = step.get("agent", "")
        agent = agent_registry.get(agent_name)
        if agent is None:
            if broadcast:
                await PlanEventPublisher.step_update(
                    plan.get("plan_id", ""), step, "failed",
                    detail=f"agent '{agent_name}' not registered",
                )
            return {"agent": agent_name, "status": "failure", "error": f"agent '{agent_name}' not registered"}

        # Assemble the task from the step + upstream context
        from app.schemas.agent_communication import AgentTask, AgentType
        upstream_payload = {
            k: v.get("output", {}) for k, v in upstream.items()
            if k in step.get("depends_on", [])
        }
        task = AgentTask(
            task_id=f"{step['step_id']}_{int(time.time())}",
            objective=step.get("objective", ""),
            agent_type=_agent_type_for(agent_name),
            context={**context, **step.get("params", {}), "upstream": upstream_payload},
        )

        if broadcast:
            await PlanEventPublisher.step_update(
                plan.get("plan_id", ""), step, "running",
                detail=step.get("objective", ""),
            )

        step_start = time.monotonic()
        try:
            result = await agent.execute(task, context=task.context)
            elapsed_ms = (time.monotonic() - step_start) * 1000
            status_value = result.status.value if hasattr(result.status, "value") else str(result.status)
            output = result.output if isinstance(result.output, dict) else {"response": str(result.output)}

            if broadcast:
                await PlanEventPublisher.step_update(
                    plan.get("plan_id", ""), step,
                    "success" if status_value == "success" else "failed",
                    detail=output.get("response", "")[:200],
                    execution_time_ms=elapsed_ms,
                    tools_used=result.tools_used,
                )

            return {
                "agent": agent_name,
                "status": status_value,
                "output": output,
                "confidence": result.confidence,
                "tools_used": result.tools_used,
                "execution_time_ms": result.execution_time_ms or elapsed_ms,
            }
        except Exception as e:
            elapsed_ms = (time.monotonic() - step_start) * 1000
            logger.error(f"Step {step['step_id']} ({agent_name}) failed: {e}")
            if broadcast:
                await PlanEventPublisher.step_update(
                    plan.get("plan_id", ""), step, "failed",
                    detail=str(e)[:200], execution_time_ms=elapsed_ms,
                )
            return {"agent": agent_name, "status": "failure", "error": str(e), "execution_time_ms": elapsed_ms}

    @staticmethod
    def _aggregate(plan: dict, results: Dict[str, dict]) -> dict:
        statuses = [r.get("status") for r in results.values()]
        if statuses and all(s == "success" for s in statuses):
            overall = "success"
        elif any(s == "success" for s in statuses):
            overall = "partial"
        else:
            overall = "failure"

        # Highest-confidence result provides the headline answer
        best = max(
            (r for r in results.values() if r.get("status") == "success"),
            key=lambda r: r.get("confidence", 0),
            default=None,
        )
        agents_used = sorted({r.get("agent") for r in results.values() if r.get("agent")})
        tools_used = sorted({t for r in results.values() for t in r.get("tools_used", [])})

        return {
            "plan_id": plan.get("plan_id"),
            "intent": plan.get("intent"),
            "status": overall,
            "results": results,
            "summary": (best or {}).get("output", {}).get("response", ""),
            "agents_used": agents_used,
            "tools_used": tools_used,
            "total_steps": len(results),
            "execution_time_ms": sum(r.get("execution_time_ms", 0) for r in results.values()),
        }


def _agent_type_for(agent_name: str):
    """Map a registry name to the AgentType enum (best effort)."""
    from app.schemas.agent_communication import AgentType
    mapping = {
        "sql": AgentType.SQL,
        "pipeline": AgentType.PIPELINE,
        "monitoring": AgentType.MONITORING,
        "debug": AgentType.DEBUG,
        "architecture": AgentType.ARCHITECTURE,
        "self_healing": AgentType.SELF_HEALING,
        "security": AgentType.SECURITY,
    }
    return mapping.get(agent_name, AgentType.ORCHESTRATOR)
