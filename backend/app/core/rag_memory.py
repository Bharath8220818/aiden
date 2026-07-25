"""
RAG Memory — Retrieval-Augmented Generation for Pipeline Intents
=================================================================
Stores embeddings of past pipeline intents and retrieves semantically
similar ones so the LLM has relevant context when parsing new requests.

Architecture:
    ┌────────────────────────────────────────────┐
    │  RAGMemory                                 │
    │  ┌──────────────────┐  ┌────────────────┐  │
    │  │  QdrantBackend   │  │  InMemoryStore │  │
    │  │  (collections)   │  │  (dict + numpy)│  │
    │  └──────────────────┘  └────────────────┘  │
    └────────────────────────────────────────────┘
                           │
                           ▼
    IntentParser._try_ai_parse(query)
      ├─ search_similar(query) → top-3 past intents
      ├─ prepend context to SYSTEM_PROMPT
      └─ generate() with richer prompt

    After successful parse:
      └─ store_pipeline(query, parsed_intent, ...)
"""

import json
import logging
import math
import time
from typing import Any, Dict, List, Optional
from uuid import uuid4

from app.config import settings
from app.services.hf_service import hf_service

logger = logging.getLogger(__name__)

# ── Conditional Qdrant imports ─────────────────────────────────────────
try:
    from qdrant_client import QdrantClient
    from qdrant_client.http import models as qdrant_models
    from qdrant_client.http.exceptions import UnexpectedResponse

    QDRANT_AVAILABLE = True
except ImportError:
    QdrantClient = None
    qdrant_models = None
    UnexpectedResponse = Exception
    QDRANT_AVAILABLE = False

# ── Embedding dimension of all-MiniLM-L6-v2 ────────────────────────────
EMBEDDING_DIM = 384

# ── In-memory entry type ───────────────────────────────────────────────


class _MemoryEntry:
    """A single stored pipeline intent with its embedding vector."""

    __slots__ = ("id", "query", "parsed", "user_id", "pipeline_id", "embedding", "created_at")

    def __init__(
        self,
        entry_id: str,
        query: str,
        parsed: Dict[str, Any],
        user_id: int,
        pipeline_id: Optional[int],
        embedding: List[float],
    ):
        self.id = entry_id
        self.query = query
        self.parsed = parsed
        self.user_id = user_id
        self.pipeline_id = pipeline_id
        self.embedding = embedding
        self.created_at = time.time()


# ══════════════════════════════════════════════════════════════════════════
# RAGMemory
# ══════════════════════════════════════════════════════════════════════════


class RAGMemory:
    """
    Retrieval-Augmented Generation memory for pipeline intents.

    Stores (query → embedding → parsed intent) tuples so future queries
    that are semantically similar can retrieve past context and improve
    the LLM's output.

    Backend selection:
        - Qdrant vector DB when ``qdrant-client`` is installed **and**
          the Qdrant server at ``settings.QDRANT_URL`` is reachable.
        - In-memory dictionary (simple cosine-similarity) otherwise.
          **In-memory data is lost on process restart.**
    """

    def __init__(self):
        self._backend: Optional[QdrantClient] = None
        self._collection: Optional[str] = None
        self._memory_store: Dict[str, _MemoryEntry] = {}  # fallback
        self._ready = False

        # Try Qdrant first
        if QDRANT_AVAILABLE:
            try:
                self._backend = QdrantClient(url=settings.QDRANT_URL, timeout=2.0)
                self._collection = settings.QDRANT_COLLECTION

                # Create collection if it doesn't exist
                try:
                    self._backend.get_collection(self._collection)
                    logger.info("RAG: Qdrant collection '%s' exists", self._collection)
                except (UnexpectedResponse, ValueError):
                    self._backend.recreate_collection(
                        collection_name=self._collection,
                        vectors_config=qdrant_models.VectorParams(
                            size=EMBEDDING_DIM,
                            distance=qdrant_models.Distance.COSINE,
                        ),
                    )
                    logger.info("RAG: Created Qdrant collection '%s'", self._collection)

                self._ready = True
                logger.info(
                    "RAGMemory initialised with Qdrant backend at %s",
                    settings.QDRANT_URL,
                )
            except Exception as exc:
                logger.warning(
                    "RAG: Qdrant unreachable (%s). Falling back to in-memory store.",
                    exc,
                )
                self._backend = None

        if not self._ready:
            logger.info("RAGMemory initialised with in-memory store (data lost on restart)")

    # ── Public API ─────────────────────────────────────────────────────

    def is_ready(self) -> bool:
        """Whether the RAG store is available (any backend)."""
        return True  # in-memory always works

    def search_similar(
        self,
        query: str,
        user_id: Optional[int] = None,
        top_k: int = settings.RAG_TOP_K,
        min_score: float = settings.RAG_MIN_SCORE,
    ) -> List[Dict[str, Any]]:
        """
        Retrieve the top-k most semantically similar past intents.

        Args:
            query: The user's natural language query.
            user_id: If provided, only return results for this user.
            top_k: Maximum number of results.
            min_score: Minimum cosine-similarity threshold.

        Returns:
            List of dicts with keys: query, parsed, score, pipeline_id.
        """
        query_vec = self._embed(query)
        if query_vec is None:
            return []

        if self._backend is not None:
            return self._search_qdrant(query_vec, user_id, top_k, min_score)
        else:
            return self._search_memory(query_vec, user_id, top_k, min_score)

    def store_pipeline(
        self,
        query: str,
        parsed: Dict[str, Any],
        user_id: int,
        pipeline_id: Optional[int] = None,
    ) -> bool:
        """
        Store a pipeline intent so it can be retrieved by future similar queries.

        Args:
            query: The original user query.
            parsed: The parsed pipeline configuration dict.
            user_id: The user who created this pipeline.
            pipeline_id: Optional pipeline DB id for cross-reference.

        Returns:
            True if stored, False if embedding failed.
        """
        query_vec = self._embed(query)
        if query_vec is None:
            return False

        entry_id = str(uuid4())

        if self._backend is not None:
            return self._store_qdrant(entry_id, query, parsed, user_id, pipeline_id, query_vec)
        else:
            return self._store_memory(entry_id, query, parsed, user_id, pipeline_id, query_vec)

    def format_context(
        self,
        results: List[Dict[str, Any]],
        max_examples: int = 3,
    ) -> str:
        """
        Format RAG results into a prompt-friendly context block.

        This string is prepended to the system prompt before the user query.

        Args:
            results: Output from ``search_similar()``.
            max_examples: Max examples to include.

        Returns:
            A formatted string, or empty string if no results.
        """
        if not results:
            return ""

        lines = [
            "Here are some similar past pipeline intents that may help guide your response:",
        ]

        for i, r in enumerate(results[:max_examples]):
            parsed = r.get("parsed", {})
            score = r.get("score", 0.0)
            lines.append("")
            lines.append(f"  Example {i+1} (similarity: {score:.2f}):")
            lines.append(f"    Original query: \"{r.get('query', '')}\"")
            lines.append(f"    Parsed intent:  {json.dumps(parsed, indent=6)}")
            lines.append(f"    Pipeline ID:    {r.get('pipeline_id', '—')}")

        lines.append("")
        lines.append("Use the above as reference but adapt to the current request.")

        return "\n".join(lines)

    # ── Embedding ─────────────────────────────────────────────────────

    def _embed(self, text: str) -> Optional[List[float]]:
        """Generate a normalized embedding vector for *text*."""
        if not hf_service.is_available():
            return None
        result = hf_service.get_embeddings(text)
        if result is None or len(result) == 0:
            return None
        return result[0]  # single-vector

    # ── Qdrant Backend ─────────────────────────────────────────────────

    def _search_qdrant(
        self,
        query_vec: List[float],
        user_id: Optional[int],
        top_k: int,
        min_score: float,
    ) -> List[Dict[str, Any]]:
        try:
            qdrant_filter = None
            if user_id is not None:
                qdrant_filter = qdrant_models.Filter(
                    must=[
                        qdrant_models.FieldCondition(
                            key="user_id",
                            match=qdrant_models.MatchValue(value=user_id),
                        )
                    ]
                )

            hits = self._backend.search(
                collection_name=self._collection,
                query_vector=query_vec,
                limit=top_k,
                score_threshold=min_score,
                query_filter=qdrant_filter,
            )

            results = []
            for hit in hits:
                payload = hit.payload or {}
                results.append(
                    {
                        "query": payload.get("query", ""),
                        "parsed": json.loads(payload.get("parsed_json", "{}")),
                        "score": hit.score,
                        "pipeline_id": payload.get("pipeline_id"),
                    }
                )
            return results

        except Exception as exc:
            logger.warning("RAG Qdrant search failed: %s", exc)
            return []

    def _store_qdrant(
        self,
        entry_id: str,
        query: str,
        parsed: Dict[str, Any],
        user_id: int,
        pipeline_id: Optional[int],
        embedding: List[float],
    ) -> bool:
        try:
            self._backend.upsert(
                collection_name=self._collection,
                points=[
                    qdrant_models.PointStruct(
                        id=entry_id,
                        vector=embedding,
                        payload={
                            "query": query,
                            "parsed_json": json.dumps(parsed),
                            "user_id": user_id,
                            "pipeline_id": pipeline_id,
                        },
                    )
                ],
            )
            return True
        except Exception as exc:
            logger.warning("RAG Qdrant store failed: %s", exc)
            return False

    # ── In-Memory Fallback ─────────────────────────────────────────────

    def _search_memory(
        self,
        query_vec: List[float],
        user_id: Optional[int],
        top_k: int,
        min_score: float,
    ) -> List[Dict[str, Any]]:
        candidates: List[tuple[float, _MemoryEntry]] = []

        for entry in self._memory_store.values():
            if user_id is not None and entry.user_id != user_id:
                continue
            score = self._cosine_similarity(query_vec, entry.embedding)
            if score >= min_score:
                candidates.append((score, entry))

        # Sort descending by score
        candidates.sort(key=lambda x: x[0], reverse=True)

        results = []
        for score, entry in candidates[:top_k]:
            results.append(
                {
                    "query": entry.query,
                    "parsed": entry.parsed,
                    "score": score,
                    "pipeline_id": entry.pipeline_id,
                }
            )
        return results

    def _store_memory(
        self,
        entry_id: str,
        query: str,
        parsed: Dict[str, Any],
        user_id: int,
        pipeline_id: Optional[int],
        embedding: List[float],
    ) -> bool:
        self._memory_store[entry_id] = _MemoryEntry(
            entry_id=entry_id,
            query=query,
            parsed=parsed,
            user_id=user_id,
            pipeline_id=pipeline_id,
            embedding=embedding,
        )
        # Cap store to 500 entries to avoid unbounded memory growth
        if len(self._memory_store) > 500:
            # Remove oldest 100
            sorted_ids = sorted(
                self._memory_store, key=lambda eid: self._memory_store[eid].created_at
            )
            for eid in sorted_ids[:100]:
                del self._memory_store[eid]
        return True

    # ── Utility ────────────────────────────────────────────────────────

    @staticmethod
    def _cosine_similarity(a: List[float], b: List[float]) -> float:
        """Cosine similarity between two equal-length vectors."""
        dot = 0.0
        na = 0.0
        nb = 0.0
        for ai, bi in zip(a, b, strict=False):
            dot += ai * bi
            na += ai * ai
            nb += bi * bi
        if na == 0.0 or nb == 0.0:
            return 0.0
        return dot / (math.sqrt(na) * math.sqrt(nb))

    def count(self) -> int:
        """Number of stored intents (for diagnostics)."""
        if self._backend is not None:
            try:
                info = self._backend.get_collection(self._collection)
                return info.points_count
            except Exception:
                return 0
        return len(self._memory_store)


# Singleton
rag_memory = RAGMemory()
