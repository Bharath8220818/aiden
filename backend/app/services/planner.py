"""AIDEN Planner — decomposes a classified intent into an execution DAG.

The plan is a DAG of steps: {step_id, agent, objective, params, depends_on,
parallel_group}. Steps with the same parallel_group are independent and run
concurrently; depends_on edges carry upstream outputs into downstream steps.
"""
import logging
import time
import uuid
from typing import Dict, List

from app.agents.intent_agent import IntentAgent, IntentClassification

logger = logging.getLogger(__name__)


def _derive_parallel_groups(steps: List[dict]) -> Dict[int, List[str]]:
    """Group DAG steps into parallel waves by longest-path depth.

    Wave 0: steps with no dependencies. Wave N: steps whose dependencies all
    complete in earlier waves. Preserves the explicit parallel_group hint when
    it is consistent with the dependency order.
    """
    if not steps:
        return {}

    by_id = {s["step_id"]: s for s in steps}
    depth: Dict[str, int] = {}
    in_progress = True
    while in_progress:  # iterate until fixpoint (small graphs, safe for acyclic DAGs)
        in_progress = False
        for step in steps:
            sid = step["step_id"]
            if sid in depth:
                continue
            deps = [d for d in step.get("depends_on", []) if d in by_id]
            if not step.get("depends_on"):
                depth[sid] = 0
                in_progress = True
            elif deps and all(d in depth for d in deps):
                depth[sid] = max(depth[d] for d in deps) + 1
                in_progress = True
            # deps referencing unknown steps (or unsatisfiable cycles) never resolve here
    # Unresolvable steps (dependency cycle or missing dep) get their own final wave
    max_depth = max(depth.values()) if depth else -1
    for step in steps:
        depth.setdefault(step["step_id"], max_depth + 1)

    waves: Dict[int, List[str]] = {}
    for step in sorted(steps, key=lambda s: s.get("parallel_group", 0)):
        wave = depth[step["step_id"]]
        waves.setdefault(wave, []).append(step["step_id"])
    return waves


class Planner:
    """Intent → ExecutionPlan (DAG) converter."""

    def __init__(self, intent_agent: IntentAgent = None):
        self.intent_agent = intent_agent or IntentAgent()

    def create_plan(self, user_input: str, context: dict = None) -> dict:
        """Classify the request and build a DAG plan. Returns an ExecutionPlan-shaped dict."""
        context = context or {}
        classification = self.intent_agent.classify(user_input)
        steps = self._plan_steps(classification, user_input, context)
        parallel_groups = _derive_parallel_groups(steps)

        return {
            "plan_id": f"plan_{uuid.uuid4().hex[:8]}",
            "objective": user_input,
            "intent": classification.intent,
            "intent_confidence": classification.confidence,
            "entities": classification.entities,
            "steps": steps,
            "parallel_groups": parallel_groups,
            "created_at": time.time(),
        }

    def _plan_steps(self, c: IntentClassification, user_input: str, context: dict) -> List[dict]:
        pipeline = c.entities.get("pipeline_name", "")
        env = c.entities.get("environment", context.get("environment", "dev"))

        if c.intent == "pipeline_status":
            return [
                {"step_id": "s1", "agent": "monitoring", "objective": f"Get status of pipelines: {user_input}",
                 "params": {"pipeline_name": pipeline}, "depends_on": [], "parallel_group": 1},
            ]

        if c.intent == "sql_query":
            return [
                {"step_id": "s1", "agent": "sql", "objective": user_input,
                 "params": {**c.entities}, "depends_on": [], "parallel_group": 1},
            ]

        if c.intent == "investigation":
            return [
                {"step_id": "s1", "agent": "monitoring", "objective": f"Collect health and metrics: {pipeline or user_input}",
                 "params": {"pipeline_name": pipeline}, "depends_on": [], "parallel_group": 1},
                {"step_id": "s2", "agent": "debug", "objective": f"Diagnose root cause: {user_input}",
                 "params": {"pipeline_name": pipeline}, "depends_on": ["s1"], "parallel_group": 2},
                {"step_id": "s3", "agent": "self_healing", "objective": f"Propose remediation: {user_input}",
                 "params": {"pipeline_name": pipeline, "environment": env}, "depends_on": ["s2"], "parallel_group": 3},
            ]

        if c.intent == "pipeline_create":
            return [
                {"step_id": "s1", "agent": "sql", "objective": f"Inspect source schema for: {user_input}",
                 "params": {**c.entities}, "depends_on": [], "parallel_group": 1},
                {"step_id": "s2", "agent": "pipeline", "objective": f"Design and generate pipeline: {user_input}",
                 "params": {**c.entities, "schedule": c.entities.get("schedule", "daily")},
                 "depends_on": ["s1"], "parallel_group": 2},
                {"step_id": "s3", "agent": "monitoring", "objective": f"Define quality checks and monitoring for: {user_input}",
                 "params": {**c.entities, "pipeline_name": pipeline}, "depends_on": ["s2"], "parallel_group": 3},
                {"step_id": "s4", "agent": "self_healing", "objective": f"Prepare failure playbooks for: {user_input}",
                 "params": {**c.entities, "environment": env}, "depends_on": ["s3"], "parallel_group": 4},
            ]

        if c.intent == "architecture_create":
            return [
                {"step_id": "s1", "agent": "architecture", "objective": user_input,
                 "params": {**c.entities}, "depends_on": [], "parallel_group": 1},
                {"step_id": "s2", "agent": "monitoring", "objective": f"Add observability layer to: {user_input}",
                 "params": {**c.entities}, "depends_on": ["s1"], "parallel_group": 2},
            ]

        if c.intent == "quality_check":
            return [
                {"step_id": "s1", "agent": "monitoring", "objective": f"Run quality checks: {user_input}",
                 "params": {**c.entities}, "depends_on": [], "parallel_group": 1},
                {"step_id": "s2", "agent": "sql", "objective": f"Profile data for quality report: {user_input}",
                 "params": {**c.entities}, "depends_on": ["s1"], "parallel_group": 2},
            ]

        if c.intent == "incident_management":
            return [
                {"step_id": "s1", "agent": "monitoring", "objective": f"Gather incident evidence: {user_input}",
                 "params": {**c.entities}, "depends_on": [], "parallel_group": 1},
                {"step_id": "s2", "agent": "debug", "objective": f"Analyze incident root cause: {user_input}",
                 "params": {**c.entities}, "depends_on": ["s1"], "parallel_group": 2},
                {"step_id": "s3", "agent": "self_healing", "objective": f"Propose fix: {user_input}",
                 "params": {**c.entities, "environment": env}, "depends_on": ["s2"], "parallel_group": 3},
            ]

        # general / unknown → broad parallel investigation
        return [
            {"step_id": "s1", "agent": "monitoring", "objective": user_input,
             "params": {}, "depends_on": [], "parallel_group": 1},
            {"step_id": "s2", "agent": "sql", "objective": user_input,
             "params": {}, "depends_on": [], "parallel_group": 1},
        ]
