"""AIDEN Pipeline Agent"""
from app.agents.base_agent_v2 import BaseAIDENAgent
from app.schemas.agent_communication import AgentType

class PipelineAgentV2(BaseAIDENAgent):
    name = "pipeline_agent"
    agent_type = AgentType.PIPELINE
    description = "Pipeline design and generation"
    system_prompt = """You are AIDEN Pipeline Agent. Design production-quality data pipelines using Airflow, Kafka, Spark, dbt, Python, SQL. Never deploy directly to production."""
    permissions = ["airflow.dag.read", "airflow.dag.generate"]
