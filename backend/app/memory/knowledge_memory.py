"""
Knowledge Memory v2 — Qdrant-backed RAG for project-specific knowledge.

Stores and retrieves:
- Documentation (README, architecture docs, runbooks)
- Code snippets (SQL, Python, Airflow DAGs, dbt models)
- Incident reports (past failures and resolutions)
- Engineering standards (conventions, patterns, best practices)
- Architecture decisions (ADRs)

Uses multiple Qdrant collections per knowledge type for targeted retrieval.
Falls back to in-memory when Qdrant is unavailable.
"""

import hashlib
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from enum import Enum

from app.config import settings

logger = logging.getLogger(__name__)


class KnowledgeType(str, Enum):
    DOCUMENTATION = "documentation"
    CODE = "code"
    INCIDENT = "incident"
    STANDARD = "standard"
    ARCHITECTURE = "architecture"


KNOWLEDGE_COLLECTIONS = {
    KnowledgeType.DOCUMENTATION: "aiden_docs",
    KnowledgeType.CODE: "aiden_code",
    KnowledgeType.INCIDENT: "aiden_incidents",
    KnowledgeType.STANDARD: "aiden_standards",
    KnowledgeType.ARCHITECTURE: "aiden_architecture",
}


class InMemoryKnowledgeStore:
    """In-memory fallback for knowledge storage with cosine similarity search."""

    def __init__(self):
        self._entries: Dict[str, List[Dict]] = {k.value: [] for k in KnowledgeType}

    def add(self, knowledge_type: KnowledgeType, entry: Dict[str, Any], embedding: Optional[List[float]] = None):
        entry["_embedding"] = embedding or []
        entry["_stored_at"] = datetime.utcnow().isoformat()
        self._entries[knowledge_type.value].append(entry)

    def search(
        self,
        knowledge_type: Optional[KnowledgeType],
        query_embedding: List[float],
        top_k: int = 5,
        min_score: float = 0.3,
    ) -> List[Dict[str, Any]]:
        collections = [knowledge_type.value] if knowledge_type else list(self._entries.keys())
        all_results = []
        for col in collections:
            for entry in self._entries.get(col, []):
                emb = entry.get("_embedding", [])
                if emb and query_embedding:
                    score = self._cosine(query_embedding, emb)
                    if score >= min_score:
                        result = {k: v for k, v in entry.items() if k != "_embedding"}
                        result["score"] = score
                        result["collection"] = col
                        all_results.append(result)
        all_results.sort(key=lambda x: x["score"], reverse=True)
        return all_results[:top_k]

    def count(self, knowledge_type: Optional[KnowledgeType] = None) -> int:
        if knowledge_type:
            return len(self._entries.get(knowledge_type.value, []))
        return sum(len(v) for v in self._entries.values())

    def _cosine(self, a: List[float], b: List[float]) -> float:
        if not a or not b or len(a) != len(b):
            return 0.0
        dot = sum(x * y for x, y in zip(a, b))
        na = sum(x * x for x in a) ** 0.5
        nb = sum(y * y for y in b) ** 0.5
        return dot / (na * nb) if na and nb else 0.0


class KnowledgeMemory:
    """
    Multi-collection vector store for project-specific knowledge.

    Each knowledge type has its own Qdrant collection for targeted retrieval.
    When Qdrant is unavailable, falls back to in-memory cosine search.
    """

    def __init__(self):
        self._embedder = None
        self._qdrant = None
        self._fallback = InMemoryKnowledgeStore()
        self._dim = 384
        self._collections_ready = False
        self._init_embedder()
        self._init_qdrant()

    def _init_embedder(self):
        """Initialize the sentence transformer embedder."""
        try:
            from sentence_transformers import SentenceTransformer
            self._embedder = SentenceTransformer("all-MiniLM-L6-v2")
            logger.info("KnowledgeMemory: Embedder loaded (all-MiniLM-L6-v2)")
        except ImportError:
            logger.warning("KnowledgeMemory: sentence-transformers not installed")
        except Exception as e:
            logger.warning(f"KnowledgeMemory: Embedder init failed: {e}")

    def _init_qdrant(self):
        """Initialize Qdrant client and create collections."""
        if not settings.QDRANT_ENABLED:
            logger.info("KnowledgeMemory: Qdrant disabled, using in-memory")
            return

        try:
            from qdrant_client import QdrantClient
            from qdrant_client.http.models import VectorParams, Distance

            self._qdrant = QdrantClient(
                url=settings.QDRANT_URL,
                timeout=3.0,
                check_compatibility=False,
            )

            # Create collections for each knowledge type
            existing = [c.name for c in self._qdrant.get_collections().collections]
            for kt, collection_name in KNOWLEDGE_COLLECTIONS.items():
                if collection_name not in existing:
                    self._qdrant.create_collection(
                        collection_name=collection_name,
                        vectors_config=VectorParams(size=self._dim, distance=Distance.COSINE),
                    )
                    logger.info(f"KnowledgeMemory: Created collection '{collection_name}'")

            self._collections_ready = True
            logger.info("KnowledgeMemory: Qdrant connected")
        except ImportError:
            logger.warning("KnowledgeMemory: qdrant-client not installed")
        except Exception as e:
            logger.warning(f"KnowledgeMemory: Qdrant init failed ({e})")

    def _get_embedding(self, text: str) -> List[float]:
        """Get embedding for text."""
        if self._embedder:
            try:
                return self._embedder.encode(text).tolist()
            except Exception as e:
                logger.debug(f"Embedding failed: {e}")
        return []

    def _point_id(self, entry: Dict[str, Any]) -> int:
        """Deterministic point ID from entry hash."""
        raw = str(entry.get("id") or entry.get("content", "")[:100])
        return int(hashlib.md5(raw.encode()).hexdigest()[:15], 16)

    # ── Store ────────────────────────────────────────────────────────

    async def add(
        self,
        knowledge_type: KnowledgeType,
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
        entry_id: Optional[str] = None,
    ) -> str:
        """Add a knowledge entry and return its ID."""
        eid = entry_id or hashlib.md5(content.encode()).hexdigest()[:12]
        entry = {
            "id": eid,
            "content": content,
            "knowledge_type": knowledge_type.value,
            **(metadata or {}),
        }

        embedding = self._get_embedding(content)

        # Try Qdrant first
        if self._qdrant and self._collections_ready:
            try:
                from qdrant_client.http.models import PointStruct
                collection = KNOWLEDGE_COLLECTIONS[knowledge_type]
                self._qdrant.upsert(
                    collection_name=collection,
                    points=[PointStruct(id=self._point_id(entry), vector=embedding, payload=entry)],
                )
                return eid
            except Exception as e:
                logger.warning(f"KnowledgeMemory: Qdrant write failed ({e})")

        # Fallback
        self._fallback.add(knowledge_type, entry, embedding)
        return eid

    async def add_documentation(
        self,
        title: str,
        content: str,
        source: str = "",
        project_id: str = "",
    ) -> str:
        """Add a documentation entry."""
        return await self.add(
            KnowledgeType.DOCUMENTATION,
            content,
            metadata={"title": title, "source": source, "project_id": project_id},
        )

    async def add_code(
        self,
        language: str,
        code: str,
        description: str = "",
        tags: Optional[List[str]] = None,
    ) -> str:
        """Add a code snippet."""
        return await self.add(
            KnowledgeType.CODE,
            f"{description}\n```{language}\n{code}\n```",
            metadata={"language": language, "description": description, "tags": tags or []},
        )

    async def add_incident(
        self,
        title: str,
        description: str,
        root_cause: str,
        resolution: str,
        severity: str = "warning",
    ) -> str:
        """Add an incident report for future root cause analysis."""
        content = f"{title}\n{description}\nRoot Cause: {root_cause}\nResolution: {resolution}"
        return await self.add(
            KnowledgeType.INCIDENT,
            content,
            metadata={
                "title": title, "root_cause": root_cause,
                "resolution": resolution, "severity": severity,
            },
        )

    async def add_standard(
        self,
        title: str,
        content: str,
        category: str = "general",
    ) -> str:
        """Add an engineering standard."""
        return await self.add(
            KnowledgeType.STANDARD,
            content,
            metadata={"title": title, "category": category},
        )

    # ── Search ───────────────────────────────────────────────────────

    async def search(
        self,
        query: str,
        knowledge_type: Optional[KnowledgeType] = None,
        top_k: int = 5,
        min_score: float = 0.3,
    ) -> List[Dict[str, Any]]:
        """Semantic search across knowledge collections."""
        query_embedding = self._get_embedding(query)
        if not query_embedding:
            return []

        # Try Qdrant
        if self._qdrant and self._collections_ready:
            try:
                collections = [KNOWLEDGE_COLLECTIONS[knowledge_type]] if knowledge_type else list(KNOWLEDGE_COLLECTIONS.values())
                all_results = []
                for col in collections:
                    try:
                        if hasattr(self._qdrant, "query_points"):
                            resp = self._qdrant.query_points(
                                collection_name=col,
                                query=query_embedding,
                                limit=top_k,
                                score_threshold=min_score,
                            )
                            for r in resp.points:
                                result = dict(r.payload)
                                result["score"] = float(r.score)
                                result["collection"] = col
                                all_results.append(result)
                        else:
                            results = self._qdrant.search(
                                collection_name=col,
                                query_vector=query_embedding,
                                limit=top_k,
                                score_threshold=min_score,
                            )
                            for r in results:
                                result = dict(r.payload)
                                result["score"] = float(r.score)
                                result["collection"] = col
                                all_results.append(result)
                    except Exception:
                        continue

                all_results.sort(key=lambda x: x["score"], reverse=True)
                return all_results[:top_k]
            except Exception as e:
                logger.warning(f"KnowledgeMemory: Qdrant search failed ({e})")

        # Fallback
        return self._fallback.search(knowledge_type, query_embedding, top_k, min_score)

    async def search_for_agent(
        self,
        agent_name: str,
        query: str,
        top_k: int = 3,
    ) -> List[Dict[str, Any]]:
        """Search knowledge relevant to a specific agent's domain."""
        # Map agents to relevant knowledge types
        agent_knowledge_map = {
            "sql_agent": [KnowledgeType.CODE, KnowledgeType.STANDARD],
            "pipeline_agent": [KnowledgeType.CODE, KnowledgeType.DOCUMENTATION, KnowledgeType.ARCHITECTURE],
            "monitoring_agent": [KnowledgeType.INCIDENT, KnowledgeType.STANDARD],
            "debug_agent": [KnowledgeType.INCIDENT, KnowledgeType.CODE],
            "architecture_agent": [KnowledgeType.ARCHITECTURE, KnowledgeType.DOCUMENTATION],
            "orchestrator": None,  # Search all
        }

        # For now, search across all types (targeted search when collections grow)
        return await self.search(query, top_k=top_k)

    # ── Stats & Health ───────────────────────────────────────────────

    async def get_stats(self) -> Dict[str, Any]:
        """Get knowledge memory statistics."""
        backend = "qdrant" if (self._qdrant and self._collections_ready) else "in-memory"
        counts = {}
        for kt in KnowledgeType:
            if self._qdrant and self._collections_ready:
                try:
                    col = KNOWLEDGE_COLLECTIONS[kt]
                    counts[kt.value] = self._qdrant.count(collection_name=col, exact=True).count
                except Exception:
                    counts[kt.value] = 0
            else:
                counts[kt.value] = self._fallback.count(kt)

        return {
            "backend": backend,
            "collections": counts,
            "total": sum(counts.values()),
        }

    async def health(self) -> Dict[str, Any]:
        """Health check for knowledge memory."""
        if self._qdrant and self._collections_ready:
            try:
                self._qdrant.get_collections()
                return {"status": "healthy", "backend": "qdrant"}
            except Exception as e:
                return {"status": "degraded", "backend": "qdrant", "error": str(e)}
        return {"status": "healthy", "backend": "in-memory"}


# Singleton
knowledge_memory = KnowledgeMemory()
