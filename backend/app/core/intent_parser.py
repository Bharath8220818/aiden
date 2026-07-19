"""
Natural Language → Structured Pipeline Configuration.

Uses a HuggingFace LLM (e.g. Llama 3) to parse free-form user requests into
structured pipeline definitions. Falls back to rule-based keyword matching
when the model is unavailable or the response cannot be parsed.

Architecture:
    User Request
        │
        ▼
    ┌────────────────┐   success   ┌──────────────────┐
    │  HF Pipeline   │ ──────────▶ │  JSON Extraction │
    │  (LLaMA 3)     │             └──────────────────┘
    └────────────────┘                    │
        │ failure                         ▼
        ▼                         Parsed Pipeline Config
    ┌────────────────┐
    │ Rule-based     │
    │ Fallback       │
    └────────────────┘
"""

import json
import logging
from typing import Any, Dict, Optional

from app.config import settings
from app.services.hf_service import hf_service

logger = logging.getLogger(__name__)


SYSTEM_PROMPT = """You are a data engineering assistant. Parse the following user request \
and extract structured information about the data pipeline they want to build.

Extract the following information and respond in JSON format **only**, with no other text:
- name: A short name for the pipeline
- source_type: The type of data source (postgres, snowflake, s3, kafka, etc.)
- source_config: Any source-specific configuration (table name, file path, etc.)
- destination_type: The destination system
- destination_config: Any destination-specific configuration
- transformations: List of transformations needed (clean, aggregate, join, filter, etc.)
- schedule: Frequency (daily, hourly, weekly) in cron format
- data_quality_rules: Any validation rules mentioned

User Request: {query}

JSON:"""


class IntentParser:
    """
    Parse natural language queries into structured pipeline configurations.
    """

    def __init__(self, model_name: Optional[str] = None):
        self.model_name = model_name or settings.INTENT_MODEL
        self._pipeline = None

    # ── Public ──

    async def parse(self, query: str) -> Dict[str, Any]:
        """
        Parse a natural-language user request into a structured pipeline definition.

        Args:
            query: The user's natural language request.

        Returns:
            A dictionary with keys: name, source_type, source_config,
            destination_type, destination_config, transformations, schedule,
            data_quality_rules.
        """
        if not query or not query.strip():
            return self._default_response("Empty query")

        # Try AI-powered parsing first
        parsed = await self._try_ai_parse(query)
        if parsed is not None:
            return parsed

        # Fallback to rule-based parsing
        logger.info("Falling back to rule-based intent parsing")
        return self._rule_based_parse(query)

    # ── AI Parsing ──

    async def _try_ai_parse(self, query: str) -> Optional[Dict[str, Any]]:
        """Attempt to parse using the HuggingFace pipeline."""
        try:
            if not hf_service.is_available():
                logger.debug("HF service not available, skipping AI parse")
                return None

            # Lazy-init the pipeline
            if self._pipeline is None:
                self._pipeline = hf_service.create_pipeline(
                    "text-generation",
                    self.model_name,
                    max_new_tokens=512,
                    temperature=0.1,
                    do_sample=True,
                )

            prompt = SYSTEM_PROMPT.format(query=query)
            result = self._pipeline(prompt)[0]["generated_text"]

            # Extract JSON block from the generated text
            json_start = result.find("{")
            json_end = result.rfind("}") + 1

            if json_start == -1 or json_end <= json_start:
                logger.warning("No JSON found in AI response")
                return None

            json_str = result[json_start:json_end]
            parsed = json.loads(json_str)

            # Ensure required fields exist
            for field in ("name", "source_type", "destination_type"):
                if field not in parsed:
                    parsed[field] = "unknown"

            logger.info("AI intent parsed: %s", parsed.get("name"))
            return parsed

        except Exception as exc:
            logger.warning("AI intent parsing failed: %s", exc)
            return None

    # ── Rule-based Fallback ──

    def _rule_based_parse(self, query: str) -> Dict[str, Any]:
        """Keyword-based parser used when the HF model is unavailable."""
        q = query.lower()

        return {
            "name": self._extract_name(query),
            "source_type": self._detect_source(q),
            "source_config": {},
            "destination_type": self._detect_destination(q),
            "destination_config": {},
            "transformations": self._detect_transforms(q),
            "schedule": self._detect_schedule(q),
            "data_quality_rules": self._detect_rules(q),
        }

    @staticmethod
    def _extract_name(query: str) -> str:
        words = query.split()
        if len(words) > 3:
            return " ".join(words[:4]).title().replace("  ", " ").strip()
        return "Data Pipeline"

    @staticmethod
    def _detect_source(q: str) -> str:
        sources = [
            ("postgres", ("postgresql", "postgres", "postgre")),
            ("snowflake", ("snowflake",)),
            ("mysql", ("mysql", "my sql")),
            ("s3", ("s3", "amazon s3")),
            ("kafka", ("kafka", "kinesis")),
            ("mongodb", ("mongodb", "mongo")),
            ("bigquery", ("bigquery", "big query")),
            ("csv", ("csv", "flat file")),
        ]
        for name, keywords in sources:
            if any(kw in q for kw in keywords):
                return name
        return "postgres"

    @staticmethod
    def _detect_destination(q: str) -> str:
        # Longer / more-specific keywords first to avoid partial-match
        # priority issues (e.g. "s3" matching before "redshift")
        destinations = [
            ("redshift", ("redshift",)),
            ("snowflake", ("snowflake",)),
            ("bigquery", ("bigquery", "big query")),
            ("elasticsearch", ("elasticsearch", "elastic")),
            ("postgres", ("postgresql", "postgres", "postgre")),
            ("mongodb", ("mongodb", "mongo")),
            ("s3", ("s3", "amazon s3")),
        ]
        for name, keywords in destinations:
            if any(kw in q for kw in keywords):
                return name
        return "snowflake"

    @staticmethod
    def _detect_transforms(q: str) -> list:
        transforms = []
        if "clean" in q:
            transforms.append("clean")
        if "aggregate" in q or "aggregat" in q:
            transforms.append("aggregate")
        if "join" in q:
            transforms.append("join")
        if "filter" in q:
            transforms.append("filter")
        if "deduplicat" in q or "unique" in q:
            transforms.append("deduplicate")
        if "enrich" in q:
            transforms.append("enrich")
        return transforms or ["clean", "aggregate"]

    @staticmethod
    def _detect_schedule(q: str) -> str:
        if "hourly" in q or "hour" in q:
            return "0 * * * *"
        if "daily" in q or "day" in q:
            return "0 6 * * *"
        if "weekly" in q or "week" in q:
            return "0 6 * * 0"
        if "monthly" in q or "month" in q:
            return "0 6 1 * *"
        return "0 6 * * *"

    @staticmethod
    def _detect_rules(q: str) -> list:
        rules = []
        if "null" in q or "missing" in q:
            rules.append("no_nulls")
        if "duplicat" in q or "unique" in q:
            rules.append("no_duplicates")
        if "range" in q or "valid" in q:
            rules.append("validate_ranges")
        if "email" in q:
            rules.append("email_format")
        return rules

    # ── Helpers ──

    @staticmethod
    def _default_response(reason: str) -> Dict[str, Any]:
        return {
            "name": "Untitled Pipeline",
            "source_type": "postgres",
            "source_config": {},
            "destination_type": "snowflake",
            "destination_config": {},
            "transformations": ["clean"],
            "schedule": "0 6 * * *",
            "data_quality_rules": [],
        }
