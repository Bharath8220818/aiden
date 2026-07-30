import asyncio
import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.intent_parser import IntentParser
from app.core.agent_registry import AgentRegistry
from app.core.rag_memory import rag_memory
from app.core.pipeline_builder import PipelineBuilder

logger = logging.getLogger(__name__)


class AgentOrchestrator:
    """Coordinates AI agents sequentially to build pipelines from natural language prompts."""

    def __init__(self):
        self.intent_parser = IntentParser()
        self.builder = PipelineBuilder()
        self.registry = AgentRegistry

    async def run(
        self,
        prompt: str,
        user_id: int,
        db: AsyncSession,
        client_id: Optional[str] = None,
        pre_parsed_intent: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """Execute the full agent orchestration pipeline."""
        # 1. Parse intent (or use pre-parsed)
        if pre_parsed_intent:
            intent = pre_parsed_intent
        else:
            intent = await self.intent_parser.parse(prompt)

        # 2. Retrieve similar intents from RAG
        similar = rag_memory.search(prompt, top_k=3)
        if similar:
            intent["examples"] = rag_memory.format_context(similar)

        # 3. Sequential agent execution
        schema = intent.get("source_config", {})
        quality_report = {"quality_score": 0.85, "issues": []}
        code = self.builder.generate_all(intent)

        pipeline = None
        agents_used = []

        for agent_name in ["extraction", "analysis", "pipeline_builder", "governance", "deployment"]:
            agent = self.registry.get(agent_name)
            if not agent:
                logger.debug(f"Agent '{agent_name}' not registered, skipping")
                continue

            agents_used.append(agent_name)
            logger.debug(f"Running agent: {agent_name}")

            try:
                if agent_name == "extraction":
                    schema = await agent.run(intent.get("source_config", {}))
                elif agent_name == "analysis":
                    quality_report = await agent.run(schema)
                elif agent_name == "pipeline_builder":
                    code = await agent.run(intent, schema, quality_report)
                elif agent_name == "governance":
                    result = await agent.run(user_id=user_id, action="create_pipeline", resource=intent)
                    if not result.get("allowed", True):
                        raise PermissionError("Governance check failed")
                elif agent_name == "deployment":
                    pipeline = await self.builder.create_pipeline(
                        name=intent.get("name", "Untitled"),
                        source=intent.get("source_type", "unknown"),
                        destination=intent.get("destination_type", "unknown"),
                        schedule=intent.get("schedule", "0 6 * * *"),
                        code=code,
                        user_id=user_id,
                        db=db,
                    )
                    await agent.run(pipeline)

            except Exception as e:
                logger.error(f"Agent '{agent_name}' failed: {e}")
                # Continue with fallback for non-critical agents
                if agent_name in ("governance", "deployment"):
                    raise

        # 4. Create pipeline if deployment agent didn't do it
        if pipeline is None:
            pipeline = await self.builder.create_pipeline(
                name=intent.get("name", "Untitled"),
                source=intent.get("source_type", "unknown"),
                destination=intent.get("destination_type", "unknown"),
                schedule=intent.get("schedule", "0 6 * * *"),
                code=code,
                user_id=user_id,
                db=db,
            )

        # 5. Store in RAG for future learning
        rag_memory.add(prompt, intent)

        return {
            "pipeline": pipeline,
            "intent": intent,
            "schema": schema,
            "quality_report": quality_report,
            "code": code,
            "agents_used": agents_used,
            "success": True,
        }
