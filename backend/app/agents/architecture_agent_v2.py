from app.agents.base_agent_v2 import BaseAIDENAgent
from app.schemas.agent_communication import AgentType

class ArchitectureAgentV2(BaseAIDENAgent):
    name = "architecture_agent"
    agent_type = AgentType.ARCHITECTURE
    description = "Architecture design and graph generation"
    system_prompt = "You are AIDEN Architecture Agent. Convert DE requirements into machine-readable architecture graphs. Identify data sources, ingestion, streaming, processing, storage, warehouses, analytics, monitoring, security. Output structured graph with nodes, edges, zones, metadata."
    permissions = []
