# Monitoring & Drift

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/monitoring/services` | `monitoring.read` | service health grid (integrations + platform) |
| GET | `/monitoring/series` | `monitoring.read` | telemetry time series (runs, latency, failures) |
| GET | `/monitoring/alerts` | `monitoring.read` | alert feed |
| POST | `/monitoring/alerts/{alert_id}/acknowledge` | `monitoring.read`+write role | acknowledge alert |
| GET | `/monitoring/kafka/topics` | `monitoring.read` | topic lag panel (simulated honestly without Kafka) |
| GET | `/monitoring/quality` | `monitoring.read` | data-quality check results |
| GET | `/drift/status` | `pipeline.read` | drift detection status |
| GET | `/drift/snapshots` | `pipeline.read` | schema snapshot history |
| POST | `/drift/snapshots` | `pipeline.create` | capture a schema snapshot (profiler + hash) |
| GET | `/drift/snapshots/latest` | `pipeline.read` | latest snapshot + diff vs previous |
| GET | `/platform/pulse` | `agent.read` | platform activity feed (drives the pulse UI) |

## Degradation

Kafka lag / quality panels render "simulated" telemetry when the collector
isn't wired (Sprint 4); drift snapshots are real DB reads
(`information_schema` hashed). All monitoring routes are read-only for every
signed-in role (Phase F cross-domain reads).
