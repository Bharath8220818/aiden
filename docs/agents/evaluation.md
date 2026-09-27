# Agent Evaluation

One scorer per agent, per-metric reporting, fixed test splits, and a strict
baseline-before-fine-tuning discipline. Tooling lives in `ml/evaluation/`
(metrics engine + baseline runner) and `backend/scripts/eval_models.py`
(dataset scaffold/validate/compare CLI).

## Metric catalog (`ml/evaluation/metrics.py`)

| Agent | Metrics |
|---|---|
| A1 Requirement | `json_validity`, `field_accuracy` (source/destination/schedule/entity/transformations/monitoring) |
| A2 Vision | `json_validity`, `node_accuracy` (F1), `edge_accuracy` (F1) |
| A3 Audio | A1 metrics + `wer_penalty` (1 − WER vs reference transcript) |
| A4 Architecture | `json_validity`, `component_accuracy` (F1), `connection_accuracy` (F1) |
| A5 Planner | `json_validity`, `task_accuracy` (F1), `dependency_accuracy` (F1), `dag_validity` |
| A6 SQL | `json_validity`, `sql_syntax` (read-only + balanced), `table_hit` |
| A7 Code | `json_validity`, `compilation` (AST parse) |
| A8 Validator | `json_validity`, `validity_agreement`, `errors_structure` |
| A9 RCA | `json_validity`, `rca_accuracy` (normalized substring), `has_recommendation` |
| A10 Self-Healing | `json_validity`, `patch_correctness`, `test_pass_rate`, `rca_accuracy` |
| A11 Documentation | `json_validity`, `doc_quality` (length + markdown structure) |

Every report also records `latency_ms_avg`. **Never** aggregate into a single
"AI accuracy" — the roadmap rule; reports stay per-metric (JSON in
`ml/experiments/`, gitignored).

## Data discipline

- Splits: 80/10/10 train/val/test per agent (`ml/preprocessing/pipeline.py`),
  deterministic seed, shuffle-before-split; **test never leaks into train**
  (content-hash dedupe before splitting).
- Phase 16 target: a fixed 100-sample test set per agent; frozen once cut,
  only extended in full-version bumps.
- Scaffold data is synthetic (`backend/app/ai/datasets/` generators) and is
  replaced by annotated samples before publishing any accuracy claims.

## Baseline → fine-tune → compare

```bash
# from repo root (backend venv)
python ml/scripts/prepare_datasets.py --source backend-scaffold   # phases 3-4
python ml/evaluation/run_baseline.py --all                        # phase 5 baseline
python ml/evaluation/run_baseline.py --agent requirement_analysis --use-model
python ml/training/lora_finetune.py --agent requirement_analysis --dry-run
python ml/training/lora_finetune.py --agent requirement_analysis  # needs training venv
python ml/evaluation/run_baseline.py --agent requirement_analysis --use-model \
    --tag qwen3:8b+requirement_adapter                            # after training
```

Adoption rule: an adapter is exported to serving
(`adapter_registry.export_to_backend`) only on clear per-metric wins —
regressions on any metric are a "do not adopt".

## CI hooks

- `backend/tests/test_ml_contract_sync.py` — contracts ↔ registry drift.
- `ci.yml → ml-contracts` job — `python -m ml.validate` + ml unit tests
  (metrics, splitting, records, baseline runner) on every push.
