import json
import logging

logger = logging.getLogger(__name__)

try:
    from smolagents import Tool
    TOOL_BASE = Tool
except ImportError:
    logger.warning("smolagents not installed — CodeGeneratorTool will run in standalone mode")
    TOOL_BASE = object


class CodeGeneratorTool(TOOL_BASE):
    """Tool for generating pipeline code — Airflow DAG, dbt models, tests."""

    name = "code_generator"
    description = "Generates pipeline code (Airflow DAG, dbt models, tests)"
    inputs = {
        "spec": {
            "type": "string",
            "description": "Pipeline specification in JSON format",
        },
        "type": {
            "type": "string",
            "description": "Code type: 'dag', 'dbt', or 'test'",
        },
    }
    output_type = "string"

    def forward(self, spec: str, type: str = "dag") -> str:
        try:
            config = json.loads(spec) if isinstance(spec, str) else spec
            pipeline_name = config.get("name", "pipeline")

            if type == "dag":
                return f"""
from airflow import DAG
from datetime import datetime, timedelta
from airflow.operators.dummy import DummyOperator

default_args = {{
    'owner': 'AIDEN',
    'retries': 3,
    'retry_delay': timedelta(minutes=5),
}}

dag = DAG(
    '{pipeline_name}',
    schedule_interval='{config.get("schedule", "0 6 * * *")}',
    default_args=default_args,
    catchup=False,
)

start = DummyOperator(task_id='start', dag=dag)
end = DummyOperator(task_id='end', dag=dag)
start >> end
"""
            elif type == "dbt":
                return f"""
-- dbt model: {pipeline_name}
SELECT * FROM {{{{ source('{config.get("source_type", "unknown")}', '{pipeline_name}') }}}}
"""
            elif type == "test":
                return f"""
# Data quality tests for {pipeline_name}
version: 2
models:
  - name: {pipeline_name}
    tests:
      - not_null
      - unique
"""
            return f"Generated {type} code for {pipeline_name}"
        except Exception as e:
            return f"Code generation error: {str(e)}"
