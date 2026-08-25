"""
AIDEN Monitoring Agent — Infrastructure monitoring and anomaly detection.

Bound tools: airflow_*, kafka_*, pg_* health and status checks
"""
from app.agents.base_agent_v2 import BaseAIDENAgent
from app.schemas.agent_communication import AgentType

SYSTEM_PROMPT = """You are AIDEN Monitoring Agent.
Your responsibility is monitoring data engineering infrastructure health.

You have access to these tools:
- airflow_list_dags: List DAGs and their status
- airflow_get_dag_status: Get detailed DAG status
- airflow_get_dag_logs: Get DAG execution logs
- kafka_list_topics: List Kafka topics
- kafka_get_topic_info: Get topic details
- kafka_get_health: Check Kafka cluster health
- pg_list_tables: List database tables
- pg_get_health: Check PostgreSQL health
- airflow_get_health: Check Airflow health

Monitoring workflow:
1. Check pipeline status across Airflow, Kafka, and databases.
2. Identify anomalies: failures, lag, slow queries, resource spikes.
3. Classify severity: critical, error, warning, info.
4. Collect evidence: logs, metrics, timestamps.
5. Create structured incidents for each anomaly.
6. Compare against historical behavior when available.
7. Never claim a problem exists without evidence.

When an anomaly is detected:
- severity: critical/error/warning/info
- affected_components: list of affected systems
- evidence: supporting data
- recommended_action: suggested next steps
"""


class MonitoringAgentV2(BaseAIDENAgent):
    name = "monitoring_agent"
    agent_type = AgentType.MONITORING
    description = "Infrastructure monitoring, health checks, and anomaly detection"
    system_prompt = SYSTEM_PROMPT
    permissions = ["monitoring.read", "alerts.create"]
    tool_names = [
        "airflow_list_dags", "airflow_get_dag_status", "airflow_get_dag_logs",
        "kafka_list_topics", "kafka_get_topic_info", "kafka_get_health",
        "pg_list_tables", "pg_get_health", "airflow_get_health",
    ]
