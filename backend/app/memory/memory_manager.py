"""
Memory Manager — Unified interface for AIDEN's three-layer memory system.

Layer 1: Conversation Memory (Redis) — short-term session chat history
Layer 2: Project Memory (PostgreSQL) — persistent project state and knowledge graph
Layer 3: Knowledge Memory (Qdrant) — RAG for documentation, code, incidents, standards

The MemoryManager provides a single entry point for all memory operations
and handles routing to the appropriate layer based on the operation type.
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

from app.memory.conversation_memory import conversation_memory, ConversationMemory
from app.memory.project_memory import project_memory, ProjectMemory
from app.memory.knowledge_memory import knowledge_memory, KnowledgeMemory, KnowledgeType

logger = logging.getLogger(__name__)


class MemoryManager:
    """
    Unified memory interface for AIDEN agents.

    Agents call the MemoryManager without knowing which backend stores the data.
    The manager routes to the appropriate layer and synthesizes results.
    """

    def __init__(self):
        self.conversation = conversation_memory
        self.project = project_memory
        self.knowledge = knowledge_memory
        logger.info("MemoryManager: Initialized with 3 layers")

    # ── Conversation Layer ───────────────────────────────────────────

    async def add_conversation_message(
        self,
        session_id: str,
        role: str,
        content: str,
        metadata: Optional[Dict] = None,
    ) -> None:
        """Add a message to the conversation history."""
        await self.conversation.add_message(session_id, role, content, metadata)

    async def get_conversation_history(
        self,
        session_id: str,
        limit: int = 20,
    ) -> List[Dict]:
        """Get recent conversation history."""
        return await self.conversation.get_history(session_id, limit)

    async def get_conversation_context(self, session_id: str) -> str:
        """Get conversation formatted as LLM context."""
        return await self.conversation.get_context_window(session_id)

    # ── Project Layer ────────────────────────────────────────────────

    async def store_project_data(
        self,
        project_id: str,
        category: str,
        key: str,
        value: Dict[str, Any],
        entry_type: str = "generic",
    ) -> None:
        """Store data in the project memory."""
        await self.project.store(project_id, category, key, value, entry_type)

    async def get_project_data(
        self,
        project_id: str,
        category: str,
        key: Optional[str] = None,
    ) -> List[Dict]:
        """Retrieve data from the project memory."""
        return await self.project.retrieve(project_id, category, key)

    async def store_architecture(
        self,
        project_id: str,
        arch_id: str,
        name: str,
        nodes: List[Dict],
        edges: List[Dict],
        zones: Optional[List[Dict]] = None,
    ) -> None:
        """Store an architecture graph in project memory."""
        await self.project.store_architecture(project_id, arch_id, name, nodes, edges, zones)

    async def get_architectures(self, project_id: str) -> List[Dict]:
        """Get all architectures for a project."""
        return await self.project.get_architectures(project_id)

    async def store_incident(
        self,
        project_id: str,
        incident_id: str,
        title: str,
        severity: str,
        root_cause: Optional[str] = None,
        resolution: Optional[str] = None,
    ) -> None:
        """Store a resolved incident in project memory."""
        await self.project.store_incident(project_id, incident_id, title, severity, root_cause, resolution)

    async def find_similar_incidents(
        self,
        project_id: str,
        error_message: str,
    ) -> List[Dict]:
        """Find past incidents similar to an error message."""
        keywords = error_message.lower().split()
        return await self.project.get_similar_incidents(project_id, keywords)

    # ── Knowledge Layer ──────────────────────────────────────────────

    async def add_knowledge(
        self,
        knowledge_type: KnowledgeType,
        content: str,
        metadata: Optional[Dict] = None,
    ) -> str:
        """Add knowledge to the RAG store."""
        return await self.knowledge.add(knowledge_type, content, metadata)

    async def search_knowledge(
        self,
        query: str,
        knowledge_type: Optional[KnowledgeType] = None,
        top_k: int = 5,
    ) -> List[Dict]:
        """Search knowledge via semantic similarity."""
        return await self.knowledge.search(query, knowledge_type, top_k)

    async def search_for_agent(
        self,
        agent_name: str,
        query: str,
        top_k: int = 3,
    ) -> List[Dict]:
        """Search knowledge relevant to a specific agent."""
        return await self.knowledge.search_for_agent(agent_name, query, top_k)

    # ── Cross-Layer Queries ──────────────────────────────────────────

    async def get_full_context(
        self,
        session_id: str,
        project_id: str,
        query: str,
    ) -> Dict[str, Any]:
        """
        Get a comprehensive context bundle for an agent execution.

        Combines all three memory layers into a single context object:
        - conversation: recent chat history
        - project: relevant project state (architecture, incidents)
        - knowledge: semantically similar documentation and code
        """
        # Gather from all layers in parallel-ish (sequential for simplicity)
        conversation_ctx = await self.conversation.get_context_window(session_id)
        recent_messages = await self.conversation.get_history(session_id, limit=10)

        architectures = await self.project.get_architectures(project_id)
        recent_incidents = await self.project.get_similar_incidents(
            project_id, query.split()
        )

        knowledge_results = await self.knowledge.search(query, top_k=3)

        return {
            "conversation": {
                "session_id": session_id,
                "context_window": conversation_ctx,
                "recent_messages": recent_messages,
            },
            "project": {
                "project_id": project_id,
                "architecture_count": len(architectures),
                "architectures": architectures[:3],
                "relevant_incidents": recent_incidents[:3],
            },
            "knowledge": {
                "results": knowledge_results,
                "count": len(knowledge_results),
            },
            "timestamp": datetime.utcnow().isoformat(),
        }

    # ── Stats & Health ───────────────────────────────────────────────

    async def get_stats(self, project_id: str = "default") -> Dict[str, Any]:
        """Get comprehensive memory statistics."""
        conv_stats = await self.conversation.get_stats()
        proj_stats = await self.project.get_stats(project_id)
        know_stats = await self.knowledge.get_stats()

        return {
            "conversation": conv_stats,
            "project": proj_stats,
            "knowledge": know_stats,
            "total_entries": (
                conv_stats.get("total_messages", 0)
                + proj_stats.get("total_entries", 0)
                + know_stats.get("total", 0)
            ),
        }

    async def health(self) -> Dict[str, Any]:
        """Health check for all memory layers."""
        conv_health = await self.conversation.health()
        proj_health = await self.project.health()
        know_health = await self.knowledge.health()

        all_healthy = all(
            h.get("status") == "healthy"
            for h in [conv_health, proj_health, know_health]
        )

        return {
            "status": "healthy" if all_healthy else "degraded",
            "conversation": conv_health,
            "project": proj_health,
            "knowledge": know_health,
        }


# Singleton
memory_manager = MemoryManager()
