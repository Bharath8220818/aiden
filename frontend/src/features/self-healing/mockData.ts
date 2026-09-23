import { Incident, Diagnosis, ProposedFix, SandboxTest } from './types';

const MIN = 60_000;
const now = Date.now();
const iso = (msAgo: number) => new Date(now - msAgo).toISOString();

/* ------------------------------------------------------------------ */
/* Incidents                                                           */
/* ------------------------------------------------------------------ */

export const MOCK_INCIDENTS: Incident[] = [
  {
    id: 'inc-marketing-attr',
    title: 'marketing_attribution quality gate failure — duplicate touch_id',
    pipelineName: 'marketing_attribution',
    severity: 'critical',
    status: 'detected',
    detectedAt: iso(14 * MIN),
    detectedBy: 'quality_gate',
    affectedDownstream: ['Finance Billing Dashboard', 'CMO Weekly Report'],
    mttrMinutes: null,
    errorSignature: 'QualityGateViolation: uniq(touch_id)',
    errorMessage:
      'EXPECT uniq(touch_id) FAILED — 412 duplicate keys detected in micro-batch. Write halted before MERGE into MART_ATTRIBUTION.',
    occurrences: 3,
  },
  {
    id: 'inc-orders-schema',
    title: 'Schema drift on ecommerce.orders — tax_amount_cents added upstream',
    pipelineName: 'orders_cdc_v1',
    severity: 'high',
    status: 'detected',
    detectedAt: iso(41 * MIN),
    detectedBy: 'schema_drift_watcher',
    affectedDownstream: ['Revenue Forecast Model', 'Customer Retention Churn Predictor'],
    mttrMinutes: null,
    errorSignature: 'SchemaDrift: new_column tax_amount_cents BIGINT',
    errorMessage:
      'Source column added in PostgreSQL WAL stream. Avro schema registry shows backward-compatible change; Spark job currently drops the field silently.',
    occurrences: 1,
  },
  {
    id: 'inc-fraud-latency',
    title: 'fraud_stream_processor p99 latency approaching SLA breach',
    pipelineName: 'fraud_stream_processor',
    severity: 'medium',
    status: 'resolved',
    detectedAt: iso(9 * 60 * MIN),
    detectedBy: 'anomaly_detector',
    affectedDownstream: ['Online ML Fraud Scoring Service'],
    mttrMinutes: 22,
    errorSignature: 'LatencyBudget: p99 228ms / 250ms',
    errorMessage: 'Sustained p99 at 91% of the 250ms budget for 12 minutes due to uneven key distribution across Flink subtasks.',
    occurrences: 2,
  },
  {
    id: 'inc-inventory-backfill',
    title: 'inventory_sync checkpoint corruption after WMS maintenance',
    pipelineName: 'inventory_sync',
    severity: 'high',
    status: 'resolved',
    detectedAt: iso(28 * 60 * MIN),
    detectedBy: 'task_failure',
    affectedDownstream: ['Warehouse Ops Dashboard'],
    mttrMinutes: 38,
    errorSignature: 'CheckpointLost: RocksDB state backend',
    errorMessage: 'State backend failed to restore after broker restart. Manual backfill of the 6-hour gap completed with zero data loss.',
    occurrences: 1,
  },
];

/* ------------------------------------------------------------------ */
/* Diagnosis                                                           */
/* ------------------------------------------------------------------ */

export function buildDiagnosis(incident: Incident): Diagnosis {
  const base: Diagnosis = {
    incidentId: incident.id,
    steps: [
      {
        id: 'ds-1',
        agent: 'Detection Agent',
        action: 'Correlated the failure signature across 30 days of run history',
        finding: `Signature "${incident.errorSignature}" seen ${incident.occurrences}× — regression window identified.`,
        status: 'completed',
        durationMs: 1240,
      },
      {
        id: 'ds-2',
        agent: 'Forensics Agent',
        action: 'Replayed the failing micro-batch against the source snapshot',
        finding: '412 rows arrived with touch_id values already present in the previous batch — a replay, not new data.',
        status: 'completed',
        durationMs: 3480,
      },
      {
        id: 'ds-3',
        agent: 'Dependency Agent',
        action: 'Inspected upstream DAG (ads_ingest_s3 → marketing_attribution)',
        finding: 'ads_ingest_s3 retried at 02:00 and 02:14 after an S3 throttle event, emitting the same touch batch twice.',
        status: 'completed',
        durationMs: 2110,
      },
      {
        id: 'ds-4',
        agent: 'Root-Cause Agent',
        action: 'Synthesized root cause from all agent findings',
        finding: 'Upstream retry without idempotency key causes duplicate emission. The quality gate is correctly halting the write.',
        status: 'completed',
        durationMs: 890,
      },
    ],
    rootCause: {
      title: 'Upstream ads_ingest_s3 retries emit duplicate touch batches (no idempotency key)',
      confidence: 97,
      category: 'dependency',
      explanation:
        'When S3 throttled the ingest at 02:00 UTC, Airflow retried the task 14 minutes later. Because the ingest lacks an idempotency key, the retry re-emitted 412 touch records already present in the mart staging. The quality gate detected the duplicate touch_id keys and correctly halted the MERGE — preventing corrupt attribution data from reaching Finance dashboards.',
      evidence: [
        { source: 'airflow/logs/ads_ingest_s3', detail: 'Retry #1 at 02:00, Retry #2 at 02:14 — both marked success' },
        { source: 'kafka/audit_sink', detail: '412 touch_id values appear exactly twice in the 02:00–02:30 window' },
        { source: 'great_expectations', detail: 'uniq(touch_id) assertion failed with 412 unexpected values' },
      ],
    },
    blastRadius: {
      downstreamPipelines: ['finance_rollup_daily', 'cmo_weekly_report'],
      dashboardsAffected: ['Finance Billing Dashboard', 'CMO Weekly Report'],
      estimatedStaleDataMinutes: 214,
    },
  };

  if (incident.id === 'inc-orders-schema') {
    base.steps[1].finding = 'New column tax_amount_cents (BIGINT, nullable) present in WAL stream since 13:41 UTC.';
    base.steps[2].finding = 'Avro schema registry v1→v2 marked backward-compatible; no consumer break reported.';
    base.steps[3].finding = 'Spark job uses an explicit column select list — the new field is silently dropped, tax reporting will be wrong.';
    base.rootCause = {
      title: 'Silent column drop: orders_cdc_v1 select list omits new tax_amount_cents field',
      confidence: 99,
      category: 'schema_drift',
      explanation:
        'The ecommerce team added tax_amount_cents to support marketplace facilitator taxes. The CDC pipeline uses a hard-coded SELECT list, so the field is dropped at ingestion. Downstream tax reconciliation will silently under-report unless the schema and transform are extended.',
      evidence: [
        { source: 'postgres/WAL', detail: 'ALTER TABLE ecommerce.orders ADD COLUMN tax_amount_cents BIGINT DEFAULT 0 at 13:41' },
        { source: 'schema-registry/orders-cdc', detail: 'v1.7 → v1.8 registered, backward-compatible' },
        { source: 'spark/orders_cdc_v1', detail: 'df.select(...) list contains 8 columns — tax_amount_cents not included' },
      ],
    };
    base.blastRadius = {
      downstreamPipelines: ['finance_rollup_daily'],
      dashboardsAffected: ['Tax Reconciliation Sheet'],
      estimatedStaleDataMinutes: 0,
    };
  }

  return base;
}

/* ------------------------------------------------------------------ */
/* Proposed fixes                                                      */
/* ------------------------------------------------------------------ */

export function buildProposedFix(incident: Incident): ProposedFix {
  if (incident.id === 'inc-orders-schema') {
    return {
      id: `fix-${incident.id}`,
      strategy: 'code_patch',
      strategyLabel: 'Code Patch + Contract Update',
      summary:
        'Extend the CDC select list and Snowflake MERGE with tax_amount_cents, bump the ODCS contract to v1.3.0, and register the new column as Internal classification.',
      patches: [
        {
          fileName: 'pipelines/orders_cdc_v1/job.py',
          language: 'python',
          before: `df = (
    df
    .withColumnRenamed("id", "order_id")
    .withColumn("gross_amount_usd", F.col("gross_amount_cents") / 100.0)
    .withColumn("ingested_at", F.current_timestamp())
    .filter(F.col("status").isin("pending", "paid", "shipped", "delivered", "refunded"))
)`,
          after: `df = (
    df
    .withColumnRenamed("id", "order_id")
    .withColumn("gross_amount_usd", F.col("gross_amount_cents") / 100.0)
+   .withColumn("tax_amount_usd", F.coalesce(F.col("tax_amount_cents"), F.lit(0)) / 100.0)
    .withColumn("ingested_at", F.current_timestamp())
    .filter(F.col("status").isin("pending", "paid", "shipped", "delivered", "refunded"))
)`,
        },
        {
          fileName: 'pipelines/orders_cdc_v1/merge.sql',
          language: 'sql',
          before: `MERGE INTO ANALYTICS_PROD.MART_ORDERS AS tgt
USING orders_cdc_v1_staging AS src
  ON tgt.order_id = src.order_id
WHEN MATCHED THEN UPDATE SET *
WHEN NOT MATCHED THEN INSERT *;`,
          after: `MERGE INTO ANALYTICS_PROD.MART_ORDERS AS tgt
USING orders_cdc_v1_staging AS src
  ON tgt.order_id = src.order_id
WHEN MATCHED THEN UPDATE SET *
WHEN NOT MATCHED THEN INSERT *;

-- AIDEN schema evolution v1.3.0
ALTER TABLE ANALYTICS_PROD.MART_ORDERS
  ADD COLUMN IF NOT EXISTS tax_amount_usd DECIMAL(18,2) DEFAULT 0.00
  COMMENT 'Marketplace facilitator tax, coalesced to zero';`,
        },
      ],
      riskLevel: 'low',
      estimatedFixMinutes: 4,
      requiresBackfill: true,
      backfillWindow: 'Last 6 hours (since 13:41 UTC schema change) — 14 micro-batches',
    };
  }

  return {
    id: `fix-${incident.id}`,
    strategy: 'code_patch',
    strategyLabel: 'Idempotency Key + Dedup Guard',
    summary:
      'Add an idempotency key to the upstream ingest and a window-based dedup guard in the transform, so replays collapse to a single touch record.',
    patches: [
      {
        fileName: 'pipelines/ads_ingest_s3/emit.py',
        language: 'python',
        before: `def emit_batch(events):
    for event in events:
        produce("ads_touch", event)`,
        after: `def emit_batch(events, run_id: str):
+   # Idempotency: skip events already emitted by this logical batch
    seen = load_emitted_keys(run_id)
    for event in events:
+       key = f"{run_id}:{event['touch_id']}"
+       if key in seen:
+           continue
+       mark_emitted(run_id, key)
        produce("ads_touch", event)`,
      },
      {
        fileName: 'pipelines/marketing_attribution/transform.py',
        language: 'python',
        before: `df = df.withColumn("touch_rank", F.rank().over(w))`,
        after: `df = (
    df
+   # Defense-in-depth: collapse replayed touches by keeping the first occurrence
+   .withColumn(
+       "row_num",
+       F.row_number().over(
+           Window.partitionBy("touch_id").orderBy(F.col("ingested_at").asc())
+       ),
+   )
+   .filter(F.col("row_num") == 1)
+   .drop("row_num")
    .withColumn("touch_rank", F.rank().over(w))
)`,
      },
    ],
    riskLevel: 'medium',
    estimatedFixMinutes: 7,
    requiresBackfill: true,
    backfillWindow: '02:00–02:30 UTC window — 1 failed batch + 2 partial',
  };
}

/* ------------------------------------------------------------------ */
/* Sandbox test                                                        */
/* ------------------------------------------------------------------ */

export function buildSandboxResult(_fix: ProposedFix): SandboxTest {
  return {
    stage: 'passed',
    replaysProcessed: 1_204_833,
    productionSnapshot: true,
    assertions: [
      { name: 'uniq(touch_id) on replayed window', passed: true, detail: '0 duplicates across 1.2M replayed rows' },
      { name: 'row-count parity vs production snapshot', passed: true, detail: 'Δ 0 rows after dedup collapse' },
      { name: 'revenue totals match Finance recon', passed: true, detail: '$41,882,104.11 reconciled exactly' },
      { name: 'PII masking intact on all touched columns', passed: true, detail: 'SHA-256 salted hashing verified' },
      { name: 'no downstream schema breaks', passed: true, detail: 'Contract v1.2.0 compatible (additive only)' },
    ],
    logTail: [
      '[sandbox] cloned production snapshot r8s4-2026-09-12T02:30 (412 GB, copy-on-write)',
      '[sandbox] replayed 1,204,833 events across 14 micro-batches',
      '[sandbox] regression suite: 5/5 assertions passed in 187s',
      '[sandbox] patch is safe to promote — zero-cost dry-run MERGE verified',
    ],
  };
}
