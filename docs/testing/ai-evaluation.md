# AI Evaluation

The defensible experiment: **eval dataset → baseline → LoRA → re-eval →
compare** — never "we fine-tuned an LLM" without numbers.

## Dataset architecture

| Layer | Location | Format |
|---|---|---|
| Schema + builders | `backend/app/ai/datasets/` | JSONL `{agent, instruction, input, output[, image / failure, logs, root_cause, patch, test_result]}` |
| Scaffold data (synthetic) | `backend/data/datasets/<agent>_train.jsonl` | per-agent seed sets + `runs/` reports (gitignored) |
| ML record format + splits | `ml/datasets/<dir>/{raw,train,val,test}.jsonl` + `stats.json` | `{agent, instruction, input, expected_output, metadata}` — 80/10/10 |
| Frozen contracts | `ml/agents.json` | output schemas the datasets must satisfy |

Targets: 500×{A1,A4,A5,A6,A7} · 300×{A8,A9,A10} · 200×{A11,A2,A3}; Phase 16
fixed test set: 100 per agent. Scaffold samples are placeholders — replace
`raw.jsonl` with annotated data and re-run the split (deterministic seed).

## Metrics (per agent — never one number)

`ml/evaluation/metrics.py`: JSON validity, field accuracy, node/edge F1,
WER, SQL syntax + table hit, code compilation (AST), DAG validity, validity
agreement, RCA fuzzy accuracy, patch substance, sandbox test-pass rate, doc
quality, latency_ms_avg.

## Commands

```bash
# repo root, backend venv
python -m ml.validate                                    # contracts ↔ registry sync
python ml/scripts/prepare_datasets.py --source backend-scaffold
python ml/evaluation/run_baseline.py --all               # heuristic floor
python ml/evaluation/run_baseline.py --all --use-model   # Ollama-backed
python ml/evaluation/run_baseline.py --agent requirement_analysis \
    --tag qwen3:8b+requirement_adapter --use-model       # fine-tuned variant
python -m scripts.eval_models scaffold|validate|baseline|compare   # backend-side harness
```

Reports: `ml/experiments/*.json` (gitignored) + `backend/data/datasets/runs/`.

## Adoption rule

A LoRA adapter is exported to serving
(`ml/training/adapter_registry.py::export_to_backend` → registry
`trained=True` → `resolve_model_ref` serves `base+adapter`) **only** on
clear per-metric wins over baseline. Any regression = do not adopt; revisit
the samples first.
