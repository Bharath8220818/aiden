"""Keyword search (spec §9) — exact terms beat embeddings for technical needles.

Error codes (`ORA-00942`), incident ids (`INC-1024`), table/column names and
pipeline names are better matched lexically than semantically. This scorer is
deterministic (no jitter) and runs over the DB-side corpus so it works even
when Qdrant/Ollama are down.
"""

from __future__ import annotations

import re

from sqlalchemy.ext.asyncio import AsyncSession

# Terms worth exact matching: ids, snake_case identifiers, code-like tokens.
_CODEY_TERM = re.compile(r"^[A-Z]{2,}[-_][\w-]+$|^\w+_\w+$|^\d+$")


def extract_terms(query: str) -> list[str]:
    """Split the query into terms; codey needles keep case (ORA-00942)."""
    terms = []
    for raw in re.findall(r"[\w.-]+", query or ""):
        if len(raw) < 3:
            continue
        if _CODEY_TERM.match(raw):
            terms.append(raw)
        else:
            terms.append(raw.lower())
    return terms


async def keyword_search(
    db: AsyncSession,
    query: str,
    *,
    limit: int = 8,
    project_id: str | None = None,
) -> list[dict]:
    """Score the corpus by term overlap; returns [{score, payload}] hits."""
    from app.services.registry_service import RegistryService

    docs = await RegistryService(db).knowledge_docs()
    if project_id:
        docs = [d for d in docs if d.get("project_id") in (None, project_id, "global")]
    terms = extract_terms(query)
    if not terms:
        return []

    hits: list[dict] = []
    for doc in docs:
        haystack = f"{doc['title']} {doc['excerpt']} {' '.join(doc.get('tags', []))}"
        hits_text = haystack.lower()
        overlap = sum(1 for t in terms if t.lower() in hits_text)
        # Exact codey needles score high on their own (the point of §10).
        exact_bonus = sum(1 for t in terms if _CODEY_TERM.match(t) and t in haystack)
        if overlap == 0 and exact_bonus == 0:
            continue
        base = (overlap + 2 * exact_bonus) / max(len(terms), 1)
        hits.append(
            {
                "score": round(min(base, 1.0), 3),
                "payload": {
                    "doc_id": doc["id"],
                    "doc_title": doc["title"],
                    "kind": doc["kind"],
                    "text": doc["excerpt"],
                    "project_id": doc.get("project_id") or "global",
                    "source_type": doc["kind"],
                },
            }
        )
    hits.sort(key=lambda h: h["score"], reverse=True)
    return hits[:limit]
