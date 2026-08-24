# Tools package — AIDEN Tool Gateway
from app.tools.connector_base import ToolConnector, ToolCategory, ToolStatus
from app.tools.airflow_connector import AirflowConnector, airflow_connector
from app.tools.kafka_connector import KafkaConnector, kafka_connector
from app.tools.spark_connector import SparkConnector, spark_connector
from app.tools.dbt_connector import DbtConnector, dbt_connector
from app.tools.s3_connector import S3Connector, s3_connector

# Tool Gateway — central registry of all connectors
TOOL_REGISTRY = {
    "airflow": airflow_connector,
    "kafka": kafka_connector,
    "spark": spark_connector,
    "dbt": dbt_connector,
    "s3": s3_connector,
}


def get_connector(name: str) -> ToolConnector | None:
    """Get a tool connector by name."""
    return TOOL_REGISTRY.get(name)


def list_connectors() -> list[dict]:
    """List all registered tool connectors."""
    return [c.to_registry_entry() for c in TOOL_REGISTRY.values()]
