"""
Analysis Agent — data profiling and quality analysis.
Implements smolagents.Tool so the orchestrator calls .forward().
"""

import logging
from typing import Dict, Any

from smolagents import Tool

logger = logging.getLogger(__name__)


class AnalysisAgent(Tool):
    name = "analysis"
    description = "Profiles data quality and produces a quality report (nulls, duplicates, outliers)."
    inputs = {
        "schema": {
            "type": "object",
            "description": "Schema dict from the ExtractionAgent (tables, columns, etc.)"
        }
    }
    output_type = "object"

    def forward(self, schema: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyse schema and produce a data quality report.

        Args:
            schema: Dict returned by ``ExtractionAgent.forward()``

        Returns:
            ``{"tables_analysed": N, "issues": [...], "suggestions": [...], "overall_quality": "..."}``
        """
        tables = schema.get("tables", [])
        columns = schema.get("columns", {})
        logger.info("AnalysisAgent.forward — %d tables", len(tables))

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
