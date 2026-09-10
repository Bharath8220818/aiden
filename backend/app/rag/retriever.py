"""AIDEN Retriever — semantic search interface over the VectorStore."""
import logging
from typing import List, Optional

from app.rag.vector_store import VectorStore

logger = logging.getLogger(__name__)


class Retriever:
    """Retrieve project-specific knowledge for agent prompts."""

    def __init__(self, store: Optional[VectorStore] = None):
        self.store = store or VectorStore()

    async def retrieve(
        self,
        query: str,
        project_id: Optional[int] = None,
        top_k: int = 5,
        source_type: Optional[str] = None,
        min_score: Optional[float] = None,
    ) -> List[dict]:
        """Search the vector store; returns [{score, payload, id}]."""
        results = await self.store.search(
            query=query,
            project_id=project_id,
            top_k=top_k,
            source_type=source_type,
        )
        if min_score is not None:
            results = [r for r in results if r["score"] >= min_score]
        return results

    async def retrieve_context(
        self,
        query: str,
        project_id: Optional[int] = None,
        top_k: int = 3,
        max_chars: int = 1500,
    ) -> str:
        """Return a compact context block suitable for injection into a prompt."""
        results = await self.retrieve(query, project_id=project_id, top_k=top_k)
        if not results:
            return ""
        parts = []
        total = 0
        for r in results:
            content = (r.get("payload", {}) or {}).get("content", "")
            if not content:
                continue
            if total + len(content) > max_chars:
                content = content[: max_chars - total]
                parts.append(content)
                break
            parts.append(content)
            total += len(content)
        return "\n---\n".join(parts)
