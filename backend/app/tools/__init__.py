# Tools package — AIDEN Tool Gateway
# v2 connectors: enhanced with Pydantic validation, retries, timeouts, and audit logging

# V1 (legacy) connectors — kept for backward compatibility
from app.tools.connector_base import ToolConnector, ToolCategory, ToolStatus
from app.tools.airflow_connector import AirflowConnector, airflow_connector
from app.tools.kafka_connector import KafkaConnector, kafka_connector
from app.tools.spark_connector import SparkConnector, spark_connector
from app.tools.dbt_connector import DbtConnector, dbt_connector
from app.tools.s3_connector import S3Connector, s3_connector

# V2 (enhanced) connectors — with retries, validation, audit logging
from app.tools.connector_base_v2 import BaseConnector as BaseConnectorV2
from app.tools.airflow_connector_v2 import AirflowConnectorV2, airflow_connector_v2
from app.tools.kafka_connector_v2 import KafkaConnectorV2, kafka_connector_v2
from app.tools.postgres_connector_v2 import PostgresConnectorV2, postgres_connector_v2
from app.tools.dbt_connector_v2 import DbtConnectorV2, dbt_connector_v2
from app.tools.spark_connector_v2 import SparkConnectorV2, spark_connector_v2

# Tool Gateway — central registry of all connectors (v2 preferred)
TOOL_REGISTRY = {
    "airflow": airflow_connector_v2,
    "kafka": kafka_connector_v2,
    "spark": spark_connector_v2,
    "dbt": dbt_connector_v2,
    "postgresql": postgres_connector_v2,
    "s3": s3_connector,  # S3 uses v1 (no v2 rewrite needed yet)
}

# Legacy registry for backward compatibility
LEGACY_REGISTRY = {
    "airflow": airflow_connector,
    "kafka": kafka_connector,
    "spark": spark_connector,
    "dbt": dbt_connector,
    "s3": s3_connector,
}


def get_connector(name: str):
    """Get a tool connector by name. Prefers v2 connectors."""
    return TOOL_REGISTRY.get(name)


def get_legacy_connector(name: str):
    """Get a legacy v1 tool connector by name."""
    return LEGACY_REGISTRY.get(name)


def list_connectors() -> list[dict]:
    """List all registered v2 tool connectors."""
    return [c.to_registry_entry() for c in TOOL_REGISTRY.values()]


def list_all_connectors() -> list[dict]:
    """List all registered connectors (v1 + v2)."""
    return [c.to_registry_entry() for c in set(list(TOOL_REGISTRY.values()) + list(LEGACY_REGISTRY.values()))]
