"""
Intent Parser – Natural Language → Structured Pipeline Configuration
Uses HuggingFace LLM with RAG memory and graceful fallback to rule‑based parsing.
"""

import json
import logging
from typing import Dict, Any, Optional

from app.services.hf_service import hf_service
from app.core.rag_memory import rag_memory  # RAG memory for context
from app.config import settings

logger = logging.getLogger(__name__)


class IntentParser:
    """
    Natural Language → Structured Pipeline Configuration.
    Uses HuggingFace LLM with RAG context and graceful fallback to rule‑based parsing.
    """

    def __init__(self, model_name: Optional[str] = None):
        self.model_name = model_name or settings.INTENT_MODEL
        self._use_llm = hf_service.is_available()          # <-- ADDED
        self._pipeline = None
        self._rag_enabled = True  # Can be toggled

        self.base_system_prompt = """
        You are a data engineering assistant. Parse the following user request
        and extract structured information about the data pipeline they want to build.

        Extract the following information and respond in JSON format:
        - name: A short name for the pipeline
        - source_type: The type of data source (postgres, snowflake, s3, kafka, etc.)
        - source_config: Any source-specific configuration (e.g., table name)
        - destination_type: The destination system (snowflake, postgres, bigquery, etc.)
        - destination_config: Any destination-specific configuration (e.g., schema name)
        - transformations: List of transformations needed (clean, aggregate, join, etc.)
        - schedule: Frequency in cron format (e.g., "0 6 * * *" for daily at 6am)
        - data_quality_rules: Any validation rules mentioned

        Respond with JSON only, no other text.
        """

        logger.info(f"IntentParser initialized with LLM: {self._use_llm}")

    async def parse(self, query: str, user_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Parse natural language query into structured pipeline definition.

        Args:
            query: User's natural language request
            user_id: Optional user ID for RAG scoping

        Returns:
            Structured pipeline configuration
        """
        # Try AI parsing (with RAG context) if available
        if self._use_llm and self._rag_enabled:
            try:
                result = await self._try_ai_parse(query, user_id)
                if result and self._validate(result):
                    # Store the successful parse in RAG memory
                    if user_id:
                        rag_memory.store_pipeline(query, result, user_id)
                    logger.info(f"LLM parsed successfully: {result.get('name')}")
                    return result
            except Exception as e:
                logger.warning(f"LLM parsing failed: {e}, falling back to rule-based")

        # Fallback to rule-based
        logger.info("Using rule-based fallback parser")
        return self._rule_based_parse(query)

    async def _try_ai_parse(self, query: str, user_id: Optional[int]) -> Optional[Dict[str, Any]]:
        """Attempt to parse using HuggingFace LLM with RAG context."""
        prompt = self._build_prompt(query, user_id)
        response = hf_service.generate(
            prompt,
            model_name=self.model_name,
            max_new_tokens=512,
            temperature=0.1,
        )
        if response is None:
            return None

        # Extract JSON from response
        json_start = response.find('{')
        json_end = response.rfind('}') + 1
        if json_start == -1 or json_end == 0:
            return None

        json_str = response[json_start:json_end]
        try:
            return json.loads(json_str)
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error: {e}")
            return None

    def _build_prompt(self, query: str, user_id: Optional[int]) -> str:
        """Build the prompt with optional RAG context."""
        rag_context = ""
        if self._rag_enabled and user_id:
            similar = rag_memory.search_similar(query, user_id, top_k=settings.RAG_TOP_K)
            if similar:
                rag_context = rag_memory.format_context(similar)

        if rag_context:
            full_prompt = (
                f"{rag_context}\n\n"
                f"{self.base_system_prompt}\n\n"
                f"User Request: {query}"
            )
        else:
            full_prompt = f"{self.base_system_prompt}\n\nUser Request: {query}"

        return full_prompt

    def _validate(self, parsed: Dict[str, Any]) -> bool:
        """Validate parsed output has required fields."""
        required = ["name", "source_type", "destination_type"]
        for field in required:
            if field not in parsed or not parsed[field]:
                return False
        return True

    def _rule_based_parse(self, query: str) -> Dict[str, Any]:
        """Rule‑based fallback parser when AI is unavailable."""
        query_lower = query.lower()

        # Detect source type
        source_type = "unknown"
        source_config = {}
        source_map = {
            "postgres": ["postgres", "postgre", "pg"],
            "snowflake": ["snowflake", "snow"],
            "mysql": ["mysql"],
            "bigquery": ["bigquery", "big query"],
            "redshift": ["redshift"],
            "s3": ["s3", "s3 bucket"],
            "kafka": ["kafka"],
            "mongodb": ["mongo", "mongodb"],
        }
        for src, keywords in source_map.items():
            if any(kw in query_lower for kw in keywords):
                source_type = src
                break

        # Detect destination type
        dest_type = "unknown"
        dest_config = {}
        dest_map = {
            "snowflake": ["snowflake", "snow"],
            "bigquery": ["bigquery", "big query"],
            "postgres": ["postgres", "postgre", "pg"],
            "redshift": ["redshift"],
            "s3": ["s3", "s3 bucket"],
            "mongodb": ["mongo", "mongodb"],
        }
        for dest, keywords in dest_map.items():
            if any(kw in query_lower for kw in keywords):
                dest_type = dest
                break

        # Schedule
        schedule = "0 6 * * *"  # default daily at 6am
        if "hourly" in query_lower:
            schedule = "0 * * * *"
        elif "weekly" in query_lower:
            schedule = "0 0 * * 0"  # Sunday at midnight

        # Transformations
        transforms = []
        transform_map = {
            "clean": ["clean", "cleaning", "remove null", "handle null"],
            "aggregate": ["aggregate", "summarize", "group by"],
            "join": ["join", "merge", "combine"],
            "filter": ["filter", "where", "condition"],
            "enrich": ["enrich", "enhance", "add column"],
            "validate": ["validate", "check", "quality"],
        }
        for trans, keywords in transform_map.items():
            if any(kw in query_lower for kw in keywords):
                transforms.append(trans)

        # Quality rules
        rules = []
        if "null" in query_lower:
            rules.append("no_null_values")
        if "duplicate" in query_lower:
            rules.append("no_duplicates")
        if "positive" in query_lower:
            rules.append("positive_values")
        if "format" in query_lower or "valid" in query_lower:
            rules.append("valid_format")

        # Extract table name if mentioned
        if "table" in query_lower:
            parts = query_lower.split("table")
            if len(parts) > 1:
                table_part = parts[1].strip().split()[0].strip("'\"")
                if table_part:
                    source_config["table"] = table_part

        return {
            "name": f"{source_type}_to_{dest_type}_pipeline",
            "source_type": source_type,
            "source_config": source_config,
            "destination_type": dest_type,
            "destination_config": dest_config,
            "transformations": transforms,
            "schedule": schedule,
            "data_quality_rules": rules,
        }