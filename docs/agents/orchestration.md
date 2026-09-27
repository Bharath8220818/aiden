# Orchestration

Two layers cooperate: the **model router** (which model/agent handles one
multimodal input) and the **workflow orchestrator** (which stages run, in
order, against real platform state).

## Layer 1 — model router (`backend/app/ai/models/router.py`)

```
payload ──classify_input_kind()──► text | image | audio
   audio → pre-agent: Whisper transcribe (Base D, pretrained)
   image → pre-agent: Qwen2.5-VL extract  (Base C, +vision_adapter)
        ▼
target agent (default requirement_analysis) ──registry.resolve_model_ref()──►
serving ref → ai_client.chat_json(...) → parsed JSON + route provenance
```

- Explicit agent targeting: `route(payload, agent_id="pipeline_code")`.
- Provenance travels with every answer (`_route`, `_source` fields from
  `model_service.agent_run`) so UIs and logs can show which model served it.

## Layer 2 — workflow orchestrator (`backend/app/services/orchestrator_service.py`)

- `STAGES` = the 11 canonical stages (see `agent-workflow.md`).
- `WORKFLOWS` = named subsets: `full_loop`, `requirement_to_code`,
  `quality_gate`, `health_check`.
- `OrchestratorService.start(workflow, prompt, created_by, project_id)`:
  creates `AgentRun(running)` + `AgentStageRun(pending)` rows, commits, then
  `run_pending()` executes stage-by-stage.
- Dispatch table pattern: each stage is `_stage_<id>()`; unknown stages skip
  honestly. Stage handlers read **real** platform state (connections,
  databases, pipelines) and persist **real** rows (e.g. stage 4 creates the
  Architecture).

## Sequencing rules

1. Agents only run after their **upstream artifact exists** (architecture
   before planning; spec before code).
2. Validation gates execution: `validation_testing` failing stops the loop
   toward deploy and routes into RCA/healing semantics instead.
3. Every governed action asks `ToolRegistry` with the acting user — runs
   without an actor degrade to `{status: "unavailable"}` rather than acting
   anonymously.
4. One stage, one transaction: stage outputs land in `agent_runs.outputs`
   and `agent_stage_runs` rows are updated per stage so the UI timeline
   always reflects persisted state, never memory-only progress.

## Realtime contract

`broadcast_platform_event(...)` on start/finish/stage transitions; the WS
client (`frontend/src/services/websocket.ts`) feeds SwarmFeed + timelines.
Event payloads are additive — new fields only, never renamed (frontend
contract stability).

## Extending

Add a stage → `STAGES` + a `_stage_<id>` handler (+ tests in
`tests/test_phase11_rag_orchestrator.py` pattern); add an agent →
`registry.py` **and** `ml/agents.json` together (sync guard enforces),
then re-run `python -m ml.validate`.
