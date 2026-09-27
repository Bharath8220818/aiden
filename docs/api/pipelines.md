# Pipelines

## Endpoints

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/pipelines` | `pipeline.read` | list (project-scoped) |
| POST | `/pipelines` | `pipeline.create` | create pipeline |
| GET | `/pipelines/{id}` | `pipeline.read` | detail |
| PATCH | `/pipelines/{id}` | `pipeline.update` | partial update |
| DELETE | `/pipelines/{id}` | `pipeline.delete` | delete (cascade runs) |
| GET | `/pipelines/fleet` | `pipeline.read` | fleet view (status/health across projects) |
| POST | `/pipelines/generate` | `pipeline.create` | spec → pipeline + nodes (AI-assisted) |
| POST | `/pipelines/{id}/deploy` | `pipeline.deploy` | deploy via governance (creates approval when required) |
| POST | `/pipelines/{id}/deploy/dag` | `pipeline.deploy` | write generated DAG file to the Airflow dags folder |
| GET | `/pipelines/{id}/detail` | `pipeline.read` | aggregated detail (nodes + runs + code artifacts) |

## Generated code safety

Code generation artifacts (`POST /pipelines/generate`, code agent) are stored
as outputs; nothing executes until a governed deploy passes the approval
gate. `POST /pipelines/{id}/deploy/dag` writes to `AIRFLOW_DAGS_FOLDER` only
(`docs/architecture/security-architecture.md`).

Execution lives in [executions.md](executions.md).
