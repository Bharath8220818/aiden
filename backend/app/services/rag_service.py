"""RAG memory layer — chunk → embed → store → retrieve, with keyword fallback.

Pipeline (spec §16):

    documents (knowledge docs, incident fixes, data contracts)
      → chunking
      → embeddings (Ollama nomic-embed-text, 768-d)
      → Qdrant collection `aiden_knowledge`
      → vector retrieval
      → agent context

Degradation contract: when Ollama or Qdrant is unavailable, retrieval falls
back to the deterministic keyword scorer from RegistryService — the endpoint
shape never changes, the frontend never breaks (same pattern as ai_client).
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.services import ai_client, qdrant_client
from app.services.registry_service import RegistryService

logger = get_logger("aiden.rag")

# Chunking — small, overlapping chunks retrieve best for technical prose.
CHUNK_SIZE = 900
CHUNK_OVERLAP = 150
TOP_K = 5


@dataclass(frozen=True)
class KnowledgeChunk:
    doc_id: str
    doc_title: str
    kind: str
    chunk_index: int
    text: str


def chunk_text(text: str, *, size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """Legacy sliding-window chunker (kept for compatibility + tests).

    New code should prefer `app.ai.rag.ingestion.chunker.chunk`, which is
    structure-aware (§5 strategies per source type).
    """
    text = (text or "").strip()
    if not text:
        return []
    if len(text) <= size:
        return [text]
    chunks: list[str] = []
    step = max(size - overlap, 1)
    for start in range(0, len(text), step):
        piece = text[start : start + size].strip()
        if piece:
            chunks.append(piece)
        if start + size >= len(text):
            break
    return chunks


def chunk_documents(docs: list[dict]) -> list[KnowledgeChunk]:
    """Split registry docs into chunks (title + tags prepended for recall)."""
    out: list[KnowledgeChunk] = []
    for doc in docs:
        body = f"{doc['title']}\n[{' | '.join(doc.get('tags', []))}]\n{doc['excerpt']}"
        for i, piece in enumerate(chunk_text(body)):
            out.append(
                KnowledgeChunk(
                    doc_id=doc["id"],
                    doc_title=doc["title"],
                    kind=doc["kind"],
                    chunk_index=i,
                    text=piece,
                )
            )
    return out


async def ingest_documents(
    db: AsyncSession,
    docs: list[dict],
    *,
    project_id: str = "global",
) -> dict:
    """Ingest arbitrary documents ({id, title, kind, tags, excerpt}) into Qdrant.

    The retrieval scoping boundary is `project_id`: corpus rows tagged with a
    project are retrievable only for that project (+ global). Idempotent via
    deterministic point ids.
    """
    chunks = chunk_documents(docs)
    if not chunks:
        return {"ingested": 0, "vectors": 0, "mode": "empty"}
    if not await ai_client.embeddings_available():
        return {"ingested": len(docs), "vectors": 0, "mode": "no-embedding-model"}
    try:
        vectors = await ai_client.embed([c.text for c in chunks])
    except ai_client.AIServiceError as exc:
        logger.warning("Embedding failed during ingest: %s", exc)
        return {"ingested": len(docs), "vectors": 0, "mode": "embed-failed"}
    if not await qdrant_client.ensure_collection(vector_size=len(vectors[0])):
        return {"ingested": len(docs), "vectors": 0, "mode": "qdrant-unavailable"}

    points = [
        {
            "id": qdrant_client.point_id_for(c.doc_id, c.chunk_index),
            "vector": vector,
            "payload": {
                "doc_id": c.doc_id,
                "doc_title": c.doc_title,
                "kind": c.kind,
                "chunk_index": c.chunk_index,
                "text": c.text,
                "project_id": project_id,
            },
        }
        for c, vector in zip(chunks, vectors, strict=True)
    ]
    written = await qdrant_client.upsert_points(points)
    return {
        "ingested": len(docs),
        "vectors": written,
        "mode": "vector" if written else "qdrant-write-failed",
    }


async def ingest_registry_knowledge(db: AsyncSession) -> dict:
    """Ingest the current knowledge corpus into the vector store.

    Returns a summary dict — safe to call repeatedly (idempotent point ids).
    """
    docs = await RegistryService(db).knowledge_docs()
    chunks = chunk_documents(docs)
    if not chunks:
        return {"ingested": 0, "vectors": 0, "mode": "empty"}

    if not await ai_client.embeddings_available():
        return {"ingested": len(docs), "vectors": 0, "mode": "no-embedding-model"}

    try:
        vectors = await ai_client.embed([c.text for c in chunks])
    except ai_client.AIServiceError as exc:
        logger.warning("Embedding failed during ingest: %s", exc)
        return {"ingested": len(docs), "vectors": 0, "mode": "embed-failed"}

    if not await qdrant_client.ensure_collection(vector_size=len(vectors[0])):
        return {"ingested": len(docs), "vectors": 0, "mode": "qdrant-unavailable"}

    points = [
        {
            "id": qdrant_client.point_id_for(c.doc_id, c.chunk_index),
            "vector": vector,
            "payload": {
                "doc_id": c.doc_id,
                "doc_title": c.doc_title,
                "kind": c.kind,
                "chunk_index": c.chunk_index,
                "text": c.text,
                "project_id": "global",  # registry corpus is workspace-wide
            },
        }
        for c, vector in zip(chunks, vectors, strict=True)
    ]
    written = await qdrant_client.upsert_points(points)
    return {
        "ingested": len(docs),
        "vectors": written,
        "mode": "vector" if written else "qdrant-write-failed",
    }


async def retrieve(
    db: AsyncSession,
    query: str,
    *,
    limit: int = TOP_K,
    project_id: str | None = None,
) -> list[dict]:
    """Vector retrieval with graceful keyword fallback.

    Returns citation dicts shaped exactly like the existing frontend contract:
    [{docId, docTitle, kind, score, content, ts}]. With `project_id`, results
    are scoped to that project's corpus (+ the global corpus) so one project's
    knowledge never leaks into another's context.
    """
    if not query.strip():
        return []

    mode = "keyword"
    hits: list[dict] = []

    if await ai_client.embeddings_available():
        try:
            [query_vector] = await ai_client.embed([query.strip()])
            if await qdrant_client.ensure_collection(len(query_vector)):
                raw = await qdrant_client.search(
                    query_vector, limit=limit, project_id=project_id
                )
                hits = [
                    {
                        "docId": h["payload"].get("doc_id", "unknown"),
                        "docTitle": h["payload"].get("doc_title", "Untitled"),
                        "kind": h["payload"].get("kind", "document"),
                        "score": round(float(h["score"]), 3),
                        "content": h["payload"].get("text", ""),
                    }
                    for h in raw
                ]
                mode = "vector"
        except ai_client.AIServiceError as exc:
            logger.info("Vector retrieval unavailable (%s) — using keyword fallback", exc)

    if mode == "keyword":
        scored = await RegistryService(db).knowledge_retrieve(query)
        return scored[:limit]

    # Enrich citations with doc metadata and timestamps for the UI.
    docs = {d["id"]: d for d in await RegistryService(db).knowledge_docs()}
    now_iso = datetime_now_iso()
    return [
        {
            **hit,
            "content": hit["content"] or docs.get(hit["docId"], {}).get("excerpt", ""),
            "ts": now_iso,
            "mode": mode,
        }
        for hit in hits
    ][:limit]


def datetime_now_iso() -> str:
    from datetime import UTC, datetime

    return datetime.now(UTC).isoformat()


async def ingest_incident_fix(
    db: AsyncSession,
    *,
    incident_id: uuid.UUID,
    title: str,
    pipeline: str,
    root_cause: str,
    fix_summary: str,
    project_id: str | None = None,
) -> dict:
    """Write a resolved incident's fix into memory — 'previous fixes' (spec §16).

    Called from the healing loop on resolve so AIDEN can later answer
    "Have we seen this failure before?".
    """
    doc_id = f"incident-fix-{incident_id}"
    body = (
        f"Incident: {title}\nPipeline: {pipeline}\n"
        f"Root cause: {root_cause}\nFix applied: {fix_summary}"
    )
    chunks = [
        KnowledgeChunk(
            doc_id=doc_id, doc_title=f"Fix: {title}", kind="incident_fix", chunk_index=i, text=t
        )
        for i, t in enumerate(chunk_text(body))
    ]
    if not chunks or not await ai_client.embeddings_available():
        return {"stored": False, "reason": "embeddings-unavailable"}

    try:
        vectors = await ai_client.embed([c.text for c in chunks])
    except ai_client.AIServiceError:
        return {"stored": False, "reason": "embed-failed"}

    if not await qdrant_client.ensure_collection(len(vectors[0])):
        return {"stored": False, "reason": "qdrant-unavailable"}

    await qdrant_client.delete_points_for_doc(doc_id)  # idempotent re-heals
    written = await qdrant_client.upsert_points(
        [
            {
                "id": qdrant_client.point_id_for(doc_id, c.chunk_index),
                "vector": v,
                "payload": {
                    "doc_id": doc_id,
                    "doc_title": c.doc_title,
                    "kind": c.kind,
                    "chunk_index": c.chunk_index,
                    "text": c.text,
                    "incident_id": str(incident_id),
                    "project_id": project_id or "global",
                },
            }
            for c, v in zip(chunks, vectors, strict=True)
        ]
    )
    return {"stored": written > 0, "vectors": written}
