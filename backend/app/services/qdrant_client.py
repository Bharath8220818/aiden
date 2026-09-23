"""Minimal async Qdrant REST client — collection + vector ops for the RAG layer.

Uses httpx directly (no extra dependency): Qdrant's REST API is simple and the
backend already ships httpx. All helpers are failure-tolerant — the RAG layer
degrades to keyword search when Qdrant is unreachable, so none of these raise
for *infrastructure* problems; they return empty results / False instead.
"""

from __future__ import annotations

import uuid

import httpx

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("aiden.qdrant")

COLLECTION = "aiden_knowledge"
DEFAULT_VECTOR_SIZE = 768  # nomic-embed-text dimension

_TIMEOUT = httpx.Timeout(10.0, connect=3.0)


def qdrant_base_url() -> str | None:
    url = get_settings().QDRANT_URL
    return url.rstrip("/") if url else None


def _client() -> httpx.AsyncClient:
    return httpx.AsyncClient(timeout=_TIMEOUT)


async def is_reachable() -> bool:
    base = qdrant_base_url()
    if not base:
        return False
    try:
        async with _client() as client:
            resp = await client.get(f"{base}/healthz")
            return resp.status_code < 500
    except Exception:
        return False


async def ensure_collection(vector_size: int = DEFAULT_VECTOR_SIZE) -> bool:
    """Create the knowledge collection when missing. True when usable."""
    base = qdrant_base_url()
    if not base:
        return False
    try:
        async with _client() as client:
            resp = await client.get(f"{base}/collections/{COLLECTION}")
            if resp.status_code == 200:
                return True
            if resp.status_code != 404:
                logger.warning("Qdrant collection probe returned %s", resp.status_code)
                return False
            created = await client.put(
                f"{base}/collections/{COLLECTION}",
                json={
                    "vectors": {"size": vector_size, "distance": "Cosine"},
                    # Payload indexes speed the scoped filters used at query time.
                    "payload_schema": {
                        "doc_id": "keyword",
                        "kind": "keyword",
                        "project_id": "keyword",
                    },
                },
            )
            if created.status_code not in (200, 201):
                logger.warning("Qdrant collection create failed: %s", created.text[:200])
                return False
            return True
    except Exception:
        logger.warning("Qdrant unreachable — RAG degrades to keyword search", exc_info=True)
        return False


async def upsert_points(points: list[dict]) -> int:
    """Upsert points: [{id, vector, payload}]. Returns count written (0 on failure)."""
    base = qdrant_base_url()
    if not base or not points:
        return 0
    try:
        async with _client() as client:
            resp = await client.put(
                f"{base}/collections/{COLLECTION}/points",
                json={"points": points},
                params={"wait": "true"},
            )
            if resp.status_code not in (200, 201):
                logger.warning("Qdrant upsert failed: %s", resp.text[:200])
                return 0
            return len(points)
    except Exception:
        logger.warning("Qdrant upsert failed", exc_info=True)
        return 0


async def delete_points_for_doc(doc_id: str) -> bool:
    """Remove every chunk belonging to a source document (idempotent)."""
    base = qdrant_base_url()
    if not base:
        return False
    try:
        async with _client() as client:
            resp = await client.post(
                f"{base}/collections/{COLLECTION}/points/delete",
                json={"filter": {"must": [{"key": "doc_id", "match": {"value": doc_id}}]}},
                params={"wait": "true"},
            )
            return resp.status_code in (200, 201)
    except Exception:
        return False


async def search(
    vector: list[float],
    *,
    limit: int = 5,
    project_id: str | None = None,
    include_global: bool = True,
) -> list[dict]:
    """Nearest-neighbour search. Returns [{id, score, payload}] (empty on failure).

    With `project_id`, results are scoped to that project **plus** the global
    (`project_id="global"`) corpus when `include_global` — one project's
    knowledge never leaks into another's context (spec §P2.8).
    """
    base = qdrant_base_url()
    if not base:
        return []
    body: dict = {
        "vector": vector,
        "limit": limit,
        "with_payload": True,
    }
    if project_id:
        should = [{"key": "project_id", "match": {"value": project_id}}]
        if include_global:
            should.append({"key": "project_id", "match": {"value": "global"}})
        body["filter"] = {"should": should}
    try:
        async with _client() as client:
            resp = await client.post(
                f"{base}/collections/{COLLECTION}/points/search", json=body
            )
            if resp.status_code != 200:
                logger.warning("Qdrant search failed: %s", resp.text[:200])
                return []
            return [
                {
                    "id": hit.get("id"),
                    "score": hit.get("score", 0.0),
                    "payload": hit.get("payload", {}),
                }
                for hit in resp.json().get("result", [])
            ]
    except Exception:
        logger.warning("Qdrant search failed", exc_info=True)
        return []


def point_id_for(doc_id: str, chunk_index: int) -> str:
    """Deterministic point UUID per (doc, chunk) — re-ingestion overwrites."""
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"aiden:{COLLECTION}:{doc_id}:{chunk_index}"))
