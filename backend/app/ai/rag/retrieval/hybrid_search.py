"""Hybrid search (spec §9) — fuse semantic + keyword hits via Reciprocal Rank Fusion.

RRF is rank-based, so it needs no score calibration between the vector and
lexical channels: `score = Σ 1/(k + rank)` with k=60 (standard constant).
Runs both channels and tolerates either being unavailable.
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.rag.retrieval import keyword_search, vector_search

RRF_K = 60


def _hit_key(hit: dict) -> str:
    payload = hit.get("payload", {})
    return f"{payload.get('doc_id', 'unknown')}:{payload.get('chunk_index', 0)}"


def fuse(
    vector_hits: list[dict],
    keyword_hits: list[dict],
    *,
    k: int = RRF_K,
) -> list[dict]:
    """Merge two ranked hit lists into one (RRF); keeps the richer payload."""
    combined: dict[str, dict] = {}
    for channel in (vector_hits, keyword_hits):
        for rank, hit in enumerate(channel):
            key = _hit_key(hit)
            contribution = 1.0 / (k + rank + 1)
            if key in combined:
                combined[key]["rrf_score"] += contribution
                # keep the payload with more text/context
                if len(str(hit.get("payload", {}).get("text", ""))) > len(
                    str(combined[key]["payload"].get("text", ""))
                ):
                    combined[key]["payload"] = hit["payload"]
            else:
                combined[key] = {
                    "rrf_score": contribution,
                    "vector_score": hit.get("score") if channel is vector_hits else None,
                    "payload": hit.get("payload", {}),
                }
    fused = sorted(combined.values(), key=lambda h: h["rrf_score"], reverse=True)
    return fused


async def hybrid_search(
    db: AsyncSession,
    query: str,
    *,
    limit: int = 8,
    project_id: str | None = None,
    source_type: str | None = None,
) -> tuple[list[dict], str]:
    """Semantic ∪ keyword, RRF-fused; falls back cleanly to whichever channel works.

    Returns (hits, mode) where mode honestly names what actually produced the
    hits: "hybrid" (both channels), "vector"/"keyword" (single channel), or
    "empty" — so callers never claim semantic search they didn't do.
    """
    vector_hits = await vector_search.vector_search(
        query, limit=limit, project_id=project_id, source_type=source_type
    )
    keyword_hits = await keyword_search.keyword_search(
        db, query, limit=limit, project_id=project_id
    )

    if vector_hits and not keyword_hits:
        return (
            [
                {**h, "rrf_score": h.get("score", 0.0), "payload": h.get("payload", {})}
                for h in vector_hits
            ][:limit],
            "vector",
        )
    if not vector_hits and keyword_hits:
        return fuse(vector_hits, keyword_hits)[:limit], "keyword"
    if not vector_hits and not keyword_hits:
        return [], "empty"
    return fuse(vector_hits, keyword_hits)[:limit], "hybrid"
