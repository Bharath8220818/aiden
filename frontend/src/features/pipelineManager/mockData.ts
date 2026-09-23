import { Pipeline, PipelineDetail, PipelineRun, RunTask, RunLogEntry } from './types';

const MIN = 60_000;
const now = Date.now();
const iso = (msAgo: number) => new Date(now - msAgo).toISOString();

/* ------------------------------------------------------------------ */
/* Pipelines                                                           */
/* ------------------------------------------------------------------ */

export const MOCK_PIPELINES: Pipeline[] = [
  {
    id: 'pl-orders-cdc',
    name: 'orders_cdc_v1',
    description: 'PostgreSQL → Kafka → Snowflake mart with PII tokenization and quality gate.',
    status: 'running',
    cadence: 'continuous',
    source: 'PostgreSQL — ecommerce.orders',
    target: 'Snowflake — MART_ORDERS',
    owner: 'Bharath',
    tags: ['tier-1', 'cdc', 'gdpr'],
    slaMinutes: 15,
    lastRunAt: iso(2 * MIN),
    nextRunAt: null,
    stats: { successRate24h: 99.2, avgDurationMin: 4.6, runsToday: 214, rowsProcessed24h: 2_412_889 },
  },
  {
    id: 'pl-fraud-stream',
    name: 'fraud_stream_processor',
    description: 'Flink sliding-window velocity features into Redis with risk alert branch.',
    status: 'degraded',
    cadence: 'continuous',
    source: 'Kafka — payments.raw',
    target: 'Redis — features:card_risk',
    owner: 'Bharath',
    tags: ['tier-1', 'streaming', 'pci'],
    slaMinutes: 1,
    lastRunAt: iso(1 * MIN),
    nextRunAt: null,
    stats: { successRate24h: 94.1, avgDurationMin: 0.2, runsToday: 1440, rowsProcessed24h: 1_198_400_000 },
  },
  {
    id: 'pl-sales-daily',
    name: 'sales_daily_pipeline',
    description: 'Nightly revenue aggregation from the mart into the finance warehouse.',
    status: 'healthy',
    cadence: 'daily',
    source: 'Snowflake — MART_ORDERS',
    target: 'Snowflake — MART_REVENUE_DAILY',
    owner: 'Sarah Jenkins',
    tags: ['tier-2', 'finance'],
    slaMinutes: 120,
    lastRunAt: iso(9 * 60 * MIN),
    nextRunAt: iso(-15 * 60 * MIN),
    stats: { successRate24h: 100, avgDurationMin: 18.2, runsToday: 1, rowsProcessed24h: 8_412_000 },
  },
  {
    id: 'pl-customer-360',
    name: 'customer_360_etl',
    description: 'Identity-resolved customer profile build with segment enrichment.',
    status: 'running',
    cadence: 'hourly',
    source: 'PostgreSQL — customers',
    target: 'Snowflake — MART_CUSTOMERS',
    owner: 'Bharath',
    tags: ['tier-2', 'ml-features'],
    slaMinutes: 60,
    lastRunAt: iso(18 * MIN),
    nextRunAt: iso(-42 * MIN),
    stats: { successRate24h: 98.4, avgDurationMin: 11.8, runsToday: 17, rowsProcessed24h: 46_000_000 },
  },
  {
    id: 'pl-inventory-sync',
    name: 'inventory_sync',
    description: 'Warehouse management system inventory deltas into the lakehouse.',
    status: 'paused',
    cadence: 'hourly',
    source: 'MySQL — wms.inventory',
    target: 'S3 — lake/inventory',
    owner: 'Priya Nair',
    tags: ['tier-3', 'ops'],
    slaMinutes: 90,
    lastRunAt: iso(6 * 60 * MIN),
    nextRunAt: null,
    stats: { successRate24h: 97.0, avgDurationMin: 7.4, runsToday: 0, rowsProcessed24h: 0 },
  },
  {
    id: 'pl-marketing-attrib',
    name: 'marketing_attribution',
    description: 'Multi-touch attribution model scoring across paid and organic channels.',
    status: 'failed',
    cadence: 'daily',
    source: 'BigQuery — ads_*',
    target: 'Snowflake — MART_ATTRIBUTION',
    owner: 'Sarah Jenkins',
    tags: ['tier-3', 'marketing'],
    slaMinutes: 240,
    lastRunAt: iso(14 * 60 * MIN),
    nextRunAt: iso(-10 * 60 * MIN),
    stats: { successRate24h: 62.5, avgDurationMin: 34.9, runsToday: 2, rowsProcessed24h: 1_204_000 },
  },
];

/* ------------------------------------------------------------------ */
/* Runs / tasks / logs generators                                      */
/* ------------------------------------------------------------------ */

const TRIGGERS: PipelineRun['trigger'][] = ['schedule', 'manual', 'backfill', 'retry', 'event'];
const WAREHOUSES = ['AIDEN_PROD_WH', 'AIDEN_DEV_WH', 'AIDEN_XS_WH'];

export function buildRuns(pipeline: Pipeline, count = 12): PipelineRun[] {
  const runs: PipelineRun[] = [];
  let cursor = now;

  for (let i = 0; i < count; i += 1) {
    // Weight statuses by pipeline health
    const roll = Math.random() * 100;
    const status: PipelineRun['status'] =
      pipeline.status === 'failed' && i === 0
        ? 'failed'
        : pipeline.status === 'running' && i === 0
        ? 'running'
        : roll < pipeline.stats.successRate24h
        ? 'success'
        : roll < pipeline.stats.successRate24h + 4
        ? 'running'
        : 'failed';

    const durationMin =
      status === 'running' ? null : Math.max(0.2, pipeline.stats.avgDurationMin * (0.7 + Math.random() * 0.7));
    const startedAtMs = cursor - (pipeline.cadence === 'continuous' ? (i + 1) * 9 * MIN : (i + 1) * 60 * MIN * (pipeline.cadence === 'hourly' ? 1 : 6));
    cursor = startedAtMs;

    runs.push({
      id: `${pipeline.id}-run-${1000 + i}`,
      pipelineId: pipeline.id,
      status,
      startedAt: new Date(startedAtMs).toISOString(),
      finishedAt: status === 'running' ? null : new Date(startedAtMs + (durationMin ?? 0) * MIN).toISOString(),
      durationMin: durationMin === null ? null : Math.round(durationMin * 10) / 10,
      trigger: i === 0 ? (pipeline.status === 'failed' ? 'retry' : 'schedule') : TRIGGERS[Math.floor(Math.random() * TRIGGERS.length)],
      rowsProcessed: Math.round(pipeline.stats.rowsProcessed24h / Math.max(1, pipeline.stats.runsToday) * (0.8 + Math.random() * 0.4)),
      bytesProcessed: `${(2 + Math.random() * 90).toFixed(1)} GB`,
      warehouse: WAREHOUSES[Math.floor(Math.random() * WAREHOUSES.length)],
      costUsd: Math.round((0.4 + Math.random() * 6) * 100) / 100,
      attempt: status === 'failed' && Math.random() > 0.6 ? 2 : 1,
    });
  }
  return runs;
}

const TASK_TEMPLATES: Omit<RunTask, 'id' | 'status' | 'durationSec' | 'startedAt' | 'retryCount' | 'error'>[] = [
  { name: 'extract_source', taskType: 'extract' },
  { name: 'apply_pii_masking', taskType: 'transform' },
  { name: 'transform_enrich', taskType: 'transform' },
  { name: 'quality_gate', taskType: 'quality_check' },
  { name: 'merge_upsert_target', taskType: 'load' },
  { name: 'notify_downstream', taskType: 'notify' },
];

export function buildLatestTasks(run: PipelineRun): RunTask[] {
  return TASK_TEMPLATES.map((tpl, idx) => {
    let status: RunTask['status'] = 'success';
    if (run.status === 'running') {
      status = idx < 3 ? 'success' : idx === 3 ? 'running' : 'queued';
    } else if (run.status === 'failed' && idx === 3) {
      status = 'failed';
    } else if (run.status === 'failed' && idx > 3) {
      status = 'skipped';
    }

    return {
      id: `${run.id}-task-${idx}`,
      ...tpl,
      status,
      durationSec: status === 'queued' || status === 'running' ? null : Math.round(8 + Math.random() * 420),
      startedAt: run.startedAt,
      retryCount: status === 'failed' ? 2 : 0,
      error:
        status === 'failed'
          ? {
              type: 'QualityGateViolation',
              message: 'Uniqueness assertion on order_id failed: 412 duplicate keys detected in micro-batch.',
            }
          : undefined,
    };
  });
}

export function buildLogs(pipeline: Pipeline, run: PipelineRun): RunLogEntry[] {
  const entries: RunLogEntry[] = [
    { id: 'l1', ts: run.startedAt, level: 'info', task: 'dag', message: `Run ${run.id.split('-').pop()} triggered by ${run.trigger}.` },
    { id: 'l2', ts: run.startedAt, level: 'info', task: 'extract_source', message: `Connected to ${pipeline.source}. CDC snapshot from LSN 48219374.` },
    { id: 'l3', ts: run.startedAt, level: 'info', task: 'apply_pii_masking', message: 'SHA-256 salted masking applied to 2 columns (customer_email, phone_e164).' },
    { id: 'l4', ts: run.startedAt, level: 'debug', task: 'transform_enrich', message: 'Broadcast join with dim_campaign (12.4 MB) completed.' },
  ];

  if (pipeline.status === 'degraded') {
    entries.push({ id: 'l5', ts: run.startedAt, level: 'warn', task: 'kafka_consumer', message: 'Consumer lag 12.8k on partition 3 — processing at 0.72x real-time.' });
  }

  if (run.status === 'failed') {
    entries.push(
      { id: 'l6', ts: run.startedAt, level: 'error', task: 'quality_gate', message: 'EXPECT uniq(order_id) FAILED — 412 duplicates. Halting write before MERGE.' },
      { id: 'l7', ts: run.startedAt, level: 'error', task: 'dag', message: 'Task quality_gate failed after 2 attempts with exponential backoff. On-failure callback: PagerDuty.' }
    );
  } else {
    entries.push(
      { id: 'l6', ts: run.startedAt, level: 'info', task: 'quality_gate', message: '5/5 expectations passed (99.97% composite score).' },
      { id: 'l7', ts: run.startedAt, level: 'info', task: 'merge_upsert_target', message: `MERGE into ${pipeline.target} — ${run.rowsProcessed.toLocaleString()} rows upserted in ${run.durationMin ?? 1} min.` },
      { id: 'l8', ts: run.startedAt, level: 'info', task: 'dag', message: `Run complete. Cost $${run.costUsd.toFixed(2)} on ${run.warehouse}.` }
    );
  }

  return entries.reverse();
}

export function buildDetail(pipeline: Pipeline): PipelineDetail {
  const runs = buildRuns(pipeline);
  return {
    pipeline,
    runs,
    latestTasks: buildLatestTasks(runs[0]),
    logs: buildLogs(pipeline, runs[0]),
  };
}
