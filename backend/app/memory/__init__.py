# AIDEN Memory System — Three-Layer Architecture
#
# Layer 1: Conversation Memory (Redis) — short-term session chat history
# Layer 2: Project Memory (PostgreSQL) — persistent project state
# Layer 3: Knowledge Memory (Qdrant) — RAG for documentation, code, incidents

from app.memory.conversation_memory import ConversationMemory, conversation_memory
from app.memory.project_memory import ProjectMemory, project_memory
from app.memory.knowledge_memory import KnowledgeMemory, KnowledgeType, knowledge_memory
from app.memory.memory_manager import MemoryManager, memory_manager

__all__ = [
    "ConversationMemory", "conversation_memory",
    "ProjectMemory", "project_memory",
    "KnowledgeMemory", "KnowledgeType", "knowledge_memory",
    "MemoryManager", "memory_manager",
]
