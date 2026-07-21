from app.agents.base_agent import BaseAIDENAgent
from app.tools.database_tools import DatabaseTool


class ExtractionAgent(BaseAIDENAgent):
    def __init__(self):
        super().__init__(
            name="ExtractionAgent",
            tools=[DatabaseTool()],
            system_prompt="""
            You are an Extraction Agent. Your task is to:
            1. Connect to data sources via DatabaseTool
            2. Discover schemas and tables
            3. Extract data samples for profiling
            4. Return structured schema information

            Always return schema information in a structured format.
            """,
        )
