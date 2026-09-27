"""Evaluation metrics (Phase 5/16) — one scoring function per agent.

Every metric returns a dict of floats in [0, 1]; the report never merges
them into a single "AI accuracy" number (roadmap rule).
"""

from __future__ import annotations

import ast
import time
from collections.abc import Callable
from typing import Any


def _f1(pred: set, gold: set) -> float:
    if not gold and not pred:
        return 1.0
    if not gold or not pred:
        return 0.0
    overlap = len(pred & gold)
    precision = overlap / len(pred)
    recall = overlap / len(gold)
    return (
        0.0
        if precision + recall == 0
        else 2 * precision * recall / (precision + recall)
    )


def wer(reference: str, hypothesis: str) -> float:
    """Word Error Rate (Levenshtein over word tokens). Lower is better."""
    ref, hyp = reference.lower().split(), hypothesis.lower().split()
    if not ref:
        return 0.0 if not hyp else 1.0
    prev = list(range(len(hyp) + 1))
    for i, r in enumerate(ref, 1):
        cur = [i]
        for j, h in enumerate(hyp, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (r != h)))
        prev = cur
    return prev[-1] / len(ref)


def json_validity(prediction: dict[str, Any] | None) -> float:
    return 1.0 if isinstance(prediction, dict) else 0.0


def field_accuracy(
    pred: dict[str, Any], gold: dict[str, Any], fields: list[str]
) -> float:
    if not fields:
        return 0.0
    hits = 0
    for field in fields:
        pv, gv = pred.get(field), gold.get(field)
        if isinstance(pv, str) and isinstance(gv, str):
            hits += pv.strip().lower() == gv.strip().lower()
        elif isinstance(pv, list) and isinstance(gv, list):
            hits += {str(x).lower() for x in pv} == {str(x).lower() for x in gv}
        elif isinstance(pv, bool) or isinstance(gv, bool):
            hits += bool(pv) == bool(gv)
        else:
            hits += pv == gv
    return hits / len(fields)


def sql_syntax_ok(sql: str) -> float:
    """Lightweight read-only syntax sanity: starts with SELECT, balanced parens."""
    text = (sql or "").strip().rstrip(";")
    if not text:
        return 0.0
    starts = text.lower().startswith(("select", "with", "explain"))
    balanced = text.count("(") == text.count(")")
    return float(starts and balanced)


def code_compiles(code: str) -> float:
    try:
        ast.parse(code or "")
        return 1.0
    except SyntaxError:
        return 0.0


def dag_valid(dag: dict[str, Any]) -> float:
    """1.0 when every dependency references a declared task id."""
    task_ids = {t.get("id") for t in dag.get("tasks", []) if isinstance(t, dict)}
    for dep in dag.get("dependencies", []):
        if not isinstance(dep, (list, tuple)) or len(dep) != 2:
            return 0.0
        if not {str(dep[0]), str(dep[1])} <= task_ids:
            return 0.0
    return 1.0


def _fuzzy(a: str, b: str, n: int = 40) -> bool:
    a, b = a.lower().strip(), b.lower().strip()
    return bool(a) and bool(b) and (a[:n] in b or b[:n] in a)


# --------------------------------------------------------------------------- #
# Per-agent scorers: (sample, prediction_dict_or_None) → metric dict
# --------------------------------------------------------------------------- #
def score_requirement(
    sample: dict[str, Any], pred: dict[str, Any] | None
) -> dict[str, float]:
    gold = sample.get("expected_output", {})
    if pred is None:
        return {"json_validity": 0.0, "field_accuracy": 0.0}
    return {
        "json_validity": 1.0,
        "field_accuracy": field_accuracy(
            pred,
            gold,
            [
                "source",
                "destination",
                "schedule",
                "entity",
                "transformations",
                "monitoring",
            ],
        ),
    }


def score_audio(
    sample: dict[str, Any], pred: dict[str, Any] | None
) -> dict[str, float]:
    base = score_requirement(sample, pred)
    ref = sample.get("metadata", {}).get("transcript", "")
    hyp = sample.get("metadata", {}).get("hypothesis_transcript", "")
    base["wer_penalty"] = 1.0 - wer(ref, hyp) if ref else 1.0
    return base


def score_vision(
    sample: dict[str, Any], pred: dict[str, Any] | None
) -> dict[str, float]:
    gold = sample.get("expected_output", {})
    if pred is None:
        return {"json_validity": 0.0, "node_accuracy": 0.0, "edge_accuracy": 0.0}
    gold_nodes = {
        n.get("name", "").lower() for n in gold.get("nodes", []) if isinstance(n, dict)
    }
    pred_nodes = {
        n.get("name", "").lower() for n in pred.get("nodes", []) if isinstance(n, dict)
    }
    gold_edges = {tuple(sorted(map(str, e))) for e in gold.get("connections", [])}
    pred_edges = {tuple(sorted(map(str, e))) for e in pred.get("connections", [])}
    return {
        "json_validity": 1.0,
        "node_accuracy": _f1(pred_nodes, gold_nodes),
        "edge_accuracy": _f1(pred_edges, gold_edges),
    }


def score_architecture(
    sample: dict[str, Any], pred: dict[str, Any] | None
) -> dict[str, float]:
    gold = sample.get("expected_output", {})
    if pred is None:
        return {
            "json_validity": 0.0,
            "component_accuracy": 0.0,
            "connection_accuracy": 0.0,
        }
    gold_comps = {
        c.get("name", "").lower()
        for c in gold.get("components", [])
        if isinstance(c, dict)
    }
    pred_comps = {
        c.get("name", "").lower()
        for c in pred.get("components", [])
        if isinstance(c, dict)
    }
    gold_cons = {tuple(sorted(map(str, e))) for e in gold.get("connections", [])}
    pred_cons = {tuple(sorted(map(str, e))) for e in pred.get("connections", [])}
    return {
        "json_validity": 1.0,
        "component_accuracy": _f1(pred_comps, gold_comps),
        "connection_accuracy": _f1(pred_cons, gold_cons),
    }


def score_pipeline(
    sample: dict[str, Any], pred: dict[str, Any] | None
) -> dict[str, float]:
    gold = sample.get("expected_output", {})
    if pred is None:
        return {
            "json_validity": 0.0,
            "task_accuracy": 0.0,
            "dependency_accuracy": 0.0,
            "dag_validity": 0.0,
        }
    gold_tasks = {t.get("id") for t in gold.get("tasks", []) if isinstance(t, dict)}
    pred_tasks = {t.get("id") for t in pred.get("tasks", []) if isinstance(t, dict)}
    gold_deps = {tuple(map(str, d)) for d in gold.get("dependencies", [])}
    pred_deps = {tuple(map(str, d)) for d in pred.get("dependencies", [])}
    return {
        "json_validity": 1.0,
        "task_accuracy": _f1(pred_tasks, gold_tasks),
        "dependency_accuracy": _f1(pred_deps, gold_deps),
        "dag_validity": dag_valid(pred),
    }


def score_sql(sample: dict[str, Any], pred: dict[str, Any] | None) -> dict[str, float]:
    if pred is None:
        return {"json_validity": 0.0, "sql_syntax": 0.0, "table_hit": 0.0}
    gold = sample.get("expected_output", {})
    sql = str(pred.get("sql", ""))
    gold_tables = {t.lower() for t in sample.get("metadata", {}).get("tables", [])}
    hit = float(any(t in sql.lower() for t in gold_tables)) if gold_tables else 1.0
    return {
        "json_validity": 1.0,
        "sql_syntax": sql_syntax_ok(sql),
        "table_hit": hit if gold.get("sql") else 0.0,
    }


def score_code(sample: dict[str, Any], pred: dict[str, Any] | None) -> dict[str, float]:
    if pred is None:
        return {"json_validity": 0.0, "compilation": 0.0}
    code = str(pred.get("code", ""))
    return {"json_validity": 1.0, "compilation": code_compiles(code)}


def score_validation(
    sample: dict[str, Any], pred: dict[str, Any] | None
) -> dict[str, float]:
    gold = sample.get("expected_output", {})
    if pred is None:
        return {
            "json_validity": 0.0,
            "validity_agreement": 0.0,
            "errors_structure": 0.0,
        }
    errors = pred.get("errors")
    return {
        "json_validity": 1.0,
        "validity_agreement": float(bool(pred.get("valid")) == bool(gold.get("valid"))),
        "errors_structure": float(
            isinstance(errors, list)
            and all(
                isinstance(e, dict) and "type" in e and "message" in e for e in errors
            )
        ),
    }


def score_rca(sample: dict[str, Any], pred: dict[str, Any] | None) -> dict[str, float]:
    gold = sample.get("expected_output", {})
    if pred is None:
        return {"json_validity": 0.0, "rca_accuracy": 0.0, "has_recommendation": 0.0}
    return {
        "json_validity": 1.0,
        "rca_accuracy": float(
            _fuzzy(str(pred.get("root_cause", "")), str(gold.get("root_cause", "")))
        ),
        "has_recommendation": float(
            bool(
                str(pred.get("recommended_action", "")).strip()
                or str(gold.get("recommended_action", "")).strip() == ""
            )
        ),
    }


def score_self_healing(
    sample: dict[str, Any], pred: dict[str, Any] | None
) -> dict[str, float]:
    gold = sample.get("expected_output", {})
    if pred is None:
        return {
            "json_validity": 0.0,
            "patch_correctness": 0.0,
            "test_pass_rate": 0.0,
            "rca_accuracy": 0.0,
        }
    patch = str(pred.get("patch", "")).strip()
    return {
        "json_validity": 1.0,
        "patch_correctness": float(len(patch) > 10),
        "test_pass_rate": float(
            str(pred.get("test_result", gold.get("test_result", ""))).lower()
            == "passed"
        ),
        "rca_accuracy": float(
            _fuzzy(str(pred.get("root_cause", "")), str(sample.get("root_cause", "")))
        ),
    }


def score_documentation(
    sample: dict[str, Any], pred: dict[str, Any] | None
) -> dict[str, float]:
    if pred is None:
        return {"json_validity": 0.0, "doc_quality": 0.0}
    doc = str(pred.get("document", ""))
    return {
        "json_validity": 1.0,
        "doc_quality": float(
            len(doc) > 120 and (doc.lstrip().startswith(("#", "##")) or "\n" in doc)
        ),
    }


SCORERS: dict[
    str, Callable[[dict[str, Any], dict[str, Any] | None], dict[str, float]]
] = {
    "requirement_analysis": score_requirement,
    "audio_requirement": score_audio,
    "vision_requirement": score_vision,
    "architecture": score_architecture,
    "pipeline_planning": score_pipeline,
    "sql_data": score_sql,
    "pipeline_code": score_code,
    "validation": score_validation,
    "monitoring_rca": score_rca,
    "self_healing": score_self_healing,
    "documentation_knowledge": score_documentation,
}


def score_sample(
    agent_id: str, sample: dict[str, Any], pred: dict[str, Any] | None
) -> dict[str, float]:
    if agent_id not in SCORERS:
        raise KeyError(f"no scorer for agent {agent_id}")
    return SCORERS[agent_id](sample, pred)


def timed(
    fn: Callable[[], dict[str, Any] | None],
) -> tuple[dict[str, Any] | None, float]:
    """Run a predictor and report (prediction, latency_ms)."""
    start = time.perf_counter()
    result = fn()
    return result, (time.perf_counter() - start) * 1000.0


def aggregate(runs: list[dict[str, Any]]) -> dict[str, float]:
    """Average each metric across scored runs."""
    totals: dict[str, float] = {}
    counts: dict[str, int] = {}
    for run in runs:
        for key, value in run["metrics"].items():
            totals[key] = totals.get(key, 0.0) + value
            counts[key] = counts.get(key, 0) + 1
    return {key: round(totals[key] / counts[key], 4) for key in sorted(totals)}
