from app.agents.base_agent import BaseAIDENAgent
from app.tools.code_generator_tools import CodeGeneratorTool


class PipelineBuilderAgent(BaseAIDENAgent):
    def __init__(self):
        super().__init__(
            name="PipelineBuilderAgent",
            tools=[CodeGeneratorTool()],
            system_prompt="""
            You are a Pipeline Builder Agent. Your task is to:
            1. Generate Airflow DAG code using CodeGeneratorTool
            2. Generate dbt transformation models
            3. Generate data quality tests
            4. Return complete, executable code
            """,
        )
