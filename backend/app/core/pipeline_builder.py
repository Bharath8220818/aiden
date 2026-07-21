from jinja2 import Environment, FileSystemLoader
import os
import logging

logger = logging.getLogger(__name__)


class PipelineBuilder:
    """Generate pipeline code (Airflow DAG, dbt models, tests) from parsed intent."""

    def __init__(self):
        template_dir = os.path.join(os.path.dirname(__file__), "../templates")
        self.env = Environment(loader=FileSystemLoader(template_dir))

    async def build(self, parsed_intent: dict) -> dict:
        """Generate pipeline code from parsed intent."""
        try:
            dag_code = self._generate_airflow_dag(parsed_intent)
            dbt_code = None
            if parsed_intent.get("transformations"):
                dbt_code = self._generate_dbt_model(parsed_intent)
            tests = self._generate_tests(parsed_intent)

            return {
                "dag_code": dag_code,
                "dbt_code": dbt_code,
                "tests": tests,
                "config": parsed_intent,
            }
        except Exception as e:
            logger.error(f"Pipeline building failed: {e}")
            raise

    def _generate_airflow_dag(self, intent: dict) -> str:
        template = self.env.get_template("airflow_dag.j2")
        return template.render(
            pipeline_name=intent.get("name", "pipeline"),
            source_type=intent.get("source_type", "unknown"),
            destination_type=intent.get("destination_type", "unknown"),
            schedule=intent.get("schedule", "0 6 * * *"),
            transformations=intent.get("transformations", []),
        )

    def _generate_dbt_model(self, intent: dict) -> str:
        template = self.env.get_template("dbt_model.j2")
        return template.render(
            table_name=intent.get("source_config", {}).get("table", "source_table"),
            transformations=intent.get("transformations", []),
        )

    def _generate_tests(self, intent: dict) -> list:
        tests = []
        for rule in intent.get("data_quality_rules", []):
            tests.append({
                "name": f"test_{rule.replace(' ', '_')}",
                "type": "generic",
                "description": rule,
            })
        return tests
