# Agents

## Fleet control

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/agents` | `agent.read` | roster (status, tool grants) |
| GET | `/agents/swarm` | `agent.read` | swarm feed messages |
| POST | `/agents/{agent_id}/status` | `agent.control` | pause/unpause an agent |
| POST | `/agents/{agent_id}/grants` | `agent.control` | enable/disable a tool grant |

## Model layer (registry / routing / invocation)

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/agents/model/registry` | `agent.read` | bases + adapters + 11-agent route table |
| GET | `/agents/model/route` | `agent.read` | resolve routing for a payload (no model call) — query: `payload`, `input_kind=auto\|text\|image\|audio`, `agent_id` |
| POST | `/agents/model/run` | `agent.control` | one routed invocation: `{agent_id, input_kind, text|audio|image...}` → parsed JSON with `_route` + `_source`, or honest `{"source": "heuristic"}` fallback |

## Orchestrator

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/agents/workflows` | `agent.read` | workflow definitions + stage lists |
| POST | `/agents/orchestrate/{workflow}` | `agent.control` | run a workflow (sync): `full_loop`, `requirement_to_code`, `quality_gate`, `health_check` |
| POST | `/agents/orchestrate/{workflow}/async` | `agent.control` | kick off + poll (background task) |
| GET | `/agents/runs` | `agent.read` | recent runs (limit) |
| GET | `/agents/runs/{run_id}` | `agent.read` | run detail incl. per-stage rows |

## Examples

```bash
# routing decision only (free)
curl "$API/agents/model/route?payload=nightly%20ETL&input_kind=auto" -H "$AUTH"

# one agent invocation (model or honest heuristic)
curl -X POST "$API/agents/model/run" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"agent_id":"requirement_analysis","text":"Daily sales ETL from PG to Snowflake"}'

# full orchestrated loop
curl -X POST "$API/agents/orchestrate/full_loop" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"prompt":"Daily orders pipeline with duplicate removal","project_id":null}'
```

Stage map + execution semantics: `docs/architecture/agent-workflow.md`.
