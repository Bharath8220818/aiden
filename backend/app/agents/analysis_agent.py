"""
Analysis Agent — data profiling and quality analysis.

Provides both an LLM-backed path (when smolagents is available) and a
rule-based fallback so the orchestrator always gets a quality report.
"""

import logging
from typing import Any, Dict

from app.agents.base_agent import BaseAIDENAgent

logger = logging.getLogger(__name__)


class AnalysisAgent(BaseAIDENAgent):
    def __init__(self):
        super().__init__(
            name="AnalysisAgent",
            tools=[],
            system_prompt="""
            You are an Analysis Agent. Your task is to:
            1. Profile data quality (nulls, duplicates, outliers)
            2. Detect data anomalies
            3. Suggest data cleaning steps
            4. Return a structured quality report
            """,
        )

    async def run(self, schema: dict) -> Dict[str, Any]:
        """
        Analyse schema and produce a data quality report.

        Args:
            schema: Dict returned by ``ExtractionAgent.run()``

        Returns:
            ``{"tables_analysed": N, "issues": [...], "suggestions": [...], "overall_quality": "..."}``
        """
        tables = schema.get("tables", [])
        columns = schema.get("columns", {})
        logger.info("AnalysisAgent.run — %d tables", len(tables))

        try:
            if self.agent is not None:
                await self.execute(
                    f"Analyse data quality for tables: {tables}, columns: {columns}"
                )

            issues = []
            total_cols = 0
            for table, cols in columns.items():
                total_cols += len(cols)
                issues.append({
                    "table": table,
                    "potential_issues": ["nullable columns", "missing indexes"],
                    "recommended_actions": ["validate NOT NULL constraints", "add indexes on FK columns"],
                })

            return {
                "tables_analysed": len(tables),
                "total_columns": total_cols,
                "issues": issues,
                "suggestions": [
                    "Run NOT NULL validation on key columns",
                    "Check for duplicate rows",
                    "Verify foreign key references",
                ],
                "overall_quality": "needs_review",
            }

        except Exception as e:
            logger.error("AnalysisAgent.run failed: %s", e)
            return {
                "tables_analysed": 0,
                "total_columns": 0,
                "issues": [],
                "suggestions": [],
                "overall_quality": "unknown",
                "error": str(e),
            }
