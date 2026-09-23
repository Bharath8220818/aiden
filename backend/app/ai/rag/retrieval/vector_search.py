"""Vector search (spec §10) — query embedding → Qdrant nearest neighbours."""

from __future__ import annotations

from app.services import ai_client, qdrant_client


async def vector_search(
    query: str,
    *,
    limit: int = 8,
    project_id: str | None = None,
    source_type: str | None = None,
) -> list[dict]:
    """Return [{score, payload}] hits, empty when the stack is unavailable."""
    if not await ai_client.embeddings_available():
        return []
    try:
        [query_vector] = await ai_client.embed([query.strip()])
    except ai_client.AIServiceError:
        return []
    if not await qdrant_client.ensure_collection(len(query_vector)):
        return []
    hits = await qdrant_client.search(query_vector, limit=limit, project_id=project_id)
    if source_type:
        hits = [h for h in hits if h["payload"].get("source_type") == source_type]
    return hits
