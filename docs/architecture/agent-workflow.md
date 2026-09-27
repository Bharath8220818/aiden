# AIDEN Agent Workflow (orchestrator)

The orchestrator executes the **11-stage AIDEN workflow** end-to-end
(`backend/app/services/orchestrator_service.py`). Each stage is a concrete
async step that persists output to `agent_runs` + `agent_stage_runs` and
broadcasts progress over the WebSocket bus, so the SwarmFeed/timeline UI
renders live.

## Stage map (spec §6, diagram center)

| # | Stage id | Agent (registry) | What actually runs |
|---|---|---|---|
| 1 | `requirement_analysis` | A1 Requirement | model-routed analysis (`/agents/model` layer); heuristic fallback |
| 2 | `data_source_discovery` | — | real catalog reads (`RegistryService.connections`) |
| 3 | `schema_analysis` | — | registered databases + table counts |
| 4 | `pipeline_design` | A4 Architecture | **persists a real Architecture row** (§18) |
| 5 | `code_generation` | A7 Code | generated artifacts into run outputs |
| 6 | `data_quality` | — | quality checks from contract rules |
| 7 | `validation_testing` | A8 Validator | deterministic validators (+ LLM assist) |
| 8 | `deployment` | — | governed deploy path (approval-gated) |
| 9 | `monitoring_observability` | — | live pipeline/run telemetry |
| 10 | `drift_anomaly_detection` | — | schema drift + anomaly signals |
| 11 | `self_healing_recovery` | A10 Self-Healing | RCA → patch → sandbox → approval flow |

## Pre-orchestration: multimodal input routing

```
TEXT / IMAGE / AUDIO        (Requirement Studio)
        │  router.classify_input_kind()          backend/app/ai/models/router.py
        ▼
   audio → Base D (Whisper → transcript)   ┐
   image → Base C (Qwen2.5-VL extract)     ┘ pre-agents normalize to text
        ▼
Requirement Agent (Base A) → normalized requirement JSON
        ▼
ORCHESTRATOR ──► Architecture (A4) → Pipeline Planner (A5)
        ├─► SQL Agent (A6) ─┐
        └─► Code Agent (A7) ┴─► Validation (A8)
                                    │ pass → execute (governed)
                                    └ fail → RCA (A9) → Self-Healing (A10)
                                                → patch → test → human approval → deploy
```

## Execution mechanics

- `POST /agents/orchestrate/{workflow}` (sync or `/async`) creates the run:
  `AgentRun` + one `AgentStageRun` per stage (`pending`).
- Stage dispatch: `_execute_stage()` → `getattr(self, f"_stage_{id}")`;
  a missing implementation records "skipped (no implementation)" — never
  crashes the run.
- **Governed actions**: stages call `self._governed(run, tool, params)` →
  `ToolRegistry.execute(...)` with the acting user's permissions (§15).
  Denials return `{status: "denied", code, detail}` and are recorded.
- Stage failures mark the run failed and stop the sequence (closed-loop
  semantics, mirroring the diagram).
- Every stage transition broadcasts a platform event; the WS contract is
  consumed unchanged by the existing SwarmFeed/timeline components.

## Workflows exposed by the API

| Workflow | Stages | Purpose |
|---|---|---|
| `full_loop` | 1–11 | requirement → ... → self-healing |
| `requirement_to_code` | 1–5 | generation slice |
| `quality_gate` | 3, 6, 7 | schema/quality/validation slice |
| `health_check` | 9–10 | monitoring + drift slice |

Supporting reads: `GET /agents/workflows`, `GET /agents/runs`,
`GET /agents/runs/{id}`, `GET /agents/swarm`, plus the model-layer trio
`GET /agents/model/registry`, `GET /agents/model/route`, `POST /agents/model/run`.

## Failure semantics

- A failing model call inside a stage falls back to the deterministic engine
  (`source: heuristic` in stage outputs) — the stage still produces value.
- A failing governed action is recorded as denied/failed; the run stops and
  the incident/healing path takes over (see `self-healing-workflow.md`).
