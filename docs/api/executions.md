# Executions (pipeline runs)

| Method | Path | Permission | Purpose |
|---|---|---|---|
| POST | `/pipelines/{id}/run` | `pipeline.execute` | queue a pipeline run (`pipeline_runs` row, status `queued`) |
| POST | `/pipelines/{id}/execute` | `pipeline.execute` | execute now (Airflow adapter when `AIRFLOW_URL` set; honest `mode: unavailable` otherwise) |
| GET | `/pipelines/{id}/execution/status` | `pipeline.read` | latest execution status (mode + state) |
| GET | `/pipelines/{id}/execution/runs/{airflow_run_id}/tasks` | `pipeline.read` | task instances for an Airflow run |
| GET | `/pipelines/{id}/execution/runs/{airflow_run_id}/tasks/{task_id}/log` | `pipeline.read` | task log tail (feeds RCA) |

## Semantics

- Runs are recorded **before** execution and updated from the executor — the
  run history panel and dashboard counters read `pipeline_runs`, never the
  executor's memory.
- Without Airflow configured, `execute` returns a structured
  unavailable response; the Phase A smoke asserts run creation (S8) works
  regardless — queueing is always real.
- Task logs are the primary input for the RCA agent
  (`docs/architecture/self-healing-workflow.md`).
