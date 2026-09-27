# Architectures

Topology always renders from the curated template library — the model (when
available) picks the pattern and writes rationale; the graph itself is never
free-form model output.

## Endpoints

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/architecture/blueprint` | `architecture.read` | latest blueprint for project (nodes/edges) |
| POST | `/architecture/generate` | `architecture.read` | intent → `{pattern, rationale, topology}` (persisted by the orchestrator's design stage separately) |
| GET | `/architecture/templates` | `architecture.read` | curated template library (streaming_cdc, streaming_analytics, batch_etl, reverse_etl) |

## `POST /architecture/generate`

Request: `{ "prompt": "nightly orders ETL with duplicate removal", "pattern": null }`
(`pattern` optional — when the model is down, keyword routing picks it).

Response: chosen `pattern`, `rationale` (model-written or deterministic), and
the template topology (nodes/edges) for the canvas.

## Model participation

Prompt contract: reply `{"pattern": one of 4, "rationale": ≤2 sentences}`.
Anything else falls through to keyword routing — `docs/agents/prompts.md`.
The orchestrator's `pipeline_design` stage persists the chosen blueprint as a
real `architectures` row (see `docs/architecture/agent-workflow.md`).
