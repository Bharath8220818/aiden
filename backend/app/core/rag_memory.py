import json
import logging
import hashlib
import importlib
from typing import Dict, Any, List, Optional
from datetime import datetime

from app.config import settings

logger = logging.getLogger(__name__)

class InMemoryStore:
    """Simple in-memory vector store with embedding-based search."""

    def __init__(self):
        self._entries: List[Dict[str, Any]] = []
        self._embeddings: List[List[float]] = []

    def add(self, entry: Dict[str, Any], embedding: Optional[List[float]] = None):
        self._entries.append(entry)
        self._embeddings.append(embedding or [])

    def search(self, query_embedding: List[float], top_k: int = 5, min_score: float = 0.3) -> List[Dict[str, Any]]:
        if not self._embeddings or not query_embedding:
            return []
        scores = []
        for emb in self._embeddings:
            if emb:
                score = self._cosine_similarity(query_embedding, emb)
                scores.append(score)
            else:
                scores.append(0.0)
        indexed = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)
        results = []
        for idx, score in indexed[:top_k]:
            if score >= min_score:
                entry = dict(self._entries[idx])
                entry["score"] = score
                results.append(entry)
        return results

    def _cosine_similarity(self, a: List[float], b: List[float]) -> float:
        if not a or not b or len(a) != len(b):
            return 0.0
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = sum(x * x for x in a) ** 0.5
        norm_b = sum(y * y for y in b) ** 0.5
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)

    def count(self) -> int:
        return len(self._entries)

    def clear(self):
        self._entries.clear()
        self._embeddings.clear()


class QdrantStore:
    """Qdrant-backed vector store with the same interface as InMemoryStore.

    Used by RAGMemory when Qdrant is reachable. Points are persisted in the
    configured collection with the full entry as payload, so semantic search
    survives process restarts. Falls back to InMemoryStore via RAGMemory when
    the server is unavailable.
    """

    def __init__(self):
        from qdrant_client import QdrantClient
        from qdrant_client.http.models import VectorParams, Distance

        self.collection = settings.QDRANT_COLLECTION or "pipeline_intents"
        self._dim = 384  # all-MiniLM-L6-v2 embedding size
        self.client = None
        self._available = False

        # Quick single probe at init (no long retry here — lazy reconnect in
        # _ensure_connected() owns recovery, so boots stay fast even when the
        # Docker-hosted Qdrant is momentarily down).
        try:
            client = QdrantClient(
                url=settings.QDRANT_URL, timeout=3.0, check_compatibility=False
            )
            collections = client.get_collections().collections
            names = [c.name for c in collections]
            if self.collection not in names:
                client.create_collection(
                    collection_name=self.collection,
                    vectors_config=VectorParams(
                        size=self._dim, distance=Distance.COSINE
                    ),
                )
                logger.info(f"QdrantStore: Created collection '{self.collection}'")
            self.client = client
            self._available = True
            logger.info(f"QdrantStore: Connected ({settings.QDRANT_URL})")
        except Exception as e:
            logger.warning(f"QdrantStore: unavailable at init ({e})")

    def is_available(self) -> bool:
        return self._available

    def _ensure_connected(self) -> bool:
        """(Re)connect if the server was down at init time (Docker flaps on
        Windows). Safe to call on every op; a failed probe costs ~1s.
        """
        if self._available and self.client is not None:
            return True
        try:
            from qdrant_client import QdrantClient
            from qdrant_client.http.models import VectorParams, Distance

            client = QdrantClient(
                url=settings.QDRANT_URL, timeout=3.0, check_compatibility=False
            )
            client.get_collections()  # probe
            self.client = client
            self._available = True
            logger.info(f"QdrantStore: (re)connected ({settings.QDRANT_URL})")
            # Ensure the collection exists now that we are connected.
            collections = client.get_collections().collections
            names = [c.name for c in collections]
            if self.collection not in names:
                client.create_collection(
                    collection_name=self.collection,
                    vectors_config=VectorParams(
                        size=self._dim, distance=Distance.COSINE
                    ),
                )
            return True
        except Exception as e:
            logger.debug(f"QdrantStore: reconnect probe failed ({e})")
            return False

    @staticmethod
    def _is_connection_error(exc: Exception) -> bool:
        """True for connection-level failures (server down / Docker restart),
        which should invalidate the client so the next op reconnects.

        Covers socket/OSError, timeouts, and httpx transport errors (the
        qdrant-client 1.18 stack is httpx-based and raises its own types).
        """
        import socket

        if isinstance(exc, (ConnectionError, OSError, TimeoutError, socket.error)):
            return True
        try:
            import httpx
            if isinstance(exc, httpx.TransportError):
                return True
        except ImportError:
            pass
        # Last resort for wrapped/remote errors (e.g. WinError 10061 inside a
        # non-httpx client): treat "connection refused/reset" text as fatal.
        msg = str(exc).lower()
        return any(t in msg for t in ("10061", "connection refused", "connection reset"))

    def _point_id(self, entry: Dict[str, Any]) -> int:
        """Deterministic uint64 point id from the entry id hash."""
        raw = str(entry.get("id") or entry.get("query") or "")
        return int(hashlib.md5(raw.encode()).hexdigest()[:15], 16)

    def add(self, entry: Dict[str, Any], embedding: Optional[List[float]] = None):
        if not embedding:
            return
        if not self._ensure_connected():
            return
        try:
            from qdrant_client.http.models import PointStruct

            self.client.upsert(
                collection_name=self.collection,
                points=[
                    PointStruct(
                        id=self._point_id(entry),
                        vector=embedding,
                        payload=entry,
                    )
                ],
            )
        except Exception as e:
            # A connection-class failure means the server dropped mid-session
            # (Docker restart) — drop the flag so the next op reconnects.
            if self._is_connection_error(e):
                self._available = False
            logger.warning(f"QdrantStore: upsert failed: {e}")

    def search(
        self,
        query_embedding: List[float],
        top_k: int = 5,
        min_score: float = 0.3,
    ) -> List[Dict[str, Any]]:
        if not query_embedding:
            return []
        if not self._ensure_connected():
            return []
        try:
            # qdrant-client >=1.10 renamed ``search`` -> ``query_points``;
            # newer builds (1.18+) have removed ``search`` entirely.
            if hasattr(self.client, "query_points"):
                resp = self.client.query_points(
                    collection_name=self.collection,
                    query=query_embedding,
                    limit=top_k,
                    score_threshold=min_score,
                )
                results = resp.points
            else:
                results = self.client.search(
                    collection_name=self.collection,
                    query_vector=query_embedding,
                    limit=top_k,
                    score_threshold=min_score,
                )
            return [dict(r.payload, score=float(r.score)) for r in results]
        except Exception as e:
            if self._is_connection_error(e):
                self._available = False
            logger.warning(f"QdrantStore: search failed: {e}")
            return []

    def count(self) -> int:
        if not self._ensure_connected():
            return 0
        try:
            return self.client.count(
                collection_name=self.collection, exact=True
            ).count
        except Exception as e:
            if self._is_connection_error(e):
                self._available = False
            logger.warning(f"QdrantStore: count failed: {e}")
            return 0

    def clear(self):
        if not self._ensure_connected():
            return
        try:
            from qdrant_client.http.models import VectorParams, Distance

            self.client.delete_collection(collection_name=self.collection)
            self.client.create_collection(
                collection_name=self.collection,
                vectors_config=VectorParams(
                    size=self._dim, distance=Distance.COSINE
                ),
            )
            logger.info(f"QdrantStore: cleared collection '{self.collection}'")
        except Exception as e:
            logger.warning(f"QdrantStore: clear failed: {e}")


class RAGMemory:
    """Retrieval-Augmented Generation memory for storing and retrieving pipeline intents."""

    def __init__(self):
        self._embedder = None
        self._ready = False
        self.store = self._init_store()
        self._init_embedder()

    def _init_store(self) -> InMemoryStore:
        """Pick a persistent Qdrant store when enabled & reachable, else in-memory."""
        if settings.QDRANT_ENABLED:
            try:
                store = QdrantStore()
                if store.is_available():
                    return store
            except Exception as e:
                logger.warning(f"RAG: Qdrant init failed ({e}); using in-memory store")
        logger.info("RAG: using in-memory vector store (Qdrant disabled/unavailable)")
        return InMemoryStore()

    def _init_embedder(self):
        try:
            module = importlib.import_module("sentence_transformers")
            SentenceTransformer = getattr(module, "SentenceTransformer")
            self._embedder = SentenceTransformer("all-MiniLM-L6-v2")
            self._ready = True
            logger.info("RAG: sentence-transformers loaded (all-MiniLM-L6-v2)")
        except ImportError:
            logger.warning("RAG: sentence-transformers not installed. Using fallback.")
            self._ready = False
        except Exception as e:
            logger.warning(f"RAG: Failed to load embedder: {e}")
            self._ready = False

    def _get_embedding(self, text: str) -> List[float]:
        if self._embedder:
            try:
                return self._embedder.encode(text).tolist()
            except Exception as e:
                logger.debug(f"Embedding failed: {e}")
        return []

    def is_ready(self) -> bool:
        return self._ready

    def add(self, query: str, intent_data: Dict[str, Any]):
        entry = {
            "id": hashlib.md5(query.encode()).hexdigest()[:12],
            "query": query,
            "intent": intent_data,
            "timestamp": datetime.utcnow().isoformat(),
        }
        embedding = self._get_embedding(query)
        self.store.add(entry, embedding)
        logger.debug(f"RAG: Added entry for '{query[:50]}...'")

    def store_pipeline(
        self,
        query: Optional[str] = None,
        parsed: Optional[Dict[str, Any]] = None,
        user_id: Optional[int] = None,
        pipeline_id: Optional[int] = None,
        *,
        name: Optional[str] = None,
        description: Optional[str] = None,
        config: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Store a pipeline entry in RAG memory for later retrieval.

        Supports the legacy signature used by other code paths:
            store_pipeline(name, description, config, user_id)
        and the current project usage:
            store_pipeline(query, parsed, user_id)
            store_pipeline(query, parsed=parsed, user_id=user_id, pipeline_id=pipeline_id)
        """
        if parsed is None:
            parsed = {}

        # Legacy convenience signature: store_pipeline(name, description, config, user_id)
        if isinstance(query, str) and not parsed and name is None and description is None and config is None:
            parsed = {"name": query, "description": "", "config": {}, "user_id": user_id}
            self.add(query, parsed)
            return

        if not isinstance(parsed, dict):
            parsed = {"value": parsed}

        if name is None:
            name = parsed.get("name") or "Pipeline"
        if description is None:
            description = parsed.get("description") or ""
        if config is None:
            config = parsed.get("config") or {}
        if not query:
            query = name or description or json.dumps(config, default=str)

        payload = dict(parsed)
        payload.setdefault("name", name)
        payload.setdefault("description", description)
        payload.setdefault("config", config)
        if user_id is not None:
            payload["user_id"] = user_id
        if pipeline_id is not None:
            payload["pipeline_id"] = pipeline_id

        self.add(query, payload)

    def search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        if self.store.count() == 0:
            return []
        query_embedding = self._get_embedding(query)
        if not query_embedding:
            return []
        return self.store.search(query_embedding, top_k=top_k)

    def search_similar(
        self,
        query: str,
        user_id: Optional[int] = None,
        top_k: int = 5,
        min_score: float = 0.3,
    ) -> List[Dict[str, Any]]:
        if self.store.count() == 0:
            return []
        query_embedding = self._get_embedding(query)
        if not query_embedding:
            return []
        results = self.store.search(query_embedding, top_k=top_k, min_score=min_score)
        matches: List[Dict[str, Any]] = []
        for item in results:
            intent = item.get("intent", {})
            if user_id is not None and intent.get("user_id") not in (None, user_id):
                continue
            matches.append({
                "query": item.get("query", ""),
                "parsed": intent,
                "score": item.get("score", 0.0),
                "pipeline_id": intent.get("pipeline_id"),
                "user_id": intent.get("user_id"),
            })
        return matches

    def format_context(self, results: List[Dict[str, Any]]) -> str:
        if not results:
            return ""
        lines = ["Here are some similar past pipeline requests:", ""]
        for i, r in enumerate(results, 1):
            parsed = r.get("parsed") or r.get("intent", {})
            lines.append(f"Example {i}:")
            lines.append(f"  Query: {r.get('query', '')}")
            lines.append(f"  Source: {parsed.get('source_type', 'unknown')}")
            lines.append(f"  Destination: {parsed.get('destination_type', 'unknown')}")
            lines.append(f"  Schedule: {parsed.get('schedule', 'unknown')}")
            lines.append(f"  Transformations: {parsed.get('transformations', [])}")
            lines.append("")
        return "\n".join(lines)

    def count(self) -> int:
        return self.store.count()

    def clear(self):
        self.store.clear()


# Singleton instance
rag_memory = RAGMemory()
