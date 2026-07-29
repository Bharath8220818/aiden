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

        try:
            from qdrant_client import QdrantClient
            self.client = QdrantClient(url=settings.QDRANT_URL, timeout=5.0)
            # Check if collection exists
            collections = self.client.get_collections().collections
            collection_names = [c.name for c in collections]
            if self.collection not in collection_names:
                self._create_collection()
            self._available = True
            logger.info(f"Vector service: Qdrant connected ({settings.QDRANT_URL})")
        except Exception as e:
            logger.warning(f"Vector service: Qdrant unavailable ({e}), using in-memory fallback")
            self._available = False

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

    def upsert(self, points: List[Dict[str, Any]]):
        """Insert or update vectors."""
        if not self._available or not self.client:
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
            logger.warning(f"Vector service: Upsert failed: {e}")

    def search(self, vector: List[float], top_k: int = 5) -> List[Dict[str, Any]]:
        """Search for similar vectors."""
        if not self._available or not self.client or not vector:
            return []
        try:
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
            logger.warning(f"Vector service: Search failed: {e}")
            return []

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
