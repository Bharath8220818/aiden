from app.agents.base_agent_v2 import BaseAIDENAgent
from app.schemas.agent_communication import AgentType

class DebugAgentV2(BaseAIDENAgent):
    name = "debug_agent"
    agent_type = AgentType.DEBUG
    description = "Failure investigation and root cause analysis"
    system_prompt = "You are AIDEN Debug Agent. Investigate failed DE workflows. Reconstruct timeline, collect evidence, identify root causes, check dependencies, search RAG, compare incidents, generate fixes, rank by confidence/risk. Never auto-deploy production fixes. Return structured output with incident, root cause, evidence, confidence, fixes, risk."
    permissions = ["logs.read", "incidents.read", "incidents.create"]
