"""
Documentation Agent — Auto-generates pipeline metadata and documentation.

Creates Markdown documentation, data catalogs, and lineage metadata
for pipelines, schemas, and data flows.
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime

from app.agents.base_agent import BaseAIDENAgent

logger = logging.getLogger(__name__)


class DocumentationAgent(BaseAIDENAgent):
    """Generate documentation for pipelines and data assets."""

    def __init__(self):
        super().__init__(
            name="documentation_agent",
            tools=[],
            system_prompt="You are a documentation agent creating data pipeline docs.",
        )

    async def run(self, pipeline_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate documentation for a pipeline."""
        name = pipeline_data.get("name", "Unnamed Pipeline")
        source = pipeline_data.get("source_type", "unknown")
        destination = pipeline_data.get("destination_type", "unknown")
        transforms = pipeline_data.get("transformations", [])
        schedule = pipeline_data.get("schedule", "Not scheduled")

        doc_md = f"""# {name}

## Overview
- **Source:** {source}
- **Destination:** {destination}
- **Schedule:** {schedule}
- **Generated:** {datetime.utcnow().isoformat()}

## Transformations
{chr(10).join(f'- {t}' for t in transforms) if transforms else 'No transformations defined'}

## Data Quality Rules
{chr(10).join(f'- {r}' for r in pipeline_data.get('data_quality_rules', [])) if pipeline_data.get('data_quality_rules') else 'No quality rules defined'}
"""

        return {
            "pipeline_name": name,
            "documentation": doc_md,
            "generated_at": datetime.utcnow().isoformat(),
            "format": "markdown",
        }
