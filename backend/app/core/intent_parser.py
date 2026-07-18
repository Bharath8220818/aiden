import json
from typing import Dict, Any

from app.services.hf_service import hf_service


class IntentParser:
    """Parse natural language queries into pipeline configurations."""

    def __init__(self):
        self.sources = [
            "postgres",
            "mysql",
            "snowflake",
            "bigquery",
            "s3",
            "kafka",
            "csv",
            "json",
            "parquet",
            "mongodb",
            "elasticsearch",
        ]
        self.destinations = [
            "postgres",
            "mysql",
            "snowflake",
            "bigquery",
            "s3",
            "kafka",
            "elasticsearch",
            "mongodb",
            "redshift",
            "graphite",
        ]
        self.transformations = [
            "clean",
            "aggregate",
            "join",
            "filter",
            "split",
            "deduplicate",
            "enrich",
            "pivot",
            "unpivot",
            "normalize",
        ]

    async def parse(self, query: str) -> Dict[str, Any]:
        query_lower = query.lower()

        if hf_service.is_available():
            try:
                parsed = hf_service.generate_intent(query)
                if isinstance(parsed, dict):
                    return {
                        "name": parsed.get("name", self._extract_name(query)),
                        "source_type": parsed.get("source_type") or self._find_type(query_lower, self.sources, "source") or "postgres",
                        "source_config": parsed.get("source_config", {}),
                        "destination_type": parsed.get("destination_type") or self._find_type(query_lower, self.destinations, "destination") or "snowflake",
                        "destination_config": parsed.get("destination_config", {}),
                        "transformations": parsed.get("transformations") or self._find_transformations(query_lower),
                        "schedule": parsed.get("schedule") or self._extract_schedule(query_lower),
                        "data_quality_rules": parsed.get("data_quality_rules") or self._extract_rules(query_lower),
                    }
            except Exception:
                pass

        return {
            "name": self._extract_name(query),
            "source_type": self._find_type(query_lower, self.sources, "source") or "postgres",
            "source_config": {},
            "destination_type": self._find_type(query_lower, self.destinations, "destination") or "snowflake",
            "destination_config": {},
            "transformations": self._find_transformations(query_lower),
            "schedule": self._extract_schedule(query_lower),
            "data_quality_rules": self._extract_rules(query_lower),
        }

    def _extract_name(self, query: str) -> str:
        words = query.split()
        if len(words) > 3:
            return " ".join(words[: min(4, len(words))]).title()
        return "Data Pipeline"

    def _find_type(self, query: str, types: list, type_name: str) -> str:
        for t in types:
            if t in query:
                return t
        return None

    def _find_transformations(self, query: str) -> list:
        found = []
        for transform in self.transformations:
            if transform in query:
                found.append(transform)
        return found or ["clean", "aggregate"]

    def _extract_schedule(self, query: str) -> str:
        if "daily" in query or "day" in query:
            return "0 6 * * *"
        if "hourly" in query or "hour" in query:
            return "0 * * * *"
        if "weekly" in query or "week" in query:
            return "0 6 * * 0"
        if "monthly" in query or "month" in query:
            return "0 6 1 * *"
        return "0 6 * * *"

    def _extract_rules(self, query: str) -> list:
        rules = []
        if "null" in query or "missing" in query:
            rules.append("no_null_primary_key")
        if "duplicate" in query or "unique" in query:
            rules.append("check_uniqueness")
        if "range" in query or "valid" in query:
            rules.append("validate_ranges")
        return rules or []
