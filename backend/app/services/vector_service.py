import logging
from typing import Optional, List, Dict, Any
from app.config import settings

logger = logging.getLogger(__name__)


class VectorService:
    """Service for vector similarity search using Qdrant."""

    def __init__(self):
        self.client = None
        self.collection = settings.QDRANT_COLLECTION or "rag_memory"
        self._available = False
        self._init_client()

    def _init_client(self):
        if not settings.QDRANT_URL:
            logger.info("Vector service: Qdrant URL not configured, using in-memory fallback")
            return

        # Quick single probe at init (no long retry here — lazy reconnect in
        # _ensure_connected() owns recovery, so boots stay fast even when the
        # Docker-hosted Qdrant is momentarily down).
        try:
            from qdrant_client import QdrantClient
            self.client = QdrantClient(
                url=settings.QDRANT_URL, timeout=3.0, check_compatibility=False
            )
            # Check if collection exists
            collections = self.client.get_collections().collections
            collection_names = [c.name for c in collections]
            if self.collection not in collection_names:
                self._create_collection()
            self._available = True
            logger.info(f"Vector service: Qdrant connected ({settings.QDRANT_URL})")
        except Exception as e:
            logger.warning(
                f"Vector service: Qdrant unavailable at init ({e}), using in-memory fallback"
            )

    def _create_collection(self):
        try:
            from qdrant_client.http.models import VectorParams, Distance
            self.client.create_collection(
                collection_name=self.collection,
                vectors_config=VectorParams(size=384, distance=Distance.COSINE),
            )
            logger.info(f"Vector service: Created collection '{self.collection}'")
        except Exception as e:
            logger.warning(f"Vector service: Failed to create collection: {e}")

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

            client = QdrantClient(
                url=settings.QDRANT_URL, timeout=3.0, check_compatibility=False
            )
            client.get_collections()  # probe
            self.client = client
            self._available = True
            logger.info(f"Vector service: (re)connected ({settings.QDRANT_URL})")
            collections = client.get_collections().collections
            collection_names = [c.name for c in collections]
            if self.collection not in collection_names:
                self._create_collection()
            return True
        except Exception as e:
            logger.debug(f"Vector service: reconnect probe failed ({e})")
            return False

    def upsert(self, points: List[Dict[str, Any]]):
        """Insert or update vectors."""
        if not self._ensure_connected():
            return
        try:
            from qdrant_client.http.models import PointStruct
            formatted = [
                PointStruct(
                    id=p.get("id", hash(str(p))),
                    vector=p.get("vector", []),
                    payload=p.get("payload", {}),
                )
                for p in points
            ]
            self.client.upsert(collection_name=self.collection, points=formatted)
        except Exception as e:
            if self._is_connection_error(e):
                self._available = False
            logger.warning(f"Vector service: Upsert failed: {e}")

    def search(self, vector: List[float], top_k: int = 5) -> List[Dict[str, Any]]:
        """Search for similar vectors."""
        if not vector:
            return []
        if not self._ensure_connected():
            return []
        try:
            # qdrant-client >=1.10 renamed ``search`` -> ``query_points``;
            # newer builds (1.18+) have removed ``search`` entirely.
            if hasattr(self.client, "query_points"):
                resp = self.client.query_points(
                    collection_name=self.collection,
                    query=vector,
                    limit=top_k,
                )
                results = resp.points
            else:
                results = self.client.search(
                    collection_name=self.collection,
                    query_vector=vector,
                    limit=top_k,
                )
            return [
                {"id": r.id, "score": r.score, **r.payload}
                for r in results
            ]
        except Exception as e:
            if self._is_connection_error(e):
                self._available = False
            logger.warning(f"Vector service: Search failed: {e}")
            return []

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

    def delete_collection(self):
        """Delete the collection."""
        if not self._available or not self.client:
            return
        try:
            self.client.delete_collection(collection_name=self.collection)
            self._available = False
        except Exception as e:
            logger.warning(f"Vector service: Delete failed: {e}")


vector_service = VectorService()
