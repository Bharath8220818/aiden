"""Tests for the DAG planner and executor.

Verifies:
- Planner emits steps with depends_on chains and derived parallel waves
- Executor runs dependency waves (downstream after upstream), passes
  upstream outputs into downstream steps, and handles failures/cycles
- Plan-graph events are broadcast at the right lifecycle points
"""
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.planner import Planner, _derive_parallel_groups
from app.services.executor import Executor, _plan_waves
from app.agents.intent_agent import IntentClassification


# ── Planner ───────────────────────────────────────────────────────────


def _classification(intent: str, entities: dict = None) -> IntentClassification:
    return IntentClassification(intent, entities or {}, 0.9)


class TestPlanner:
    def _planner_with(self, intent: str, entities: dict = None) -> Planner:
        planner = Planner(intent_agent=MagicMock())
        planner.intent_agent.classify = MagicMock(
            return_value=_classification(intent, entities)
        )
        return planner

    def test_investigation_plan_is_a_chain(self):
        plan = self._planner_with("investigation", {"pipeline_name": "sales_etl"}).create_plan(
            "why is sales_etl failing"
        )
        deps = {s["step_id"]: s["depends_on"] for s in plan["steps"]}
        assert deps["s1"] == []
        assert deps["s2"] == ["s1"]
        assert deps["s3"] == ["s2"]
        assert plan["intent"] == "investigation"
        # parallel_groups derived: 3 waves of 1
        assert plan["parallel_groups"] == {0: ["s1"], 1: ["s2"], 2: ["s3"]}

    def test_pipeline_create_is_a_chain(self):
        plan = self._planner_with("pipeline_create", {"pipeline_name": "users_sync"}).create_plan(
            "create a pipeline for users_sync"
        )
        agents = [s["agent"] for s in plan["steps"]]
        assert agents == ["sql", "pipeline", "monitoring", "self_healing"]
        assert plan["steps"][1]["depends_on"] == ["s1"]

    def test_general_plan_runs_in_parallel(self):
        plan = self._planner_with("general").create_plan("hello there")
        assert plan["parallel_groups"] == {0: ["s1", "s2"]}

    def test_waves_handle_unknown_deps(self):
        steps = [
            {"step_id": "a", "depends_on": ["missing"]},
            {"step_id": "b", "depends_on": []},
        ]
        waves = _derive_parallel_groups(steps)
        # 'b' resolves to wave 0; 'a' can never resolve → its own final wave
        assert waves[0] == ["b"]
        assert waves[max(waves)] == ["a"]

    def test_derive_groups_empty(self):
        assert _derive_parallel_groups([]) == {}


# ── Executor wave computation ─────────────────────────────────────────


class TestPlanWaves:
    def test_chain_waves(self):
        plan = {"steps": [
            {"step_id": "s1", "depends_on": []},
            {"step_id": "s2", "depends_on": ["s1"]},
            {"step_id": "s3", "depends_on": ["s2"]},
        ]}
        waves = _plan_waves(plan)
        assert [[s["step_id"] for s in w] for w in waves] == [["s1"], ["s2"], ["s3"]]

    def test_diamond_waves(self):
        plan = {"steps": [
            {"step_id": "a", "depends_on": []},
            {"step_id": "b", "depends_on": ["a"]},
            {"step_id": "c", "depends_on": ["a"]},
            {"step_id": "d", "depends_on": ["b", "c"]},
        ]}
        waves = _plan_waves(plan)
        ids = [[s["step_id"] for s in w] for w in waves]
        assert ids[0] == ["a"]
        assert sorted(ids[1]) == ["b", "c"]
        assert ids[2] == ["d"]

    def test_cycle_falls_back_to_final_wave(self):
        plan = {"steps": [
            {"step_id": "a", "depends_on": ["b"]},
            {"step_id": "b", "depends_on": ["a"]},
        ]}
        waves = _plan_waves(plan)
        assert len(waves) == 1  # remainder scheduled despite the cycle

    def test_empty_plan(self):
        assert _plan_waves({"steps": []}) == []


# ── Executor execution ────────────────────────────────────────────────


def _mock_registry(agent_map: dict):
    """Patch app.agents.registry.agent_registry inside Executor._run_step."""
    registry = MagicMock()
    registry.get.side_effect = lambda name: agent_map.get(name)
    return patch("app.agents.registry.agent_registry", registry)


def _mock_agent(response: str = "ok", confidence: float = 0.9, fail: bool = False):
    agent = MagicMock()
    if fail:
        agent.execute = AsyncMock(side_effect=RuntimeError("boom"))
    else:
        from app.schemas.agent_communication import AgentResult, TaskStatus
        agent.execute = AsyncMock(return_value=AgentResult(
            task_id="t", agent_name="mock", status=TaskStatus.SUCCESS,
            output={"response": response}, confidence=confidence,
        ))
    return agent


class TestExecutorExecution:
    async def test_downstream_sees_upstream_output(self):
        """The downstream step's task context must include upstream output."""
        captured = {}

        async def capture_execute(task, context=None):
            captured["upstream"] = task.context.get("upstream", {})
            from app.schemas.agent_communication import AgentResult, TaskStatus
            return AgentResult(task_id=task.task_id, agent_name="m",
                               status=TaskStatus.SUCCESS, output={"response": "done"},
                               confidence=0.8)

        agent = MagicMock()
        agent.execute = AsyncMock(side_effect=capture_execute)

        plan = {"plan_id": "p1", "intent": "investigation", "steps": [
            {"step_id": "s1", "agent": "monitoring", "objective": "collect",
             "params": {}, "depends_on": []},
            {"step_id": "s2", "agent": "debug", "objective": "diagnose",
             "params": {}, "depends_on": ["s1"]},
        ]}

        with _mock_registry({"monitoring": agent, "debug": agent}):
            result = await Executor.execute_plan(plan, broadcast=False)

        assert result["status"] == "success"
        assert captured["upstream"]["s1"] == {"response": "done"}

    async def test_unknown_agent_fails_gracefully(self):
        plan = {"plan_id": "p1", "steps": [
            {"step_id": "s1", "agent": "nope", "objective": "x", "params": {}, "depends_on": []},
        ]}
        with _mock_registry({}):
            result = await Executor.execute_plan(plan, broadcast=False)
        assert result["status"] == "failure"
        assert "not registered" in result["results"]["s1"]["error"]

    async def test_agent_exception_marked_failed(self):
        plan = {"plan_id": "p1", "steps": [
            {"step_id": "s1", "agent": "a", "objective": "x", "params": {}, "depends_on": []},
        ]}
        with _mock_registry({"a": _mock_agent(fail=True)}):
            result = await Executor.execute_plan(plan, broadcast=False)
        assert result["status"] == "failure"

    async def test_partial_success(self):
        ok = _mock_agent("fine")
        bad = _mock_agent(fail=True)
        plan = {"plan_id": "p1", "steps": [
            {"step_id": "s1", "agent": "a", "objective": "x", "params": {}, "depends_on": []},
            {"step_id": "s2", "agent": "b", "objective": "y", "params": {}, "depends_on": []},
        ]}
        with _mock_registry({"a": ok, "b": bad}):
            result = await Executor.execute_plan(plan, broadcast=False)
        assert result["status"] == "partial"
        assert result["total_steps"] == 2


# ── Graph broadcasting ────────────────────────────────────────────────


class TestGraphBroadcasting:
    async def test_plan_lifecycle_broadcast(self):
        """started → step(running) → step(success) → completed order."""
        events = []

        async def fake_broadcast(payload):
            events.append(payload)

        agent = _mock_agent("all good")
        plan = {"plan_id": "p1", "intent": "sql_query", "steps": [
            {"step_id": "s1", "agent": "sql", "objective": "run query",
             "params": {}, "depends_on": []},
        ]}

        with _mock_registry({"sql": agent}), patch("app.api.v1.websocket.manager") as mock_mgr:
            mock_mgr.broadcast = AsyncMock(side_effect=fake_broadcast)
            result = await Executor.execute_plan(plan, broadcast=True)

        assert result["status"] == "success"
        assert events[0]["data"]["phase"] == "started"
        # 'started' carries the full node list for the client to lay out
        assert [n["step_id"] for n in events[0]["data"]["nodes"]] == ["s1"]
        assert events[0]["data"]["nodes"][0]["depends_on"] == []
        # step events transition running → success
        step_events = [e for e in events if e["data"].get("phase") == "step"]
        assert [e["data"]["status"] for e in step_events] == ["running", "success"]
        # final event is the completed phase with overall status
        assert events[-1]["data"]["phase"] == "completed"
        assert events[-1]["data"]["status"] == "success"

    async def test_broadcast_failure_does_not_break_execution(self):
        """WebSocket down → execution still completes."""
        agent = _mock_agent("fine")
        plan = {"plan_id": "p1", "steps": [
            {"step_id": "s1", "agent": "a", "objective": "x", "params": {}, "depends_on": []},
        ]}
        with _mock_registry({"a": agent}), patch("app.api.v1.websocket.manager") as mock_mgr:
            mock_mgr.broadcast = AsyncMock(side_effect=RuntimeError("ws down"))
            result = await Executor.execute_plan(plan, broadcast=True)
        assert result["status"] == "success"
