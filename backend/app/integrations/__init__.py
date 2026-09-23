"""External platform integrations.

Adapter packages isolate vendor specifics behind narrow interfaces:

- `databases` — warehouse/OLTP adapters implementing `DatabaseAdapter`
  (introspection, safe query execution, stats) selected via `registry.py`.
- `airflow` — execution adapter (deploy / trigger / sync, Sprint 4).

Nothing above these packages imports vendor SDKs directly; services talk to
the façades and the platform error envelope maps adapter failures.
"""
