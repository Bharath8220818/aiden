import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.pipeline import Pipeline, PipelineStatus

logger = logging.getLogger(__name__)


class PipelineBuilder:
    """Build pipeline objects and generate code from parsed intents."""

    async def create_pipeline(
        self,
        name: str,
        source: str,
        destination: str,
        schedule: str,
        code: Dict[str, str],
        user_id: int,
        db: AsyncSession,
    ) -> Pipeline:
        """Create a Pipeline record in the database."""
        pipeline = Pipeline(
            name=name,
            source_type=source,
            destination_type=destination,
            schedule=schedule,
            config=code.get("config", {}),
            code=code.get("dag", ""),
            dbt_code=code.get("dbt", ""),
            tests=code.get("tests", []),
            user_id=user_id,
            status=PipelineStatus.DRAFT,
        )
        db.add(pipeline)
        await db.commit()
        await db.refresh(pipeline)
        return pipeline

    def generate_dag(self, config: Dict[str, Any]) -> str:
        """Generate an Airflow DAG from a pipeline config."""
        name = config.get("name", "pipeline").replace(" ", "_").lower()
        source = config.get("source_type", "postgres")
        destination = config.get("destination_type", "snowflake")
        schedule = config.get("schedule", "0 6 * * *")
        transforms = config.get("transformations", [])
        quality_rules = config.get("data_quality_rules", [])

        transform_tasks = "\n        ".join([
            f"""    def transform_{t}():
        # TODO: Implement {t} transformation
        return {{"status": "{t}_done"}}
    
    {t}_task = PythonOperator(task_id='{t}', python_callable=transform_{t})"""
            for t in transforms
        ]) if transforms else """    def transform():
        # TODO: Implement transformations
        return {"status": "transformed"}
    
    transform_task = PythonOperator(task_id='transform', python_callable=transform)"""

        quality_checks = "\n    ".join([
            f"""    def check_{r}():
        # TODO: Implement {r} quality check
        return True
    
    {r}_check = PythonOperator(task_id='check_{r}', python_callable=check_{r})"""
            for r in quality_rules
        ]) if quality_rules else ""

        dag = f'''"""
Auto-generated Airflow DAG: {name}
Source: {source}
Destination: {destination}
Schedule: {schedule}
Generated: {datetime.utcnow().isoformat()}
"""

from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.dummy import DummyOperator
from datetime import datetime, timedelta

default_args = {{
    "owner": "aiden",
    "depends_on_past": False,
    "email_on_failure": True,
    "email_on_retry": False,
    "retries": 1,
    "retry_delay": timedelta(minutes=5),
}}

with DAG(
    "{name}",
    default_args=default_args,
    description="Pipeline from {source} to {destination}",
    schedule_interval="{schedule}",
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=["aiden", "{source}", "{destination}"],
) as dag:

    start = DummyOperator(task_id="start")
    end = DummyOperator(task_id="end")

    def extract():
        """Extract data from {source}."""
        # TODO: Implement extraction logic
        return {{"status": "extracted", "records": 0}}

    def load():
        """Load data into {destination}."""
        # TODO: Implement load logic
        return {{"status": "loaded", "records": 0}}

    extract_task = PythonOperator(task_id="extract", python_callable=extract)
    load_task = PythonOperator(task_id="load", python_callable=load)

    {quality_checks}
    
    start >> extract_task
{chr(10).join([f"    extract_task >> {t}_task" for t in (transforms if transforms else ["transform"])])}
{chr(10).join([f"    {t}_task >> load_task" for t in (transforms if transforms else ["transform"])])}
    load_task >> end
'''
        return dag

    def generate_dbt(self, config: Dict[str, Any]) -> str:
        """Generate a dbt model from a pipeline config."""
        model_name = config.get("name", "model").replace(" ", "_").lower()
        source_table = config.get("source_config", {}).get("table", "source")
        destination_table = config.get("destination_config", {}).get("table", "target")
        transforms = config.get("transformations", [])

        transforms_sql = ",\n        ".join(
            [f"    -- TODO: implement {t}" for t in transforms]
        )

        return f'''{{{{ config(materialized='table') }}}}

/*
    dbt model: {model_name}
    Source: {source_table}
    Destination: {destination_table}
*/

SELECT
    *
    {", " + transforms_sql if transforms_sql else ""}
FROM {{{{ source('raw', '{source_table}') }}}}
{% if is_incremental() %}
    WHERE _loaded_at > (SELECT MAX(_loaded_at) FROM {{{{ this }}}})
{% endif %}
'''

    def generate_tests(self, config: Dict[str, Any]) -> list:
        """Generate data quality test configurations."""
        rules = config.get("data_quality_rules", [])
        tests = []
        for rule in rules:
            if "null" in rule.lower():
                tests.append({
                    "type": "not_null",
                    "column": "id",
                    "severity": "error",
                })
            elif "unique" in rule.lower():
                tests.append({
                    "type": "unique",
                    "columns": ["id"],
                    "severity": "warn",
                })
            elif "range" in rule.lower():
                tests.append({
                    "type": "accepted_range",
                    "column": "value",
                    "min_value": 0,
                    "max_value": 1000000,
                    "severity": "warn",
                })
        return tests

    def generate_all(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Generate all code artifacts (DAG + dbt + tests)."""
        return {
            "dag": self.generate_dag(config),
            "dbt": self.generate_dbt(config),
            "tests": self.generate_tests(config),
            "config": config,
        }
