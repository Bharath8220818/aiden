"""Compare two baseline/evaluation runs (Phase 5, steps 5.8 / 9): Base vs LoRA.

    python ml/evaluation/compare_runs.py \
        --a ml/experiments/requirement_analysis_model_qwen3-4b_<ts>.json \
        --b ml/experiments/requirement_analysis_model_<adapter>_<ts>.json \
        [--labels Base LoRA]

Prints the spec-9 comparison table and writes a combined JSON next to run A.
A delta is flagged when run B (the candidate) fails to beat run A — the
Phase-5 promotion gate made concrete.
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

ML_DIR = Path(__file__).resolve().parents[1]


def load_run(path: str) -> dict:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    if "metrics" not in data:
        raise SystemExit(f"[compare] {path} is not an evaluation report (no metrics)")
    return data


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="compare_runs")
    parser.add_argument("--a", required=True, help="baseline run (left column)")
    parser.add_argument("--b", required=True, help="candidate run (right column)")
    parser.add_argument("--labels", nargs=2, default=["Base", "Candidate"])
    args = parser.parse_args(argv)

    run_a, run_b = load_run(args.a), load_run(args.b)
    label_a, label_b = args.labels
    metrics = sorted(set(run_a["metrics"]) | set(run_b["metrics"]))

    print("AIDEN Requirement Agent Evaluation")
    print("=" * 56)
    print(f"{'metric':<22}{label_a:>14}{label_b:>14}   delta")
    print("-" * 56)
    regressions: list[str] = []
    for metric in metrics:
        va = run_a["metrics"].get(metric, 0.0)
        vb = run_b["metrics"].get(metric, 0.0)
        delta = vb - va
        flag = ""
        if metric != "latency_ms_avg" and delta < 0:
            flag = "  <-- REGRESSION"
            regressions.append(metric)
        print(f"{metric:<22}{va:>13.2%}{vb:>14.2%}   {delta:+.2%}{flag}")
    print("-" * 56)
    print(f"n_samples: {run_a.get('n_samples')} vs {run_b.get('n_samples')}")
    print(f"engines:   {run_a.get('engine')} vs {run_b.get('engine')}")
    if regressions:
        print(
            f"RESULT: candidate REGRESSED on {', '.join(regressions)} - do not promote"
        )
        verdict = "regressed"
    else:
        print("RESULT: candidate beats baseline on every metric - promote")
        verdict = "promote"

    out = {
        "comparison": "base_vs_candidate",
        "verdict": verdict,
        "baseline_run": str(args.a),
        "candidate_run": str(args.b),
        "metrics": {
            m: {
                "baseline": run_a["metrics"].get(m),
                "candidate": run_b["metrics"].get(m),
            }
            for m in metrics
        },
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    out_path = (
        ML_DIR
        / "experiments"
        / f"comparison_{run_a.get('agent', 'agent')}_{time.strftime('%Y%m%d_%H%M%S')}.json"
    )
    out_path.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(f"saved -> {out_path}")
    return 1 if regressions else 0


if __name__ == "__main__":
    raise SystemExit(main())
