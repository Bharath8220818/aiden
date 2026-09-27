# Airflow (execution runtime — Sprint 4)

`AIRFLOW_DAGS_FOLDER` target for AIDEN-generated pipelines
(`POST /pipelines/{id}/deploy/dag` writes here) and the executor the
execution adapter talks to via `AIRFLOW_URL`.

## Quickstart (local standalone)

```bash
export AIRFLOW_UID=$(id -u)
docker run -it --rm -p 8080:8080 \
  -e _AIRFLOW_WWW_USER_CREATE=true -e _AIRFLOW_WWW_USER_USERNAME=aiden \
  -e _AIRFLOW_WWW_USER_PASSWORD=aiden \
  -v "$PWD/dags:/opt/airflow/dags" \
  apache/airflow:2.10-python3.11 standalone
```

Then point the backend at it:

```bash
AIRFLOW_URL=http://localhost:8080
AIRFLOW_USERNAME=aiden
AIRFLOW_PASSWORD=aiden
```

`/health/full` still reports healthy without it — the execution adapter
honestly reports `mode: unavailable` when unset.

## Files

| Path | Purpose |
|---|---|
| `dags/` | generated + example DAGs land here (currently empty; compose mounts the backend's `backend/airflow/dags`) |
| `requirements.txt` | extra provider packages when the full runtime lands |
| `Dockerfile`, `plugins/`, `config/` | reserved for the full distributed runtime |

Generated-DAG contract: ids derive from the pipeline slug; tasks reference
only declared upstream ids (validated by the A8 validator + `dag_valid`).
