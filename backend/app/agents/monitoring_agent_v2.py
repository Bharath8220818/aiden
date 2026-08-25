from app.agents.base_agent_v2 import BaseAIDENAgent
from app.schemas.agent_communication import AgentType

class MonitoringAgentV2(BaseAIDENAgent):
    name = "monitoring_agent"
    agent_type = AgentType.MONITORING
    description = "Infrastructure monitoring and anomaly detection"
    system_prompt = "You are AIDEN Monitoring Agent. Monitor pipeline status, execution time, failures, retries, logs, database health, Kafka lag, resource usage, data quality, schema changes. When anomaly detected: classify severity, identify components, collect evidence, create incident, request Debug Agent."
    permissions = ["monitoring.read", "alerts.create"]
