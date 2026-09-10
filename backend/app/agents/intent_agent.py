"""AIDEN Intent Agent — classifies natural-language requests into intents.

Deterministic keyword scoring first (fast, free, no LLM needed); the LLM is
only consulted for low-confidence or ambiguous requests. Produces structured
IntentClassification output consumed by the Planner.
"""
import logging
import re
from typing import Optional

from app.schemas.agent_communication import AgentTask, AgentResult, AgentType, TaskStatus
from app.agents.base_agent_v2 import BaseAIDENAgent

logger = logging.getLogger(__name__)


class IntentClassification:
    """Structured result of intent classification."""

    def __init__(self, intent: str, entities: dict, confidence: float):
        self.intent = intent
        self.entities = entities
        self.confidence = confidence

    def to_dict(self) -> dict:
        return {
            "intent": self.intent,
            "entities": self.entities,
            "confidence": round(self.confidence, 3),
        }


# Deterministic intent rules: intent → (weighted keyword list)
INTENT_RULES = {
    "pipeline_status": ["status", "list", "show", "pipeline", "dag", "running", "failed", "health"],
    "sql_query": ["sql", "query", "select", "table", "schema", "count", "column", "database"],
    "investigation": ["why", "slow", "fail", "failing", "error", "debug", "broken", "stuck", "investigate"],
    "pipeline_create": ["create", "build", "generate", "new pipeline", "set up", "etl", "ingest"],
    "architecture_create": ["architecture", "diagram", "design", "topology", "blueprint"],
    "quality_check": ["quality", "dq", "validation", "expectations", "nulls", "duplicates"],
    "incident_management": ["incident", "alert", "severity", "oncall", "page"],
}

# Entities extractable from the request text
ENTITY_PATTERNS = {
    "pipeline_name": r"\b([a-z][a-z0-9_]{2,}_(?:etl|pipeline|sync|load|dag))\b",
    "table_name": r"\b(?:table|from|into|in)\s+([a-z][a-z0-9_]{2,})\b",
    "schedule": r"\b(daily|weekly|monthly|hourly|real[- ]?time)\b",
    "environment": r"\b(dev|development|staging|prod|production)\b",
}


class IntentAgent(BaseAIDENAgent):
    """Classifies user requests into structured intents with entities."""

    name = "intent_agent"
    agent_type = AgentType.ORCHESTRATOR
    description = "Parses natural language into structured intents and entities"
    system_prompt = (
        "You are the AIDEN Intent Agent. Classify the user's data engineering request "
        "into exactly one intent: pipeline_status, sql_query, investigation, pipeline_create, "
        "architecture_create, quality_check, or incident_management. Extract entities such as "
        "pipeline_name, table_name, schedule, environment. Respond only with JSON."
    )
    permissions = ["intent.classify"]
    tool_names = []  # pure reasoning agent — no connector tools

    def classify(self, text: str) -> IntentClassification:
        """Deterministic classification with keyword scoring."""
        lower = (text or "").lower()
        scores = {}
        for intent, keywords in INTENT_RULES.items():
            score = sum(2 if kw in lower else 0 for kw in keywords)
            if score:
                scores[intent] = score

        entities = self._extract_entities(text or "")

        if not scores:
            return IntentClassification("general", entities, 0.3)
        best = max(scores, key=scores.get)
        total = sum(scores.values())
        confidence = scores[best] / total if total else 0.3
        return IntentClassification(best, entities, min(0.95, 0.5 + confidence / 4))

    def _extract_entities(self, text: str) -> dict:
        lower = text.lower()
        entities = {}
        for name, pattern in ENTITY_PATTERNS.items():
            m = re.search(pattern, lower)
            if m:
                entities[name] = m.group(1)
        return entities

    async def _execute_fallback(self, task: AgentTask, context: dict) -> AgentResult:
        """Route execute() calls through the classifier."""
        import time
        start = time.monotonic()
        classification = self.classify(task.objective)
        return AgentResult(
            task_id=task.task_id,
            agent_name=self.name,
            agent_type=self.agent_type,
            status=TaskStatus.SUCCESS,
            output={"response": f"Intent: {classification.intent}", **classification.to_dict()},
            confidence=classification.confidence,
            evidence=[f"keyword classification: {classification.intent}"],
            execution_time_ms=(time.monotonic() - start) * 1000,
        )
