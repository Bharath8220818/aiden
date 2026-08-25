"""
Agent Tool Functions — Wraps v2 connectors as callable functions for AI agents.

Each function is a thin wrapper around the connector that:
1. Accepts simple parameters
2. Returns structured dict output
3. Can be used as @function_tools or called directly in fallback mode

These tools are bound to specialist agents via the tool registry.
"""

import logging
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)


# ── Database Tools (for SQL Agent) ───────────────────────────────────

async def pg_list_tables(database: str = "") -> Dict[str, Any]:
    """List all tables in the PostgreSQL database."""
    from app.tools import TOOL_REGISTRY
    connector = TOOL_REGISTRY.get("postgresql")
    if not connector:
        return {"error": "PostgreSQL connector not available"}
    result = await connector.list_resources("tables")
    return result.model_dump() if hasattr(result, "model_dump") else result


async def pg_describe_table(table_name: str) -> Dict[str, Any]:
    """Get column details for a specific table."""
    from app.tools import TOOL_REGISTRY
    connector = TOOL_REGISTRY.get("postgresql")
    if not connector:
        return {"error": "PostgreSQL connector not available"}
    result = await connector.get_resource("table", table_name)
    return result.model_dump() if hasattr(result, "model_dump") else result


async def pg_execute_sql(sql: str, read_only: bool = True, limit: int = 1000) -> Dict[str, Any]:
    """Execute a SQL query against PostgreSQL. Set read_only=True for SELECT queries."""
    from app.tools import TOOL_REGISTRY
    connector = TOOL_REGISTRY.get("postgresql")
    if not connector:
        return {"error": "PostgreSQL connector not available"}
    result = await connector.execute(
        "execute_readonly_sql" if read_only else "execute_sql",
        {"sql": sql, "read_only": read_only, "limit": limit},
    )
    return result.model_dump() if hasattr(result, "model_dump") else result


async def pg_get_health() -> Dict[str, Any]:
    """Check PostgreSQL database health and connection status."""
    from app.tools import TOOL_REGISTRY
    connector = TOOL_REGISTRY.get("postgresql")
    if not connector:
        return {"error": "PostgreSQL connector not available"}
    health = await connector.health()
    return health.model_dump() if hasattr(health, "model_dump") else health


# ── Airflow Tools (for Pipeline Agent) ───────────────────────────────

async def airflow_list_dags() -> Dict[str, Any]:
    """List all Airflow DAGs with their status."""
    from app.tools import TOOL_REGISTRY
    connector = TOOL_REGISTRY.get("airflow")
    if not connector:
        return {"error": "Airflow connector not available"}
    result = await connector.list_resources("dags")
    return result.model_dump() if hasattr(result, "model_dump") else result


async def airflow_get_dag_status(dag_id: str) -> Dict[str, Any]:
    """Get the status and details of a specific Airflow DAG."""
    from app.tools import TOOL_REGISTRY
    connector = TOOL_REGISTRY.get("airflow")
    if not connector:
        return {"error": "Airflow connector not available"}
    result = await connector.get_resource("dag", dag_id)
    return result.model_dump() if hasattr(result, "model_dump") else result


async def airflow_trigger_dag(dag_id: str, conf: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Trigger an Airflow DAG run. Use dry_run=True first to validate."""
    from app.tools import TOOL_REGISTRY
    connector = TOOL_REGISTRY.get("airflow")
    if not connector:
        return {"error": "Airflow connector not available"}
    result = await connector.execute("trigger_dag", {"dag_id": dag_id, "conf": conf or {}})
    return result.model_dump() if hasattr(result, "model_dump") else result


async def airflow_get_dag_logs(dag_id: str, limit: int = 50) -> Dict[str, Any]:
    """Get recent task instance logs for a DAG run."""
    from app.tools import TOOL_REGISTRY
    connector = TOOL_REGISTRY.get("airflow")
    if not connector:
        return {"error": "Airflow connector not available"}
    result = await connector.get_logs("dag_run", dag_id, limit)
    return result.model_dump() if hasattr(result, "model_dump") else result


async def airflow_get_health() -> Dict[str, Any]:
    """Check Airflow scheduler health."""
    from app.tools import TOOL_REGISTRY
    connector = TOOL_REGISTRY.get("airflow")
    if not connector:
        return {"error": "Airflow connector not available"}
    health = await connector.health()
    return health.model_dump() if hasattr(health, "model_dump") else health


# ── Kafka Tools (for Monitoring Agent) ───────────────────────────────

async def kafka_list_topics() -> Dict[str, Any]:
    """List all Kafka topics with partition counts."""
    from app.tools import TOOL_REGISTRY
    connector = TOOL_REGISTRY.get("kafka")
    if not connector:
        return {"error": "Kafka connector not available"}
    result = await connector.list_resources("topics")
    return result.model_dump() if hasattr(result, "model_dump") else result


async def kafka_get_topic_info(topic: str) -> Dict[str, Any]:
    """Get detailed info about a Kafka topic including partitions."""
    from app.tools import TOOL_REGISTRY
    connector = TOOL_REGISTRY.get("kafka")
    if not connector:
        return {"error": "Kafka connector not available"}
    result = await connector.get_resource("topic", topic)
    return result.model_dump() if hasattr(result, "model_dump") else result


async def kafka_get_health() -> Dict[str, Any]:
    """Check Kafka cluster health and broker count."""
    from app.tools import TOOL_REGISTRY
    connector = TOOL_REGISTRY.get("kafka")
    if not connector:
        return {"error": "Kafka connector not available"}
    health = await connector.health()
    return health.model_dump() if hasattr(health, "model_dump") else health


# ── dbt Tools (for Pipeline Agent) ───────────────────────────────────

async def dbt_list_models() -> Dict[str, Any]:
    """List all dbt models in the project."""
    from app.tools import TOOL_REGISTRY
    connector = TOOL_REGISTRY.get("dbt")
    if not connector:
        return {"error": "dbt connector not available"}
    result = await connector.list_resources("models")
    return result.model_dump() if hasattr(result, "model_dump") else result


async def dbt_run_model(select: Optional[str] = None, full_refresh: bool = False) -> Dict[str, Any]:
    """Run dbt models. Use select='model_name' for a specific model."""
    from app.tools import TOOL_REGISTRY
    connector = TOOL_REGISTRY.get("dbt")
    if not connector:
        return {"error": "dbt connector not available"}
    params = {"full_refresh": full_refresh}
    if select:
        params["select"] = select
    result = await connector.execute("run", params)
    return result.model_dump() if hasattr(result, "model_dump") else result


async def dbt_test_model(select: Optional[str] = None) -> Dict[str, Any]:
    """Run dbt tests on models."""
    from app.tools import TOOL_REGISTRY
    connector = TOOL_REGISTRY.get("dbt")
    if not connector:
        return {"error": "dbt connector not available"}
    params = {}
    if select:
        params["select"] = select
    result = await connector.execute("test", params)
    return result.model_dump() if hasattr(result, "model_dump") else result


async def dbt_get_health() -> Dict[str, Any]:
    """Check dbt project connectivity."""
    from app.tools import TOOL_REGISTRY
    connector = TOOL_REGISTRY.get("dbt")
    if not connector:
        return {"error": "dbt connector not available"}
    health = await connector.health()
    return health.model_dump() if hasattr(health, "model_dump") else health


# ── Spark Tools (for Pipeline Agent) ─────────────────────────────────

async def spark_list_jobs() -> Dict[str, Any]:
    """List Spark batch jobs via Livy."""
    from app.tools import TOOL_REGISTRY
    connector = TOOL_REGISTRY.get("spark")
    if not connector:
        return {"error": "Spark connector not available"}
    result = await connector.list_resources("jobs")
    return result.model_dump() if hasattr(result, "model_dump") else result


async def spark_get_health() -> Dict[str, Any]:
    """Check Spark cluster health and worker count."""
    from app.tools import TOOL_REGISTRY
    connector = TOOL_REGISTRY.get("spark")
    if not connector:
        return {"error": "Spark connector not available"}
    health = await connector.health()
    return health.model_dump() if hasattr(health, "model_dump") else health


# ── Tool Registries ──────────────────────────────────────────────────

# Maps agent names to their available tool functions
AGENT_TOOL_REGISTRY: Dict[str, List[Dict[str, Any]]] = {
    "sql_agent": [
        {"name": "pg_list_tables", "fn": pg_list_tables, "description": "List all tables in the PostgreSQL database", "category": "database", "read_only": True},
        {"name": "pg_describe_table", "fn": pg_describe_table, "description": "Get column details for a specific table", "category": "database", "read_only": True},
        {"name": "pg_execute_sql", "fn": pg_execute_sql, "description": "Execute a SQL query against PostgreSQL", "category": "database", "read_only": False},
        {"name": "pg_get_health", "fn": pg_get_health, "description": "Check PostgreSQL health", "category": "database", "read_only": True},
    ],
    "pipeline_agent": [
        {"name": "airflow_list_dags", "fn": airflow_list_dags, "description": "List all Airflow DAGs", "category": "orchestration", "read_only": True},
        {"name": "airflow_get_dag_status", "fn": airflow_get_dag_status, "description": "Get DAG status", "category": "orchestration", "read_only": True},
        {"name": "airflow_trigger_dag", "fn": airflow_trigger_dag, "description": "Trigger a DAG run", "category": "orchestration", "read_only": False},
        {"name": "dbt_list_models", "fn": dbt_list_models, "description": "List all dbt models", "category": "transformation", "read_only": True},
        {"name": "dbt_run_model", "fn": dbt_run_model, "description": "Run dbt models", "category": "transformation", "read_only": False},
        {"name": "spark_list_jobs", "fn": spark_list_jobs, "description": "List Spark jobs", "category": "compute", "read_only": True},
    ],
    "architecture_agent": [],  # Architecture agent works with graphs, not tools
    "monitoring_agent": [
        {"name": "airflow_list_dags", "fn": airflow_list_dags, "description": "List Airflow DAGs", "category": "orchestration", "read_only": True},
        {"name": "airflow_get_dag_status", "fn": airflow_get_dag_status, "description": "Get DAG status", "category": "orchestration", "read_only": True},
        {"name": "airflow_get_dag_logs", "fn": airflow_get_dag_logs, "description": "Get DAG logs", "category": "orchestration", "read_only": True},
        {"name": "kafka_list_topics", "fn": kafka_list_topics, "description": "List Kafka topics", "category": "streaming", "read_only": True},
        {"name": "kafka_get_topic_info", "fn": kafka_get_topic_info, "description": "Get topic details", "category": "streaming", "read_only": True},
        {"name": "pg_list_tables", "fn": pg_list_tables, "description": "List database tables", "category": "database", "read_only": True},
        {"name": "airflow_get_health", "fn": airflow_get_health, "description": "Check Airflow health", "category": "orchestration", "read_only": True},
        {"name": "kafka_get_health", "fn": kafka_get_health, "description": "Check Kafka health", "category": "streaming", "read_only": True},
        {"name": "pg_get_health", "fn": pg_get_health, "description": "Check PostgreSQL health", "category": "database", "read_only": True},
    ],
    "debug_agent": [
        {"name": "airflow_get_dag_logs", "fn": airflow_get_dag_logs, "description": "Get DAG logs for debugging", "category": "orchestration", "read_only": True},
        {"name": "airflow_get_dag_status", "fn": airflow_get_dag_status, "description": "Get DAG status", "category": "orchestration", "read_only": True},
        {"name": "pg_execute_sql", "fn": pg_execute_sql, "description": "Run diagnostic SQL queries", "category": "database", "read_only": True},
        {"name": "pg_describe_table", "fn": pg_describe_table, "description": "Inspect table schema", "category": "database", "read_only": True},
    ],
}


def get_tools_for_agent(agent_name: str) -> List[Dict[str, Any]]:
    """Get the available tool functions for a specific agent."""
    return AGENT_TOOL_REGISTRY.get(agent_name, [])


def get_all_tool_names() -> Dict[str, List[str]]:
    """Get a mapping of agent name to tool names."""
    return {
        agent: [t["name"] for t in tools]
        for agent, tools in AGENT_TOOL_REGISTRY.items()
    }
