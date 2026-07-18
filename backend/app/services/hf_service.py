import logging
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


class HuggingFaceService:
    def __init__(self):
        self._available = False

    def is_available(self) -> bool:
        return self._available

    def generate_intent(self, query: str) -> Optional[Dict[str, Any]]:
        self._available = False
        return {
            "name": "Generated Pipeline",
            "source_type": "postgres",
            "source_config": {},
            "destination_type": "snowflake",
            "destination_config": {},
            "transformations": ["clean", "aggregate"],
            "schedule": "0 6 * * *",
            "data_quality_rules": [],
        }


hf_service = HuggingFaceService()
