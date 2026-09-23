"""Context builder (spec §11) — the bridge between RAG and the agents.

Turns reranked hits into the RETRIEVED KNOWLEDGE block of the agent prompt:

    SYSTEM
    You are AIDEN Debug Agent.
    PROJECT CONTEXT
    Project: Sales Analytics
    RETRIEVED KNOWLEDGE
    [1] (kind, score) text …
"""

from __future__ import annotations

from typing import Any


def build_context(
    hits: list[dict],
    *,
    project: str | None = None,
    current_error: str | None = None,
    max_chars: int = 3500,
) -> str:
    """Compose the RETRIEVED KNOWLEDGE prompt block from reranked hits."""
    blocks: list[str] = []
    if project:
        blocks.append(f"PROJECT CONTEXT\nProject: {project}")
    knowledge: list[str] = []
    used = 0
    for i, hit in enumerate(hits, start=1):
        payload = hit.get("payload", {})
        title = payload.get("doc_title") or payload.get("title") or "Knowledge"
        text = (payload.get("text") or "").strip()
        if not text:
            continue
        kind = payload.get("source_type") or payload.get("kind") or "document"
        score = hit.get("rerank_score") or hit.get("rrf_score") or hit.get("score") or 0
        entry = f"[{i}] ({kind}, relevance {float(score):.2f}) {title}: {text}"
        if used + len(entry) > max_chars:
            break  # context compression: hard cap on prompt budget
        knowledge.append(entry)
        used += len(entry)
    if knowledge:
        blocks.append("RETRIEVED KNOWLEDGE\n" + "\n".join(knowledge))
    if current_error:
        blocks.append(f"CURRENT ERROR\n{current_error.strip()}")
    return "\n\n".join(blocks)


def citations_from(hits: list[dict]) -> list[dict[str, Any]]:
    """UI-facing citations ({docId, docTitle, kind, score, content, ts})."""
    from app.services.rag_service import datetime_now_iso

    ts = datetime_now_iso()
    return [
        {
            "docId": h.get("payload", {}).get("doc_id", "unknown"),
            "docTitle": h.get("payload", {}).get("doc_title", "Untitled"),
            "kind": h.get("payload", {}).get("source_type")
            or h.get("payload", {}).get("kind", "document"),
            "score": round(float(h.get("rerank_score") or h.get("rrf_score") or h.get("score") or 0), 3),
            "content": (h.get("payload", {}).get("text") or "")[:500],
            "ts": ts,
        }
        for h in hits
    ]
