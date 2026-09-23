"""Document source — uploaded files become project knowledge (spec §1, §12, §14).

    upload → loader → cleaner → structure-aware chunker → payload → embed → Qdrant
                                                        ↘ KnowledgeDocument rows (source of truth, §13)
"""

from __future__ import annotations

from typing import Any

from app.ai.rag.ingestion.chunker import chunk
from app.ai.rag.ingestion.cleaner import clean_text
from app.ai.rag.ingestion.loader import LoaderError, load_document
from app.ai.rag.ingestion.metadata import build_payload
from app.services import ai_client, qdrant_client


async def ingest_upload(
    *,
    filename: str,
    content: bytes,
    project_id: str | None = None,
    environment: str = "development",
    tags: list[str] | None = None,
    document_id: str | None = None,
) -> dict[str, Any]:
    """Full ingestion for one uploaded file; raises LoaderError for bad input.

    Returns {documentId, chunks, vectors, mode} — honest summary of what was
    actually written.
    """
    from app.core.logging import get_logger

    logger = get_logger("aiden.rag.sources")
    parsed = load_document(filename, content)
    text = clean_text(parsed["text"])
    source_type = "document" if parsed["format"] not in {"sql", "python"} else parsed["format"]
    if parsed["format"] == "sql":
        source_type = "sql"
    pieces = chunk(text, source_type=source_type, title=filename)
    if not pieces:
        return {"documentId": document_id, "chunks": 0, "vectors": 0, "mode": "empty"}

    if not await ai_client.embeddings_available():
        return {"documentId": document_id, "chunks": len(pieces), "vectors": 0, "mode": "no-embedding-model"}
    try:
        vectors = await ai_client.embed([p.text for p in pieces])
    except ai_client.AIServiceError as exc:
        logger.warning("Embedding failed during upload ingest: %s", exc)
        return {"documentId": document_id, "chunks": len(pieces), "vectors": 0, "mode": "embed-failed"}
    if not await qdrant_client.ensure_collection(len(vectors[0])):
        return {"documentId": document_id, "chunks": len(pieces), "vectors": 0, "mode": "qdrant-unavailable"}

    doc_id = document_id or f"upload-{abs(hash((filename, len(content)))) % 10**10}"
    await qdrant_client.delete_points_for_doc(doc_id)  # re-upload replaces
    points = [
        {
            "id": qdrant_client.point_id_for(doc_id, piece.index),
            "vector": vector,
            "payload": build_payload(
                project_id=project_id,
                source_type=source_type,
                document_id=doc_id,
                chunk_id=f"{doc_id}:{piece.index}",
                environment=environment,
                tags=tags,
                title=filename,
                text=piece.text,
                section=piece.section,
                extra={"format": parsed["format"]},
            ),
        }
        for piece, vector in zip(pieces, vectors, strict=True)
    ]
    written = await qdrant_client.upsert_points(points)
    return {
        "documentId": doc_id,
        "chunks": len(pieces),
        "vectors": written,
        "mode": "indexed" if written else "qdrant-write-failed",
    }


async def ingest_upload_persistent(
    db: Any,
    *,
    filename: str,
    content: bytes,
    project_id: str | None = None,
    environment: str = "development",
    tags: list[str] | None = None,
    uploaded_by: str | None = None,
) -> dict[str, Any]:
    """§14 ingestion with DB persistence (knowledge_documents, §13).

    Same pipeline as `ingest_upload`, plus a `knowledge_documents` row as the
    source of truth. When vectors can't be written (no Ollama/Qdrant) the row
    still exists with mode='<degraded>' so the doc can be re-ingested later
    (POST /knowledge/documents/{source_key}/ingest).
    """
    import uuid as uuid_mod

    from sqlalchemy import select

    from app.models import DocKind, KnowledgeDocument

    # Idempotency: same project + filename replaces the previous upload.
    source_key = f"upload:{project_id or 'global'}:{filename}"
    existing = (
        await db.execute(
            select(KnowledgeDocument).where(KnowledgeDocument.source_key == source_key)
        )
    ).scalar_one_or_none()

    result = await ingest_upload(
        filename=filename,
        content=content,
        project_id=project_id,
        environment=environment,
        tags=tags,
        document_id=existing.source_key if existing else None,
    )

    kind = DocKind.runbook
    name = (filename or "document").rsplit(".", 1)[0][:255]
    if result["mode"] in {"empty"} and not result["chunks"]:
        raise LoaderError(f"Could not extract any chunks from '{filename}'")

    if existing is None:
        doc = KnowledgeDocument(
            project_id=uuid_mod.UUID(project_id) if project_id else None,
            source_key=source_key,
            title=name,
            kind=kind,
            origin="upload",
            content=clean_text(load_document(filename, content)["text"])[:100_000],
            tags=tags or [],
            chunk_count=result["chunks"],
            ingested_at=datetime_now() if result["vectors"] else None,
        )
        db.add(doc)
    else:
        doc = existing
        doc.chunk_count = result["chunks"]
        doc.tags = tags or doc.tags or []
        doc.ingested_at = datetime_now() if result["vectors"] else None
    await db.commit()
    result["documentRowId"] = str(doc.id)
    result["documentId"] = doc.source_key
    return result


def datetime_now():
    from datetime import UTC, datetime

    return datetime.now(UTC)


__all__ = ["ingest_upload", "ingest_upload_persistent", "LoaderError"]
