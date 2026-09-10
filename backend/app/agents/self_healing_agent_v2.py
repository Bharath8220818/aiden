"""AIDEN Self-Healing Agent v2 — evidence-driven diagnosis with risk-gated remediation.

Flow (mirrors the AIDEN design doc):
  1. Collect evidence (Airflow logs, DB schema, connector health)
  2. Search RAG memory for similar past incidents + fixes
  3. Propose a fix (LLM when available, heuristic otherwise)
  4. Evaluate risk via the Risk Engine
  5. Auto-execute only LOW/MEDIUM fixes; request approval for HIGH/CRITICAL
  6. Store the successful fix in memory for future incidents
"""
import logging
import time
from typing import Dict, Any

from app.schemas.agent_communication import AgentTask, AgentResult, AgentType, TaskStatus
from app.agents.base_agent_v2 import BaseAIDENAgent

logger = logging.getLogger(__name__)


class SelfHealingAgentV2(BaseAIDENAgent):
    """Diagnoses incidents and proposes (or applies) fixes with risk gating."""

    name = "self_healing_agent"
    agent_type = AgentType.SELF_HEALING
    description = "Diagnoses failures, proposes risk-assessed fixes, learns from resolutions"
    system_prompt = (
        "You are the AIDEN Self-Healing Agent. You may propose remediation for failed "
        "data engineering workflows. You must NEVER directly deploy an unapproved "
        "production change. Workflow: verify incident evidence → diagnose root cause → "
        "retrieve similar past fixes → generate remediation options ranked by confidence "
        "and risk → require human approval for production changes → monitor the result. "
        "Every action must be auditable."
    )
    permissions = ["diagnosis.read", "fix.propose", "orchestration.write"]
    tool_names = [
        "airflow_get_dag_logs", "airflow_get_dag_status", "airflow_list_dags",
        "pg_describe_table", "pg_get_health", "kafka_get_health",
    ]

    # Heuristic fix knowledge base (used when no RAG match and no LLM)
    KNOWN_FIXES = [
        {"keywords": ["connection", "refused", "timeout"], "fix": {
            "action": "restart_task",
            "description": "Connection error detected — retry the task and verify the source database is reachable.",
            "risk": "medium",
        }},
        {"keywords": ["column", "schema", "renamed", "missing"], "fix": {
            "action": "modify_dag",
            "description": "Schema mismatch detected — update column mapping in the transformation and re-run.",
            "risk": "high",
        }},
        {"keywords": ["memory", "oom", "killed"], "fix": {
            "action": "restart_task",
            "description": "Out-of-memory failure — increase executor memory or reduce batch size.",
            "risk": "medium",
        }},
        {"keywords": ["permission", "denied", "unauthorized"], "fix": {
            "action": "clear_cache",
            "description": "Permission error — verify credentials and IAM policy for the connector.",
            "risk": "medium",
        }},
        {"keywords": ["lag", "consumer", "kafka"], "fix": {
            "action": "trigger_dag",
            "description": "Consumer lag detected — scale consumers or reset offsets after validation.",
            "risk": "high",
        }},
    ]

    # ── Main entry point ────────────────────────────────────────────────

    async def handle_incident(self, incident: dict, context: dict = None) -> dict:
        """Full self-healing flow for an incident dict (not an AgentTask)."""
        context = context or {}
        evidence = await self._collect_evidence(incident)
        similar = await self._search_memory(incident, context)
        proposal = self._propose_fix(incident, evidence, similar)
        risk = self._evaluate_risk(proposal, context)
        needs_approval = risk in ("high", "critical")

        return {
            "incident": incident.get("title", "unknown"),
            "root_cause": proposal.get("root_cause"),
            "confidence": proposal.get("confidence", 0.5),
            "evidence": evidence,
            "similar_past_fixes": [s.get("payload", {}).get("content", "")[:200] for s in similar],
            "proposed_fix": proposal,
            "risk": risk,
            "approval_required": needs_approval,
            "status": "needs_approval" if needs_approval else "ready_to_apply",
        }

    # ── Step 1: evidence ────────────────────────────────────────────────

    async def _collect_evidence(self, incident: dict) -> list:
        evidence = []
        pipeline = incident.get("pipeline_name", "") or incident.get("objective", "")

        for tool_name in ("airflow_get_dag_logs", "airflow_get_dag_status"):
            result = await self._execute_tool(tool_name, {"dag_id": pipeline} if pipeline else {})
            if result and not result.get("error"):
                evidence.append({tool_name: result.get("data", result)})
            elif result:
                evidence.append({tool_name: f"unavailable: {result.get('error', '')[:100]}"})

        for tool_name in ("pg_get_health", "kafka_get_health"):
            result = await self._execute_tool(tool_name, {})
            if result and not result.get("error"):
                evidence.append({tool_name: result.get("data", result)})

        return evidence

    # ── Step 2: memory ──────────────────────────────────────────────────

    async def _search_memory(self, incident: dict, context: dict) -> list:
        try:
            from app.rag.memory_manager import rag_memory
            return await rag_memory.search_similar(
                incident,
                project_id=context.get("project_id"),
                top_k=3,
            )
        except Exception as e:
            logger.debug(f"Memory search skipped: {e}")
            return []

    # ── Step 3: fix proposal ────────────────────────────────────────────

    def _propose_fix(self, incident: dict, evidence: list, similar: list) -> dict:
        # 1. RAG match beats heuristics
        if similar and similar[0].get("score", 0) > 0.7:
            payload = similar[0].get("payload", {})
            return {
                "root_cause": "matched a previously resolved incident",
                "action": "apply_known_fix",
                "description": payload.get("content", "")[:500],
                "confidence": min(0.95, 0.6 + similar[0]["score"] / 4),
                "source": "rag_memory",
            }

        # 2. Keyword heuristics over evidence text
        evidence_text = str(evidence).lower() + " " + str(incident).lower()
        for entry in self.KNOWN_FIXES:
            if any(kw in evidence_text for kw in entry["keywords"]):
                fix = dict(entry["fix"])
                fix["root_cause"] = f"pattern matched: {entry['keywords'][0]}"
                fix["confidence"] = 0.75
                fix["source"] = "heuristic"
                return fix

        # 3. Generic fallback
        return {
            "root_cause": "undetermined — manual investigation required",
            "action": "investigate",
            "description": "No known pattern matched. Review the collected evidence and pipeline logs.",
            "confidence": 0.4,
            "source": "fallback",
        }

    # ── Step 4: risk ────────────────────────────────────────────────────

    def _evaluate_risk(self, proposal: dict, context: dict) -> str:
        from app.services.risk_engine import RiskEngine
        risk = RiskEngine.evaluate(
            proposal.get("action", "investigate"),
            context.get("environment", "dev"),
        )
        return risk.value

    # ── Learning ────────────────────────────────────────────────────────

    async def learn_from_resolution(self, incident: dict, fix: dict) -> dict:
        """Store a successful fix in RAG memory for future matching."""
        try:
            from app.rag.memory_manager import rag_memory
            return await rag_memory.store_fix(incident, fix)
        except Exception as e:
            logger.warning(f"Memory store failed: {e}")
            return {"stored": 0}

    # ── Agent interface ─────────────────────────────────────────────────

    async def _execute_fallback(self, task: AgentTask, context: dict) -> AgentResult:
        start = time.monotonic()
        incident = {
            "title": task.objective,
            "pipeline_name": context.get("pipeline_name", ""),
            "description": context.get("description", ""),
            "severity": context.get("severity", "error"),
            "project_id": context.get("project_id"),
        }
        result = await self.handle_incident(incident, context)
        return AgentResult(
            task_id=task.task_id,
            agent_name=self.name,
            agent_type=self.agent_type,
            status=TaskStatus.SUCCESS,
            output={"response": result.get("proposed_fix", {}).get("description", ""), **result},
            confidence=result.get("confidence", 0.5),
            evidence=[f"risk={result.get('risk')}", f"approval_required={result.get('approval_required')}"],
            execution_time_ms=(time.monotonic() - start) * 1000,
        )
