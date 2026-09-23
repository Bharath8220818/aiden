"""Reranker (spec §10) — reorder fused hits by query-specific relevance.

Deterministic heuristic first (term coverage in the chunk, section/title
match, recency), optionally refined by the LLM listwise reranker when the
model backend is configured. The heuristic always runs so retrieval stays
deterministic in tests and honest in degraded environments.
"""

from __future__ import annotations

import re

from app.ai.rag.retrieval.keyword_search import extract_terms


def heuristic_rerank(query: str, hits: list[dict], *, top_k: int = 5) -> list[dict]:
    """Score hits by lexical coverage + rrf rank; return top_k."""
    terms = [t.lower() for t in extract_terms(query)]
    codey = [t for t in terms if re.search(r"[_\W]", t) or t.isupper()]
    reranked: list[dict] = []
    for rank, hit in enumerate(hits):
        payload = hit.get("payload", {})
        text = f"{payload.get('title', '')} {payload.get('doc_title', '')} {payload.get('text', '')}".lower()
        coverage = sum(1 for t in terms if t in text) / max(len(terms), 1)
        exact = sum(1 for t in codey if t in text)
        # small decay by original rank so ties keep the fusion order
        score = 0.7 * coverage + 0.2 * min(exact, 2) / 2 + 0.1 / (rank + 1)
        reranked.append({**hit, "rerank_score": round(score, 4)})
    reranked.sort(key=lambda h: h["rerank_score"], reverse=True)
    return reranked[:top_k]


async def rerank(query: str, hits: list[dict], *, top_k: int = 5) -> list[dict]:
    """Heuristic rerank, then optional LLM re-order (silent no-op on failure)."""
    reranked = heuristic_rerank(query, hits, top_k=top_k)
    if len(reranked) < 2:
        return reranked
    try:
        from app.services import ai_client

        if not await ai_client.embeddings_available():
            return reranked
        titles = [str(h.get("payload", {}).get("doc_title", ""))[:80] for h in reranked]
        prompt = (
            "Rank these document titles by relevance to the query. "
            f"Query: {query!r}\nTitles:\n"
            + "\n".join(f"{i+1}. {t}" for i, t in enumerate(titles))
            + "\nAnswer with only the numbers, best first, comma-separated."
        )
        answer = await ai_client.chat(prompt)
        order = [int(n) - 1 for n in re.findall(r"\d+", answer) if 0 < int(n) <= len(reranked)]
        if len(order) == len(reranked):
            reranked = [reranked[i] for i in order]
    except Exception:  # noqa: BLE001 — reranking is an enhancement, never a gate
        pass
    return reranked
