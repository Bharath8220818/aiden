# AIDEN — Intent Agent Fine-Tuning

This guide adapts the external "Intent Agent Fine-Tuning" plan to the code that
**actually exists in this repo** (August 2026). The infrastructure was already
partly built — this documents what ships out of the box, what was added, and
exactly how to run a full train → evaluate → integrate → improve loop.

> ⚠️ **Correction to the original guide:** it proposes `microsoft/deberta-v3-small`
> with `Seq2SeqTrainer`. DeBERTa is an **encoder-only** model — it cannot run as
> seq2seq and `AutoModelForSeq2SeqLM.from_pretrained("microsoft/deberta-v3-small")`
> raises. This repo fine-tunes **causal LMs (TinyLlama / Llama-3.2)** with
> `SFTTrainer` + LoRA, which is the correct stack for this task.

---

## 1. What already exists (repo inventory)

| Piece | Location | Status |
|-------|----------|--------|
| Schema (intents + entities) | `app/core/intent_parser.py` (`base_system_prompt`, rule parser) | ✅ |
| Base dataset (instruction format) | `data/intent_dataset.jsonl` (200 examples) | ✅ |
| Learnable dataset v2 (transforms/rules in prompts) | `data/intent_dataset_v2.jsonl` | ✅ added Aug 5 |
| **Expanded dataset (600 examples)** | `data/intent_dataset_v3.jsonl` | ✅ added Aug 6 |
| **Public dataset fetcher (sql-create-context, spider)** | `scripts/fetch_public_datasets.py` | ✅ added Aug 6 |
| **Automatic failure capture (backend)** | `_log_parse_failure` in `app/api/v1/pipelines.py` | ✅ added Aug 6 |
| Synthetic data generator | `scripts/generate_synthetic_data.py` | ✅ |
| Training script (LoRA/QLoRA, all 5 agents) | `scripts/train_agent.py` | ✅ |
| Fine-tuning module (intent-specific) | `app/fine_tuning/train.py` | ✅ |
| Adapter loader (auto-load on boot) | `app/core/agent_loader.py` | ✅ |
| **Adapter integration in parser** | `app/core/intent_parser.py` (`_resolve_intent_model`) | ✅ added Aug 5 |
| **Evaluation harness** | `scripts/evaluate_intent.py` | ✅ added Aug 5 |
| **Feedback loop** | `scripts/collect_feedback.py` | ✅ added Aug 5 |

HF stack installed in the venv: `transformers 4.57.6`, `peft 0.19.1`,
`accelerate 1.14.0`, `datasets 5.0.0`, `trl 1.8.0`, `bitsandbytes 0.50.0`,
`torch 2.7.1+cu118`.

---

## 2. Schema (Phase 1)

The parser extracts exactly the fields the agent needs (no change required):

- **intent types** — implied by the endpoint (create/run/modify/heal pipeline)
- **entities** — `name`, `source_type`, `source_config`, `destination_type`,
  `destination_config`, `transformations`, `schedule` (cron), `data_quality_rules`

Dataset format (both `intent_dataset.jsonl` and `intent_dataset_v2.jsonl`):

```json
{"instruction": "Build a daily sales ETL from PostgreSQL to Snowflake",
 "output": "{\"name\": \"...\", \"source_type\": \"postgres\", \"source_config\": {\"table\": \"sales\"}, \"destination_type\": \"snowflake\", \"destination_config\": {\"schema\": \"analytics\"}, \"transformations\": [\"clean\", \"aggregate\"], \"schedule\": \"0 6 * * *\", \"data_quality_rules\": [\"no_null_primary_key\", \"amount_positive\"]}"}
```

---

## 3. Data preparation (Phase 2)

```bash
cd backend

# Regenerate / expand the intent dataset (template mode, no API key)
python scripts/generate_synthetic_data.py --agent intent --count 600 \
    --output data/intent_dataset_v3.jsonl

# LLM mode for more realistic variety (needs OPENAI_API_KEY or --api-base for Ollama)
python scripts/generate_synthetic_data.py --agent intent --count 100 --llm
```

**Aug 5 data-quality fix:** earlier generated prompts never mentioned
transformations or quality rules (they existed only in the labels), so those
fields were permanently unlearnable (0% in evaluation). v2+ prompts now name
the exact transforms/rules that appear in the label.

### Public datasets (Phase 2 — SQL / pipeline-builder agents)

The internal intent set (now **600 examples** in `intent_dataset_v3.jsonl`) is
the primary source for the Intent Agent. For the SQL and Pipeline-Builder
agents, fetch real text→SQL data with the new fetcher (uses the `datasets`
library, already in `requirements.txt`):

```bash
cd backend

# 500 text->SQL examples from b-mc2/sql-create-context
python scripts/fetch_public_datasets.py --limit 500

# Spider (needs HF auth; terms agreement on the Hub)
python scripts/fetch_public_datasets.py --dataset spider --limit 200

# Deterministic sample to a custom path
python scripts/fetch_public_datasets.py --limit 300 --seed 7 --output data/public/sql_generation.jsonl
```

Output rows use the same `{instruction, output}` JSONL format. **The 500 rows
are wired into the Pipeline-Builder agent's dataset**
(`data/pipeline_builder_dataset.jsonl`, now **590 rows**: 90 existing
DAG/dbt-generation rows + 500 real text→SQL rows), so
`--agent pipeline_builder` trains on both code-generation domains. The raw
fetch is preserved at `data/public/sql_generation.jsonl` for regeneration.

### Why SQL rows do NOT go into the intent dataset (the split)

| Agent | Dataset | Input → Output | Rows |
|---|---|---|---|
| Intent | `intent_dataset_v3.jsonl` | prompt → pipeline config JSON (sources, schedule, transforms, rules) | 600 |
| Pipeline-Builder | `pipeline_builder_dataset.jsonl` | config/request → DAG + dbt code **and** question + schema → SQL | 590 |
| SQL subset (raw fetch) | `data/public/sql_generation.jsonl` | question + schema context → SQL query | 500 |

The domains are deliberately separate: intent extraction is *semantic
classification* (which connectors, cadence, transforms), while SQL generation
is *code synthesis* (translate a schema + question into an executable query).
Mixing them would teach the Intent Agent to emit SQL instead of pipeline JSON
(and vice versa). `fetch_public_datasets.py`'s docstring enforces the split.
Banking77/CLINC150/ATIS remain optional — general intent structure, but they
need conversion + filtering for data-engineering examples.

---

## 4. Training (Phases 3–4)

```bash
cd backend

# Baseline training — deterministic, no model download beyond the base
python scripts/train_agent.py --agent intent \
    --data data/intent_dataset_v2.jsonl \
    --epochs 3 --batch 4 --no-4bit

# On a GPU (or with WSL CUDA) use 4-bit QLoRA (default when CUDA available)
python scripts/train_agent.py --agent intent \
    --data data/intent_dataset_v2.jsonl \
    --epochs 3 --model meta-llama/Llama-3.2-3B-Instruct

# Intent-only module with slightly different defaults
python -m app.fine_tuning.train --dataset-path data/intent_dataset_v2.jsonl
```

- Base model default: `TinyLlama/TinyLlama-1.1B-Chat-v1.0` (set via
  `INTENT_MODEL` in `.env`).
- Output: `./models/intent-parser/` (matches `agent_loader.py` + the new
  parser integration path). `train_agent.py --output` can relocate it.
- ⚠️ `--output` is the **parent** directory: the script appends the agent
  subdirectory, so `--output ./models` → `./models/intent-parser/`.
  The original guide's `--output models/adapters/intent` would create
  `models/adapters/intent/intent-parser` — a nested extra level that the
  parser's default probe path won't find. Prefer `--output ./models` or set
  `INTENT_ADAPTER_PATH` to the actual written path.
- LoRA defaults: `r=16, alpha=32`, all `q/k/v/o/gate/up/down` projections.
- Loss supervises the whole formatted sequence (system + instruction + response)
  — there is no completion-only masking yet. Acceptable for a first adapter; a
  production round should mask the prompt (chat format / completion-only loss).
- Gradient checkpointing is enabled only under 4-bit QLoRA (`--use-4bit`); plain
  fp32 CPU/GPU runs skip it (pure recompute overhead when memory is not tight).

---

## 5. Evaluation (Phase 6)

The accuracy harness compares the parser's output field-by-field against the
labels:

```bash
cd backend

# Baseline — deterministic rule-based parser (no model, fast)
python scripts/evaluate_intent.py --data data/intent_dataset_v2.jsonl --mode rules

# After fine-tuning — HF pipeline (auto-loads ./models/intent-parser if present)
python scripts/evaluate_intent.py --data data/intent_dataset_v2.jsonl --mode llm

# Local Ollama
python scripts/evaluate_intent.py --data data/intent_dataset_v2.jsonl --mode ollama

# Smoke runs
python scripts/evaluate_intent.py --data data/intent_dataset_v2.jsonl --mode rules --limit 50
```

Metrics: per-field accuracy (source_type, destination_type, schedule,
transformations, data_quality_rules), JSON validity, and fully-correct rate.

**Aug 5 baseline (rules mode, `intent_dataset_v2.jsonl`):**

| Field | Before (rules) | After fine-tuning (target) |
|-------|----------------|---------------------------|
| source_type | 33% | >85% |
| destination_type | 34% | >85% |
| schedule | 39% | >90% |
| transformations | 6% | >80% |
| data_quality_rules | 0% | >80% |
| JSON validity | 100% | 100% |

The rules baseline is low because the rule parser only knows 8 connectors while
the dataset covers 20+ — the fine-tuned model is expected to generalise far
beyond the keyword tables.

**Aug 5 parser fix:** source/destination detection now uses keyword **position**
(first connector = source, last = destination) instead of dict order, so
"sync s3 to snowflake" no longer misparses snowflake as the source (this also
fixed the LLM-reconcile path which trusted the rule result).

---

## 6. Integration (Phase 7)

The intent parser auto-detects a fine-tuned adapter — **no code change needed
after training**:

```env
# backend/.env  (optional; default probe path is ./models/intent-parser)
INTENT_ADAPTER_PATH=./models/intent-parser
```

Precedence in `IntentParser._resolve_intent_model()`:
1. explicit `model_name` argument
2. `INTENT_ADAPTER_PATH` (or `./models/intent-parser`) if it exists on disk
3. base `INTENT_MODEL`

`hf_service.load_model()` already understands local PEFT dirs (it reads
`adapter_config.json`, loads the base model, then `PeftModel.from_pretrained`),
so pointing the parser at the adapter path is sufficient. `agent_loader.py`
performs the same load at boot for all 5 agents.

Restart the backend after training; the parser logs
`Intent parser: using fine-tuned adapter at ./models/intent-parser`.

---

## 7. Continuous improvement (Phase 8)

**Automatic capture (added Aug 6):** when the AI intent parser times out or
errors on `/api/v1/pipelines/from-prompt`, the backend now appends the prompt
together with the rule-based fallback result to `data/feedback_dataset.jsonl`
(`note: ai_timeout` / `ai_error:*`) via `_log_parse_failure` — no manual
intervention needed. These are the prompts the model gets wrong, which is
exactly what a re-training round should learn from.

```bash
# Manual record of a user correction
python scripts/collect_feedback.py add \
    --input "Build a daily sales ETL from PostgreSQL to Snowflake" \
    --original '{"source_type": "postgresql"}' \
    --output '{"source_type": "postgres"}'

# Merge base + feedback for the next training round (feedback wins on dupes)
python scripts/collect_feedback.py merge \
    --base data/intent_dataset_v3.jsonl \
    --feedback data/feedback_dataset.jsonl \
    --out data/intent_dataset_v3.jsonl
```

Re-train with the merged dataset, re-evaluate with `scripts/evaluate_intent.py`,
and ship the improved adapter.

---

## 8. Checklist

| Step | Task | Status |
|------|------|--------|
| 1 | Define schema (intents + entities) | ✅ exists (`intent_parser.py`) |
| 2 | Internal dataset | ✅ 600 examples (`intent_dataset_v3.jsonl`) |
| 3 | External data | ✅ `fetch_public_datasets.py` (sql-create-context, spider) |
| 4 | Convert to instruction format | ✅ already in format |
| 5 | Train/test split | ✅ 90/10 in `train_agent.py` |
| 6 | Base model | ✅ `TinyLlama-1.1B-Chat` (configurable) |
| 7 | Training script | ✅ `train_agent.py` (LoRA/QLoRA) |
| 8 | Evaluation | ✅ `evaluate_intent.py` added Aug 5 |
| 9 | Integrate into backend | ✅ `_resolve_intent_model` added Aug 5 |
| 10 | Test with sample prompts | ⬜ run after first training |
| 11 | Deploy | ⬜ push adapter path to server |
