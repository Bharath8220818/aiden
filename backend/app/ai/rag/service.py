"""RAG service facade (spec §2 service.py) — the stable entry point for agents.

Agents and the API consume `retrieve_context()` / `retrieve()`; neither talks
to Qdrant directly. `retrieve()` preserves the legacy citation contract
([{docId, docTitle, kind, score, content, ts}]) so the frontend and the
existing workspace knowledge intent keep working; `retrieve_context()`
returns the richer hybrid result + prompt block for agents (§11).
"""

from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.rag.retrieval import context_builder, hybrid_search, reranker
from app.core.logging import get_logger

logger = get_logger("aiden.rag.service")

TOP_K = 5


async def retrieve_context(
    db: AsyncSession,
    query: str,
    *,
    project_id: str | None = None,
    source_type: str | None = None,
    top_k: int = TOP_K,
    current_error: str | None = None,
    project_name: str | None = None,
) -> dict[str, Any]:
    """Hybrid retrieve → rerank → {citations, context, mode} for an agent turn."""
    fused, mode = await hybrid_search.hybrid_search(
        db,
        query,
        limit=max(top_k * 3, 8),
        project_id=project_id,
        source_type=source_type,
    )
    top = await reranker.rerank(query, fused, top_k=top_k)
    return {
        "citations": context_builder.citations_from(top),
        "context": context_builder.build_context(
            top, project=project_name, current_error=current_error
        ),
        "mode": mode,
    }


async def retrieve(
    db: AsyncSession,
    query: str,
    *,
    limit: int = TOP_K,
    project_id: str | None = None,
) -> list[dict]:
    """Legacy citation contract (frontend `/knowledge/retrieve` shape)."""
    from app.services import rag_service as legacy

    # Hybrid-first; the legacy keyword fallback inside rag_service remains the
    # degradation path when nothing is indexed/available.
    result = await retrieve_context(db, query, project_id=project_id, top_k=limit)
    if result["citations"]:
        return result["citations"]
    return await legacy.retrieve(db, query, limit=limit, project_id=project_id)
