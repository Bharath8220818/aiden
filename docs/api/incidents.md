# Incidents

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/incidents` | `incident.read` | list (project-scoped, status filter) |
| POST | `/incidents/{id}/diagnose` | `healing.propose` | run RCA agent → root cause + confidence + evidence |
| POST | `/incidents/{id}/fix` | `healing.propose` | generate candidate patch (Self-Healing Agent) |
| POST | `/incidents/{id}/resolve` | `incident.update` | mark resolved (after patch applied + rerun) |

## Flow

`diagnose` (RCA, A9) → `fix` (patch, A10) → `POST /sandbox/test` →
`POST /healing/{run_id}/advance` → approval → rerun. See
[self-healing.md](self-healing.md) and
`docs/architecture/self-healing-workflow.md` for the loop mechanics and the
`healing_runs` rows each step writes.

Incidents broadcast platform events on every transition (live UI timelines).
