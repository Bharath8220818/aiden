"""Incident/fix memory writer — the closed loop's learn step (spec §12).

Called when a healing run resolves: the incident (error → root cause → fix →
result) is chunked with the incident strategy and embedded into the
project-scoped store so AIDEN can later answer "have we seen this before?".
"""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.rag.ingestion.chunker import chunk
from app.ai.rag.ingestion.metadata import build_payload
from app.core.logging import get_logger
from app.services import ai_client, qdrant_client

logger = get_logger("aiden.rag.sources")


async def store_incident_fix(
    db: AsyncSession,
    *,
    incident_id: uuid.UUID,
    title: str,
    pipeline: str,
    root_cause: str,
    fix_summary: str,
    resolution: str | None = None,
    project_id: str | None = None,
    environment: str = "development",
) -> dict[str, Any]:
    """Embed one resolved incident; idempotent per incident (doc deletion first)."""
    doc_id = f"incident-fix-{incident_id}"
    body = (
        f"Incident: {title}\n"
        f"Pipeline: {pipeline}\n"
        f"Error: {root_cause}\n"
        f"Root cause: {root_cause}\n"
        f"Fix: {fix_summary}\n"
        f"Result: {resolution or 'Resolved via AIDEN self-healing loop.'}"
    )
    pieces = chunk(body, source_type="incident", title=f"Fix: {title}")
    if not pieces:
        return {"stored": False, "reason": "empty"}

    if not await ai_client.embeddings_available():
        return {"stored": False, "reason": "embeddings-unavailable"}
    try:
        vectors = await ai_client.embed([p.text for p in pieces])
    except ai_client.AIServiceError:
        return {"stored": False, "reason": "embed-failed"}
    if not await qdrant_client.ensure_collection(len(vectors[0])):
        return {"stored": False, "reason": "qdrant-unavailable"}

    await qdrant_client.delete_points_for_doc(doc_id)  # idempotent re-heals
    points = [
        {
            "id": qdrant_client.point_id_for(doc_id, piece.index),
            "vector": vector,
            "payload": build_payload(
                project_id=project_id,
                source_type="incident_fix",
                source_id=f"INC-{str(incident_id)[:8]}",
                document_id=doc_id,
                chunk_id=f"{doc_id}:{piece.index}",
                environment=environment,
                title=f"Fix: {title}",
                text=piece.text,
                section=piece.section,
                extra={"incident_id": str(incident_id), "pipeline": pipeline},
            ),
        }
        for piece, vector in zip(pieces, vectors, strict=True)
    ]
    written = await qdrant_client.upsert_points(points)
    if written:
        logger.info("Stored incident fix %s into RAG memory (%d chunks)", doc_id, written)
    return {"stored": written > 0, "vectors": written}
