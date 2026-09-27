# Agent Specification (A1–A11)

Frozen contracts live in **`ml/agents.json`** (versioned, with JSON output
schemas). The serving mapping lives in
**`backend/app/ai/models/registry.py`**. `python -m ml.validate` and
`backend/tests/test_ml_contract_sync.py` fail CI if the two drift.

## Contract table

| ID | Agent | Input | Output (required fields) | Base | Adapter |
|----|-------|-------|--------------------------|------|---------|
| A1 | Requirement | natural-language requirement | `{source, destination, schedule}` (+ entity, transformations[], monitoring, failure_notification) | A general | requirement_adapter |
| A2 | Vision/Diagram | architecture image | `{nodes[{type,name}], connections[[a,b]]}` | C vision | vision_adapter |
| A3 | Audio | spoken requirement | transcript → A1 contract | D audio | *(pretrained)* |
| A4 | Architecture | requirement JSON | `{architecture, components[], connections[]}` | A general | architecture_adapter |
| A5 | Pipeline Planner | architecture JSON | `{tasks[{id,type}], dependencies[[a,b]]}` | A general | planning_adapter |
| A6 | SQL/Data | schema + requirement | `{sql, dialect}` (read-only at serving) | B coder | sql_adapter |
| A7 | Code Generator | DAG/spec | `{language, framework, code}` | B coder | pipeline_code_adapter |
| A8 | Validator | code/DAG/schema | `{valid, errors[{type,message}]}` | B coder | validation_self_healing_adapter |
| A9 | RCA | logs + history | `{root_cause, affected_task}` (+ confidence, evidence[], recommended_action) | A general | rca_adapter |
| A10 | Self-Healing | failure + RCA | `{root_cause, patch, test_result(passed|failed)}` | B coder | validation_self_healing_adapter |
| A11 | Documentation | project data | `{document}` (markdown) | A general | documentation_adapter |

## Behavioral rules

1. **Structured output only.** Every agent replies with a JSON object
   matching its `output_schema`; the transport parses with
   `ai_client.chat_json` (JSON mode) and callers validate/merge.
2. **Never deploy directly.** A7/A10 outputs go through deterministic
   validation, sandbox, and approval gates — enforced server-side.
3. **Degraded mode is honest.** Without a model backend, deterministic
   engines answer and tag `source: heuristic`; the API shape is unchanged.
4. **Governed actions only.** Any external side effect goes through
   `ToolRegistry.execute` with the acting user's permissions.
5. **One registry.** Serving refs resolve via `resolve_model_ref(agent_id)` —
   base tag until the adapter is trained, `base+adapter` after
   (`ml/training/adapter_registry.py::export_to_backend`).

## Interface

```python
from app.ai.models import registry, route

decision = route({"text": "Daily sales ETL from PG to Snowflake"})
# decision.agent_id          → "requirement_analysis"
# decision.serving_model_ref → "qwen3:8b"           (base tag today)
# decision.adapter           → "requirement_adapter"
# decision.pre_agents        → []                    (audio/image chains here)
```

Service facade for endpoints: `app/services/model_service.py`
(`roster()`, `bases()`, `adapters()`, `resolve_route()`, `agent_run()`).
HTTP surface: `GET /agents/model/registry`, `GET /agents/model/route`,
`POST /agents/model/run` (`docs/api/agents.md`).

## Slices (build/eval order)

1. **Slice 1** — A1 Requirement → A2 Vision → A3 Audio → A4 Architecture → A5 Planner
2. **Slice 2** — A6 SQL → A7 Code → A8 Validation
3. **Slice 3** — A9 RCA → A10 Self-Healing → A11 Documentation
