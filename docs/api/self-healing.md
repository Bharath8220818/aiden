# Self-Healing

| Method | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/sandbox/test` | `healing.propose` | validate a candidate patch in the sandbox (deterministic validators + dry-run) |
| POST | `/healing/{run_id}/advance` | `healing.propose` | advance the healing state machine (proposed → tested → awaiting approval) |

## State machine

```
proposed ──sandbox pass──► tested ──approval──► approved (apply + rerun)
    │                         │
    └──sandbox fail──► back to RCA        tested ──reject──► dismissed
```

## Invariants

- **No sandbox pass → no approval request.** Advancing past `tested` without
  a passing test result is rejected server-side.
- Approval apply requires `approval.approve` (lead/admin); proposal/sandbox
  needs `healing.propose` (engineer+); execution of the applied patch needs
  `healing.execute` (lead+).
- Every transition broadcasts a WS event (`tests/test_ai_and_events.py`
  pins the healing-advance broadcast).

Patch/repair model details: `docs/architecture/self-healing-workflow.md`.
