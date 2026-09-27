# AIDEN Self-Healing Workflow

The closed loop that makes AIDEN autonomous — with the hard boundary that
**no patch reaches production without a sandbox test pass and a human
approval**.

## The loop

```
Monitoring / drift detection
        │  anomaly or failed run
        ▼
    Incident row  (pipeline, error, severity)
        │
        ▼
  RCA (A9 Monitoring/RCA Agent)          POST /incidents/{id}/diagnose
        │  logs + metrics + schema + similar incidents (RAG)
        ▼
  root_cause + confidence + affected_task + evidence
        │
        ▼
  Self-Healing Agent (A10)               POST /incidents/{id}/fix
        │  candidate patch (Qwen2.5-Coder class)
        ▼
  Sandbox test                           POST /sandbox/test
        │  deterministic validators + dry-run
        ├── failed → back to RCA (evidence grows)
        ▼
  Healing run advances                   POST /healing/{run_id}/advance
        │
        ▼
  Human approval gate                    POST /approvals/{id}/approve|reject
        │  (approval.approve permission — lead/admin)
        ▼
  Patch applied → pipeline re-run → monitoring closes the loop ↺
```

## Where it lives

| Concern | Path |
|---|---|
| Endpoints | `backend/app/api/v1/incidents.py` (diagnose/fix/resolve), `healing/advance` + `/sandbox/test` |
| Service | `backend/app/services/incident_healing_service.py` |
| Rows | `incidents` → `healing_runs` (RCA JSON, patch, test results, approvals) |
| Events | every transition broadcasts platform events (WS) — UI timeline updates live |
| RCA context | `backend/app/ai/rag/` retrieval over incidents + knowledge chunks |

## Training the agents (ml workspace)

The self-healing dataset format carries the full forensic chain so the model
learns diagnosis→repair, not error→guess:

```json
{
  "agent": "self_healing",
  "instruction": "Propose a repair patch for the diagnosed failure",
  "input": "customer_id expected INTEGER but received STRING",
  "expected_output": {
    "root_cause": "upstream schema changed customer_id to STRING",
    "patch": "CAST(customer_id AS INTEGER)",
    "test_result": "passed"
  },
  "failure": "...", "logs": "...", "root_cause": "...",
  "patch": "...", "test_result": "passed",
  "metadata": {"source": "annotated"}
}
```

Evaluation (`ml/evaluation/metrics.py::score_self_healing`) scores RCA
fuzzy-accuracy, patch substance, and sandbox test-pass rate separately —
never merged into one number.

## Invariants (tested)

- A healing advance broadcasts events (`tests/test_ai_and_events.py`).
- Sandbox failure never produces an approval request.
- Approval requires `approval.approve` (403 otherwise — smoke gate S10's
  sibling checks).
- Generated SQL/patches pass the read-only/destructive guards before any
  execution (`_guard_readonly`, `sql.destructive` permission).
