"""
Pipeline Builder Agent — generates Airflow DAGs, dbt models, and tests.
Implements smolagents.Tool so the orchestrator calls .forward().
"""

import logging
from typing import Dict, Any

from smolagents import Tool

logger = logging.getLogger(__name__)


class PipelineBuilderAgent(Tool):
    name = "pipeline_builder"
    description = "Generates Airflow DAG code, dbt models, and quality tests from intent + schema + quality report."
    inputs = {
        "intent": {
            "type": "object",
            "description": "Parsed intent dict (source_type, destination_type, transformations, schedule, etc.)"
        },
        "schema": {
            "type": "object",
            "description": "Schema dict from the ExtractionAgent"
        },
        "quality_report": {
            "type": "object",
            "description": "Quality report dict from the AnalysisAgent"
        }
    }
    output_type = "object"

    def forward(self, intent: Dict[str, Any], schema: Dict[str, Any], quality_report: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate pipeline code from intent + schema + quality analysis.

        Args:
            intent: Parsed intent from ``IntentParser.parse()``
            schema: Schema from ``ExtractionAgent.forward()``
            quality_report: Quality report from ``AnalysisAgent.forward()``

        Returns:
            ``{"dag_code": "...", "dbt_code": "...", "tests": [...], "summary": "..."}``
        """
        logger.info("PipelineBuilderAgent.forward — %s", intent.get("name", "unnamed"))

        source = intent.get("source_type", "postgres")
        dest = intent.get("destination_type", "snowflake")
        transforms = intent.get("transformations", [])
        schedule = intent.get("schedule", "0 6 * * *")

        dag_code = self._build_dag(
            intent.get("name", "pipeline"), source, dest, schedule, transforms
        )
        dbt_code = self._build_dbt(source, transforms)
        tests = quality_report.get("suggestions", [])

        return {
            "dag_code": dag_code,
            "dbt_code": dbt_code,
            "tests": tests,
            "summary": f"Generated DAG ({len(dag_code)} bytes) + dbt model + {len(tests)} quality tests",
        }

    def _build_dag(self, name, source, dest, schedule, transforms) -> str:
        transforms_str = ", ".join(transforms) if transforms else "None"
        return f'''
from airflow import DAG
from datetime import datetime, timedelta
from airflow.operators.python import PythonOperator

default_args = {{
    "owner": "AIDEN",
    "retries": 3,
    "retry_delay": timedelta(minutes=5),
}}

with DAG(
    "{name}",
    schedule_interval="{schedule}",
    default_args=default_args,
    catchup=False,
) as dag:

    def extract(**kwargs):
        return {{"status": "extracted", "source": "{source}"}}

    def transform(**kwargs):
        return {{"status": "transformed", "steps": "{transforms_str}"}}

    def load(**kwargs):
        return {{"status": "loaded", "destination": "{dest}"}}

    extract_task = PythonOperator(task_id="extract", python_callable=extract)
    transform_task = PythonOperator(task_id="transform", python_callable=transform)
    load_task = PythonOperator(task_id="load", python_callable=load)

    extract_task >> transform_task >> load_task
'''

    def _build_dbt(self, source, transforms) -> str:
        transforms_str = ",\n    ".join(transforms) if transforms else "*"
        return f'''-- dbt model
-- Source: {source}

SELECT
    {transforms_str}
FROM {{{{ source("{source}", "raw") }}}}
'''
