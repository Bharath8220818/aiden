"""
Pipeline Builder Agent — generates Airflow DAGs, dbt models, and tests.
"""

import json
import logging
from typing import Any, Dict

from app.agents.base_agent import BaseAIDENAgent
from app.tools.code_generator_tools import CodeGeneratorTool

logger = logging.getLogger(__name__)


class PipelineBuilderAgent(BaseAIDENAgent):
    def __init__(self):
        super().__init__(
            name="PipelineBuilderAgent",
            tools=[CodeGeneratorTool()],
            system_prompt="""
            You are a Pipeline Builder Agent. Your task is to:
            1. Generate Airflow DAG code using CodeGeneratorTool
            2. Generate dbt transformation models
            3. Generate data quality tests
            4. Return complete, executable code
            """,
        )

    async def run(self, intent: dict, schema: dict, quality_report: dict) -> Dict[str, Any]:
        """
        Generate pipeline code from intent + schema + quality analysis.

        Args:
            intent: Parsed intent from ``IntentParser.parse()``
            schema: Schema from ``ExtractionAgent.run()``
            quality_report: Quality report from ``AnalysisAgent.run()``

        Returns:
            ``{"dag_code": "...", "dbt_code": "...", "tests": [...], "summary": "..."}``
        """
        logger.info("PipelineBuilderAgent.run — %s", intent.get("name", "unnamed"))

        try:
            spec_json = json.dumps(intent, indent=2)

            if self.agent is not None:
                await self.execute(
                    f"Generate pipeline code for: {spec_json[:300]}"
                )

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

        except Exception as e:
            logger.error("PipelineBuilderAgent.run failed: %s", e)
            return {
                "dag_code": "",
                "dbt_code": "",
                "tests": [],
                "summary": f"Code generation failed: {e}",
                "error": str(e),
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
