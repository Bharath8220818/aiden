# AIDEN AI Architecture

The AI layer serves **11 agents on 4 base models with 9 LoRA adapters** —
never 11 separate fine-tunes. One registry drives serving, evaluation, and
training; a sync guard keeps the two sides of that registry identical.

## Model layer

```
                    AIDEN MODEL LAYER  (backend/app/ai/models/)
                                   │
        ┌──────────────────┬───────┴────────┬──────────────────┐
        ▼                  ▼                ▼                  ▼
   BASE A general    BASE B coder     BASE C vision      BASE D audio
   Qwen3-8B/14B      Qwen2.5-Coder    Qwen2.5-VL-7B      Whisper large-v3
        │             7B/14B                │                  │
   ┌────┼─────┐      ┌───┼────┐             │                  │
   requirement│      sql │  code         vision_adapter   (pretrained,
   architecture      │  │   │                              no adapter)
   planning   │      │   │   │
   rca        │      validation+self_healing (shared)
   documentation
```

- **Serving registry** — `backend/app/ai/models/registry.py`: `BASE_MODELS`,
  `LORA_ADAPTERS`, `AGENTS` (the 11), `resolve_model_ref()` (base tag today,
  `base+adapter` once an adapter is trained), `route_table()`.
- **Frozen contracts** — `ml/agents.json` (A1–A11 with JSON output schemas).
  `python -m ml.validate` + `backend/tests/test_ml_contract_sync.py` fail on
  any drift between contract and registry.
- **Multimodal router** — `backend/app/ai/models/router.py`: classifies
  `text | image | audio`, chains audio (Whisper → transcript) and image
  (Qwen2.5-VL → extraction) **pre-agents** into the Requirement Agent, and
  resolves the serving ref for every agent invocation.
- **Transport** — `backend/app/services/ai_client.py` (Ollama `/api/chat`,
  JSON mode, 45 s timeout, cached `/api/tags` probe). Any failure raises
  `AIServiceError`; callers fall back to deterministic engines. The frontend
  contract never depends on the model being up.

## The 11 agents (contract ↔ registry)

| # | Contract | Backend agent | Base | Adapter | Input |
|---|---|---|---|---|---|
| A1 | Requirement | `requirement_analysis` | A general | requirement_adapter | text |
| A2 | Vision/Diagram | `vision_requirement` | C vision | vision_adapter | image |
| A3 | Audio | `audio_requirement` | D audio | *(none — pretrained)* | audio |
| A4 | Architecture | `architecture` | A general | architecture_adapter | requirement JSON |
| A5 | Pipeline Planner | `pipeline_planning` | A general | planning_adapter | architecture |
| A6 | SQL/Data | `sql_data` | B coder | sql_adapter | schema + requirement |
| A7 | Code Generator | `pipeline_code` | B coder | pipeline_code_adapter | DAG/spec |
| A8 | Validator | `validation` | B coder | validation_self_healing_adapter | code/DAG/schema |
| A9 | RCA | `monitoring_rca` | A general | rca_adapter | logs + history |
| A10 | Self-Healing | `self_healing` | B coder | validation_self_healing_adapter | failure + RCA |
| A11 | Documentation | `documentation_knowledge` | A general | documentation_adapter | project data |

## Where each concern lives

| Concern | Path |
|---|---|
| Serving registry + router | `backend/app/ai/models/` |
| RAG (chunking, hybrid+RRF retrieval, reranker) | `backend/app/ai/rag/` |
| Dataset schema + builders + eval CLI | `backend/app/ai/datasets/`, `backend/scripts/eval_models.py` |
| Frozen agent contracts + validation | `ml/agents.json`, `ml/validate.py` |
| Preprocessing (dedupe/validate/80-10-10) | `ml/preprocessing/` |
| LoRA/QLoRA training + adapter registry | `ml/training/` |
| Per-agent metric engine + baseline runner | `ml/evaluation/` |
| Trained adapter artifacts (gitignored) | `ml/adapters/` |

## Eval-first discipline (the defensible experiment)

```
eval dataset (JSONL, per-agent)
      ↓
baseline eval  (base model vs test split — ml/evaluation/run_baseline.py)
      ↓
LoRA fine-tune (ml/training/lora_finetune.py, hyper-params from contract)
      ↓
re-eval        (same fixed test split)
      ↓
compare        (per-metric deltas; adopt adapter only on clear wins)
```

Targets: 500×{requirement, architecture, planning, sql, code},
300×{validation, rca, self-healing}, 200×{documentation, vision, audio};
Phase 16 fixed test set: 100 per agent. Metrics stay per-agent (JSON validity,
field accuracy, node/edge F1, WER, SQL syntax, compilation, DAG validity, RCA
accuracy, patch test-pass rate, latency) — never a single "AI accuracy".

## Degraded mode

Without Ollama: `ollama_available()` is False, every AI-backed endpoint uses
its deterministic engine, `/agents/model/run` returns `source: "heuristic"`
with the routing decision attached, and `/health/full` reports
`ollama: not_configured`. Nothing crashes; the platform is honest.
