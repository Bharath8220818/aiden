"""Retrieval evaluation (spec step 13) — deterministic offline metrics.

Metrics: precision@k, recall@k, MRR. Each case supplies a query, the doc ids
that count as relevant, and the per-channel ranked hit lists (e.g. vector +
keyword); the case is scored after RRF fusion. Runs fully offline — no
Qdrant/Ollama needed — so it gates retrieval quality in CI.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from app.ai.rag.retrieval.hybrid_search import fuse


@dataclass
class EvalCase:
    query: str
    relevant_ids: list[str]
    channels: list[list[dict]] = field(default_factory=list)


@dataclass
class EvalResult:
    precision_at_k: float
    recall_at_k: float
    mrr: float
    per_case: list[dict] = field(default_factory=list)


def _key(hit: dict) -> str:
    return str(hit.get("payload", {}).get("doc_id", ""))


def _match(retrieved_key: str, relevant_ids: list[str]) -> bool:
    return any(rel and rel in retrieved_key for rel in relevant_ids)


def evaluate_cases(cases: list[EvalCase], *, k: int = 5) -> EvalResult:
    """Fuse each case's channels with RRF, then score precision/recall/MRR."""
    precisions, recalls, rrs, per_case = [], [], [], []
    for case in cases:
        fused = fuse(*case.channels) if case.channels else []
        top_keys = [_key(h) for h in fused[:k]]
        hits = [1 if _match(key, case.relevant_ids) else 0 for key in top_keys]
        relevant_total = len(case.relevant_ids) or 1
        precisions.append(sum(hits) / k)
        recalls.append(sum(hits) / relevant_total)
        rr = 0.0
        for i, hit in enumerate(hits, start=1):
            if hit:
                rr = 1.0 / i
                break
        rrs.append(rr)
        per_case.append({"query": case.query, "hits": sum(hits), "k": k})
    n = max(len(cases), 1)
    return EvalResult(
        precision_at_k=sum(precisions) / n,
        recall_at_k=sum(recalls) / n,
        mrr=sum(rrs) / n,
        per_case=per_case,
    )


def evaluate_ranking(
    cases: list[tuple[str, list[str], list[list[dict]]]],
    *,
    k: int = 5,
) -> EvalResult:
    """Tuple-based convenience wrapper: (query, relevant_ids, channels)."""
    return evaluate_cases(
        [EvalCase(query=q, relevant_ids=rel, channels=ch) for q, rel, ch in cases],
        k=k,
    )
