# Prompts (system prompts & their governance)

System prompts are **code-owned** today (inline constants at their call
sites) so they are versioned, tested, and diffable with the behavior they
drive. A dedicated `backend/app/ai/prompts/<agent>/` package becomes
worthwhile when prompts grow beyond one string per agent; until then this
document is the registry of what exists and where.

## Active system prompts

| Agent / surface | Location | Contract enforced in prompt |
|---|---|---|
| Requirement analysis | `backend/app/services/requirement_analyzer.py` (`_ANALYSIS_SYSTEM`) | JSON keys: topic, pipelinePattern (enum of 6), confidenceScore, executiveSummary, streaming |
| Orchestrator stage 1 | `backend/app/services/orchestrator_service.py` `_stage_requirement_analysis` | JSON: topic, pipeline_type (batch_etl|streaming_cdc), summary ≤140 chars |
| Architecture suggest | `backend/app/api/v1/architecture.py` | JSON: pattern (enum of 4) + rationale ≤2 sentences; topology always from curated templates |
| SQL assistant | `backend/app/api/v1/sql.py` | JSON: content + single read-only SELECT or null; server-side `_guard_readonly` regardless |
| Model-layer `/agents/model/run` + eval harness | `backend/scripts/eval_models.py` `_system_for()` | one strict JSON contract per A1–A11 (the same contracts the eval set scores against) |

## Rules for prompt changes

1. **JSON-only replies.** Every prompt ends with "reply with ONLY a JSON
   object" and enumerates allowed keys/enums; parsing assumes that contract
   (`chat_json`, `extract_json_object` as the lenient backstop).
2. **Enums, not vibes.** Anything the code branches on (pipeline patterns,
   test_result) is a closed set spelled out in the prompt **and** validated
   after parsing — the prompt is never the only guard.
3. **Governance stays coded.** PII scanning, read-only SQL, deploy gates are
   deterministic code; prompts shape intent-level fields only.
4. **Change with a test.** Prompt edits that alter output shape must update
   the corresponding eval scorer (`ml/evaluation/metrics.py`) and contract
   schema (`ml/agents.json`) in the same commit.
5. **Model-agnostic.** Prompts never name a model version; routing is the
   registry's job (`resolve_model_ref`), so the same prompt serves the base
   model today and the LoRA adapter tomorrow.

## Training vs serving prompts

Fine-tuned adapters are trained on the *instruction* field of the JSONL
datasets (`ml/training/lora_finetune.py::render_sample`), not on these system
prompts. At serving time the same system prompt wraps the adapter call — the
eval harness (`run_baseline.py --use-model`) measures exactly that pairing,
so before/after numbers compare like with like.
