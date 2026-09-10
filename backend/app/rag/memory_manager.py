"""AIDEN RAG MemoryManager — project memory with learning from resolved incidents."""
import logging
from typing import List, Optional

from app.rag.retriever import Retriever
from app.rag.document_processor import DocumentProcessor

logger = logging.getLogger(__name__)


class RAGMemoryManager:
    """High-level memory interface used by agents (esp. self-healing).

    Capabilities:
      - search_similar(incident)  → past incidents/fixes relevant to a new one
      - store_fix(incident, fix)  → learn from a successful resolution
      - add_knowledge(content)    → ingest docs, runbooks, standards
      - get_context(query)        → prompt-ready context block
    """

    def __init__(self):
        self.retriever = Retriever()
        self.processor = DocumentProcessor()

    # ── Search ──────────────────────────────────────────────────────────

    async def search_similar(
        self,
        incident: dict,
        project_id: Optional[int] = None,
        top_k: int = 3,
    ) -> List[dict]:
        """Find similar past incidents and their fixes."""
        query = " ".join(filter(None, [
            incident.get("title", ""),
            incident.get("description", ""),
            incident.get("root_cause", ""),
        ])).strip()
        if not query:
            return []
        results = await self.retriever.retrieve(
            query,
            project_id=project_id,
            top_k=top_k,
            source_type="fix",
        )
        # fall back to any source if no fix memories exist yet
        if not results:
            results = await self.retriever.retrieve(query, project_id=project_id, top_k=top_k)
        return results

    # ── Learning ────────────────────────────────────────────────────────

    async def store_fix(self, incident: dict, fix: dict) -> dict:
        """Store a successful fix so future incidents can retrieve it."""
        content = (
            f"Incident: {incident.get('title', 'Unknown')}\n"
            f"Severity: {incident.get('severity', 'unknown')}\n"
            f"Root cause: {incident.get('root_cause', 'undetermined')}\n"
            f"Solution: {fix.get('description', fix.get('summary', ''))}\n"
            f"Actions: {fix.get('actions', [])}"
        )
        return await self._store(content, incident, source_type="fix")

    async def store_incident(self, incident: dict) -> dict:
        """Store an incident record for future similarity search."""
        content = (
            f"Incident: {incident.get('title', 'Unknown')}\n"
            f"Description: {incident.get('description', '')}\n"
            f"Root cause: {incident.get('root_cause', 'undetermined')}"
        )
        return await self._store(content, incident, source_type="incident")

    async def _store(self, content: str, incident: dict, source_type: str) -> dict:
        store = self.retriever.store
        return await store.upsert(
            content=content,
            project_id=incident.get("project_id"),
            source_type=source_type,
            source_ref=incident.get("incident_key") or str(incident.get("id", "")),
            meta={"severity": incident.get("severity"), "confidence": incident.get("confidence")},
        )

    # ── Knowledge ingestion ─────────────────────────────────────────────

    async def add_knowledge(
        self,
        content: str,
        project_id: Optional[int] = None,
        source_type: str = "doc",
        source_ref: Optional[str] = None,
        meta: Optional[dict] = None,
    ) -> dict:
        """Chunk + embed + store a knowledge document."""
        chunks = self.processor.chunk_document(self.processor.normalize(content))
        stored = 0
        store = self.retriever.store
        for i, chunk in enumerate(chunks):
            try:
                await store.upsert(
                    content=chunk,
                    project_id=project_id,
                    source_type=source_type,
                    source_ref=source_ref,
                    meta={**(meta or {}), "chunk_index": i},
                )
                stored += 1
            except Exception as e:
                logger.warning(f"Knowledge chunk {i} failed: {e}")
        return {"chunks": len(chunks), "stored": stored}

    # ── Context injection ───────────────────────────────────────────────

    async def get_context(self, query: str, project_id: Optional[int] = None, top_k: int = 3) -> str:
        """Prompt-ready context block for agent prompts."""
        return await self.retriever.retrieve_context(query, project_id=project_id, top_k=top_k)


# Singleton used by agents
rag_memory = RAGMemoryManager()
