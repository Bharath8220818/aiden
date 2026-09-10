"""AIDEN VectorStore — Qdrant wrapper with DB persistence and in-memory fallback.

Three-tier storage strategy:
1. Qdrant (primary) — when QDRANT_ENABLED and the server is reachable
2. PostgreSQL/SQLite ``embeddings`` table — durable record of every chunk
3. In-memory cosine search — dev fallback when neither backend is available
"""
import hashlib
import logging
import uuid
from typing import List, Optional

from app.config import settings

logger = logging.getLogger(__name__)

try:
    from qdrant_client import QdrantClient
    from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue
    QDRANT_AVAILABLE = True
except ImportError:
    QDRANT_AVAILABLE = False

try:
    from sentence_transformers import SentenceTransformer
    ST_AVAILABLE = True
    _st_model = None  # lazy singleton
except ImportError:
    ST_AVAILABLE = False


def _get_embedder():
    """Return a local sentence-transformers embedder, loading it lazily."""
    global _st_model
    if _st_model is None and ST_AVAILABLE:
        try:
            _st_model = SentenceTransformer(settings.EMBEDDING_MODEL)
        except Exception as e:
            logger.warning(f"Failed to load embedding model: {e}")
    return _st_model


class VectorStore:
    """Embed + store + search project knowledge vectors."""

    COLLECTION = "aiden_embeddings"

    def __init__(self):
        self._qdrant: Optional["QdrantClient"] = None
        self._memory: List[dict] = []
        self._ensure_qdrant()

    # ── Backend setup ───────────────────────────────────────────────────

    def _ensure_qdrant(self):
        if not settings.QDRANT_ENABLED or not QDRANT_AVAILABLE:
            return
        try:
            host, port = self._parse_url(settings.QDRANT_URL)
            self._qdrant = QdrantClient(host=host, port=port, timeout=3)
            collections = [c.name for c in self._qdrant.get_collections().collections]
            if self.COLLECTION not in collections:
                self._qdrant.create_collection(
                    collection_name=self.COLLECTION,
                    vectors_config=VectorParams(size=self._dim(), distance=Distance.COSINE),
                )
            logger.info(f"VectorStore: Qdrant connected ({settings.QDRANT_URL})")
        except Exception as e:
            logger.warning(f"VectorStore: Qdrant unavailable ({e}) — DB + memory fallback")
            self._qdrant = None

    @staticmethod
    def _parse_url(url: str):
        url = url.replace("http://", "").replace("https://", "").rstrip("/")
        host, _, port = url.partition(":")
        return host or "127.0.0.1", int(port or 6333)

    @staticmethod
    def _dim() -> int:
        """Embedding dimension — 384 for MiniLM, 1536 for OpenAI ada-002."""
        model = (settings.EMBEDDING_MODEL or "").lower()
        if "minilm" in model or "all-mpnet" not in model and "mini" in model:
            return 384
        if "ada" in model or "openai" in model or "text-embedding" in model:
            return 1536
        return 384

    # ── Embedding ───────────────────────────────────────────────────────

    def embed_text(self, text: str) -> List[float]:
        model = _get_embedder()
        if model:
            return list(map(float, model.encode(text)))
        # Deterministic hash fallback so the system still works without ML deps
        return self._hash_embedding(text)

    @staticmethod
    def _hash_embedding(text: str) -> List[float]:
        """Deterministic pseudo-embedding from hashing (no ML deps needed)."""
        import math
        vec = [0.0] * 384
        for i in range(0, len(text), 4):
            chunk = text[i:i + 4]
            h = int(hashlib.md5(chunk.encode()).hexdigest(), 16)
            vec[h % 384] += 1.0
        norm = math.sqrt(sum(v * v for v in vec)) or 1.0
        return [v / norm for v in vec]

    # ── Upsert ──────────────────────────────────────────────────────────

    async def upsert(
        self,
        content: str,
        project_id: Optional[int] = None,
        source_type: str = "doc",
        source_ref: Optional[str] = None,
        meta: Optional[dict] = None,
    ) -> dict:
        """Embed a chunk and store it in Qdrant + the embeddings table."""
        vector = self.embed_text(content)
        content_hash = hashlib.sha256(content.encode()).hexdigest()
        point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, content_hash))  # deterministic

        payload = {
            "project_id": project_id,
            "source_type": source_type,
            "source_ref": source_ref,
            "content": content[:2000],
            "meta": meta or {},
        }

        # 1. Qdrant
        if self._qdrant:
            try:
                self._qdrant.upsert(
                    collection_name=self.COLLECTION,
                    points=[PointStruct(vector=vector, id=point_id, payload=payload)],
                )
            except Exception as e:
                logger.warning(f"Qdrant upsert failed: {e}")

        # 2. Embeddings table (durable record; dedup on content hash)
        try:
            from sqlalchemy import select
            from app.database import AsyncSessionLocal
            from app.models.embedding import Embedding
            async with AsyncSessionLocal() as db:
                existing = await db.execute(
                    select(Embedding).where(Embedding.content_hash == content_hash)
                )
                if existing.scalar_one_or_none() is None:
                    db.add(Embedding(
                        project_id=project_id,
                        source_type=source_type,
                        source_ref=source_ref,
                        content=content,
                        embedding=vector,
                        meta=meta or {},
                        content_hash=content_hash,
                    ))
                    await db.commit()
        except Exception as e:
            logger.warning(f"Embedding DB persist failed: {e}")

        # 3. In-memory mirror
        self._memory.append({"id": point_id, "vector": vector, "payload": payload})

        return {"id": point_id, "dim": len(vector), "backend": "qdrant" if self._qdrant else "db+memory"}

    # ── Search ──────────────────────────────────────────────────────────

    async def search(
        self,
        query: str,
        project_id: Optional[int] = None,
        top_k: int = 5,
        source_type: Optional[str] = None,
    ) -> List[dict]:
        """Semantic search; tries Qdrant, then DB cosine, then memory."""
        query_vector = self.embed_text(query)

        # 1. Qdrant
        if self._qdrant:
            try:
                must = []
                if project_id is not None:
                    must.append(FieldCondition(key="project_id", match=MatchValue(value=project_id)))
                if source_type:
                    must.append(FieldCondition(key="source_type", match=MatchValue(value=source_type)))
                flt = Filter(must=must) if must else None
                hits = self._qdrant.search(
                    collection_name=self.COLLECTION,
                    query_vector=query_vector,
                    limit=top_k,
                    query_filter=flt,
                )
                return [
                    {"score": float(h.score), "payload": h.payload, "id": h.id}
                    for h in hits
                ]
            except Exception as e:
                logger.warning(f"Qdrant search failed, falling back: {e}")

        # 2/3. DB cosine then memory cosine (same code path — memory holds the same payloads)
        candidates = list(self._memory)
        try:
            from sqlalchemy import select
            from app.database import AsyncSessionLocal
            from app.models.embedding import Embedding
            async with AsyncSessionLocal() as db:
                q = select(Embedding)
                if project_id is not None:
                    q = q.where(Embedding.project_id == project_id)
                if source_type:
                    q = q.where(Embedding.source_type == source_type)
                q = q.order_by(Embedding.created_at.desc()).limit(500)
                rows = (await db.execute(q)).scalars().all()
                for r in rows:
                    if r.embedding:
                        candidates.append({
                            "id": str(r.id),
                            "vector": r.embedding,
                            "payload": {
                                "project_id": r.project_id,
                                "source_type": r.source_type,
                                "source_ref": r.source_ref,
                                "content": r.content,
                                "meta": r.meta or {},
                            },
                        })
        except Exception as e:
            logger.debug(f"Embedding DB load failed: {e}")

        scored = []
        for c in candidates:
            score = self._cosine(query_vector, c["vector"])
            if score >= settings.RAG_MIN_SCORE:
                scored.append({"score": round(score, 4), "payload": c["payload"], "id": c["id"]})
        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:top_k]

    @staticmethod
    def _cosine(a: List[float], b: List[float]) -> float:
        if not a or not b or len(a) != len(b):
            return 0.0
        dot = sum(x * y for x, y in zip(a, b))
        na = sum(x * x for x in a) ** 0.5
        nb = sum(x * x for x in b) ** 0.5
        return dot / (na * nb) if na and nb else 0.0

    # ── Introspection ───────────────────────────────────────────────────

    def stats(self) -> dict:
        qdrant_count = None
        if self._qdrant:
            try:
                info = self._qdrant.get_collection(self.COLLECTION)
                qdrant_count = info.points_count
            except Exception:
                pass
        return {
            "backend": "qdrant" if self._qdrant else "db+memory",
            "qdrant_points": qdrant_count,
            "memory_points": len(self._memory),
            "collection": self.COLLECTION,
            "embedding_model": settings.EMBEDDING_MODEL,
        }
