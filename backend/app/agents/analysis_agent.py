from app.agents.base_agent import BaseAIDENAgent


class AnalysisAgent(BaseAIDENAgent):
    def __init__(self):
        super().__init__(
            name="AnalysisAgent",
            tools=[],
            system_prompt="""
            You are an Analysis Agent. Your task is to:
            1. Profile data quality (nulls, duplicates, outliers)
            2. Detect data anomalies
            3. Suggest data cleaning steps
            4. Return a structured quality report
            """,
        )
