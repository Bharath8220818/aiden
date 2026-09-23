"""Knowledge/RAG endpoints — corpus, retrieval, and document ingestion (§14).

- GET  /knowledge/docs                          → registry corpus
- POST /knowledge/retrieve                      → hybrid retrieval (§9–10)
- POST /knowledge/ingest                        → rebuild vector index
- GET  /knowledge/status                        → infra status
- POST /knowledge/documents                     → §14 upload → ingest
- GET  /knowledge/documents                     → §14 uploaded documents
- POST /knowledge/documents/{source_key}/ingest → §14 re-ingest
- DELETE /knowledge/documents/{source_key}      → §14 delete
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import AuthContext, require_permission
from app.models import KnowledgeDocument
from app.schemas.common import APIModel
from app.services import qdrant_client, rag_service
from app.services.registry_service import RegistryService

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


class RetrieveRequest(APIModel):
    query: str = Field(min_length=1, max_length=2000)
    # Project context (spec §P2.8): scope retrieval to a project's corpus.
    # The global corpus is always included; other projects never leak in.
    projectId: str | None = Field(None, max_length=64)


@router.get("/docs")
async def list_docs(
    ctx: AuthContext = Depends(require_permission("knowledge.read")),
    db: AsyncSession = Depends(get_db),
):
    return await RegistryService(db).knowledge_docs()


@router.post("/retrieve")
async def retrieve(
    payload: RetrieveRequest,
    ctx: AuthContext = Depends(require_permission("knowledge.read")),
    db: AsyncSession = Depends(get_db),
):
    """Semantic retrieval over the knowledge memory (vector; keyword fallback)."""
    results = await rag_service.retrieve(
        db, payload.query, project_id=payload.projectId
    )
    return results


class IngestSummary(APIModel):
    ingested: int
    vectors: int
    mode: str


class IngestRequest(APIModel):
    projectId: str | None = Field(None, max_length=64)
    documents: list[dict] | None = Field(
        None,
        description="Optional extra documents ({id, title, kind, tags, excerpt}) beyond the registry corpus.",
    )


@router.post("/ingest", response_model=IngestSummary)
async def ingest_corpus(
    payload: IngestRequest | None = None,
    ctx: AuthContext = Depends(require_permission("knowledge.write")),
    db: AsyncSession = Depends(get_db),
):
    """(Re)build the vector index from the current knowledge corpus.

    Accepts an optional project scope + extra documents; the deterministic
    point ids make repeated ingests idempotent.
    """
    body = payload or IngestRequest()
    if body.documents:
        summary = await rag_service.ingest_documents(
            db, body.documents, project_id=body.projectId or "global"
        )
    else:
        summary = await rag_service.ingest_registry_knowledge(db)
    return IngestSummary(**summary)


# --------------------------------------------------------------------------- #
# §14 — document upload/management (DB-backed via knowledge_documents)
# --------------------------------------------------------------------------- #
async def _uploaded_documents(db: AsyncSession) -> list[KnowledgeDocument]:
    return list(
        (await db.execute(select(KnowledgeDocument).order_by(KnowledgeDocument.created_at.desc())))
        .scalars()
        .all()
    )


@router.post("/documents")
async def upload_document(
    file: UploadFile = File(...),
    projectId: str | None = Form(None),
    environment: str = Form("development"),
    tags: str = Form(""),
    ctx: AuthContext = Depends(require_permission("knowledge.write")),
    db: AsyncSession = Depends(get_db),
):
    """Upload a document into project knowledge (§14 POST /knowledge/documents).

    Pipeline: loader → cleaner → structure-aware chunker → embed → Qdrant,
    with a knowledge_documents row as source of truth. Works in degraded mode
    (row persisted, mode reported honestly) when Ollama/Qdrant are down.
    """
    from app.ai.rag.sources import documents as doc_source

    content = await file.read()
    if not content:
        raise HTTPException(status_code=422, detail="Uploaded file is empty")
    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else None
    try:
        result = await doc_source.ingest_upload_persistent(
            db,
            filename=file.filename or "document.txt",
            content=content,
            project_id=projectId,
            environment=environment,
            tags=tag_list,
            uploaded_by=str(ctx.user_id) if hasattr(ctx, "user_id") else None,
        )
    except doc_source.LoaderError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return result


@router.get("/documents")
async def list_documents(
    ctx: AuthContext = Depends(require_permission("knowledge.read")),
    db: AsyncSession = Depends(get_db),
):
    docs = await _uploaded_documents(db)
    return [
        {
            "id": str(d.id),
            "sourceKey": d.source_key,
            "title": d.title,
            "kind": d.kind.value if hasattr(d.kind, "value") else str(d.kind),
            "projectId": str(d.project_id) if d.project_id else None,
            "origin": d.origin,
            "tags": d.tags or [],
            "chunkCount": d.chunk_count,
            "ingestedAt": d.ingested_at.isoformat() if d.ingested_at else None,
            "createdAt": d.created_at.isoformat() if d.created_at else None,
        }
        for d in docs
    ]


@router.post("/documents/{source_key:path}/ingest")
async def reingest_document(
    source_key: str,
    ctx: AuthContext = Depends(require_permission("knowledge.write")),
    db: AsyncSession = Depends(get_db),
):
    """Re-run vector indexing for a stored document (e.g. after Ollama returns)."""
    from app.ai.rag.sources import documents as doc_source

    doc = (
        await db.execute(select(KnowledgeDocument).where(KnowledgeDocument.source_key == source_key))
    ).scalar_one_or_none()
    if doc is None or not doc.content:
        raise HTTPException(status_code=404, detail=f"Document '{source_key}' was not found")
    filename = doc.source_key.rsplit(":", 1)[-1] or doc.title
    result = await doc_source.ingest_upload(
        filename=filename,
        content=doc.content.encode("utf-8"),
        project_id=str(doc.project_id) if doc.project_id else None,
        tags=doc.tags or [],
        document_id=doc.source_key,
    )
    if result["vectors"]:
        doc.chunk_count = result["chunks"]
        from datetime import UTC, datetime

        doc.ingested_at = datetime.now(UTC)
        await db.commit()
    return result


@router.delete("/documents/{source_key:path}")
async def delete_document(
    source_key: str,
    ctx: AuthContext = Depends(require_permission("knowledge.write")),
    db: AsyncSession = Depends(get_db),
):
    from app.services import qdrant_client as qc

    doc = (
        await db.execute(select(KnowledgeDocument).where(KnowledgeDocument.source_key == source_key))
    ).scalar_one_or_none()
    if doc is None:
        raise HTTPException(status_code=404, detail=f"Document '{source_key}' was not found")
    await db.delete(doc)
    await db.commit()
    await qc.delete_points_for_doc(source_key)
    return {"deleted": source_key}


@router.get("/status")
async def rag_status(
    ctx: AuthContext = Depends(require_permission("knowledge.read")),
    db: AsyncSession = Depends(get_db),
):
    """Infrastructure status of the memory layer (for the Knowledge page)."""
    embeddings_ready = await ai_available()
    qdrant_ready = await qdrant_client.is_reachable()
    return {
        "embeddings": "ok" if embeddings_ready else "unavailable",
        "vectorStore": "ok" if qdrant_ready else "unavailable",
        "mode": "vector"
        if embeddings_ready and qdrant_ready
        else "keyword-fallback",
        "collection": qdrant_client.COLLECTION,
    }


async def ai_available() -> bool:
    from app.services import ai_client

    return await ai_client.embeddings_available()
