import { InfraService, MetricSeries, KafkaTopic, QualityCheck, MonitoringAlert } from './types';

const MIN = 60_000;
const now = Date.now();
const iso = (msAgo: number) => new Date(now - msAgo).toISOString();

/* ------------------------------------------------------------------ */
/* Infrastructure services                                             */
/* ------------------------------------------------------------------ */

export const MOCK_SERVICES: InfraService[] = [
  {
    id: 'svc-airflow',
    name: 'Airflow',
    kind: 'airflow',
    status: 'healthy',
    uptimePercent: 99.98,
    region: 'eu-central-1',
    version: '2.9.1',
    metrics: [
      { label: 'Scheduler heartbeat', value: '3s ago', trendPercent: 0, goodDirection: 'down' },
      { label: 'Queued tasks', value: '14', trendPercent: -22.4, goodDirection: 'down' },
      { label: 'DAG runs / hr', value: '86', trendPercent: 4.2, goodDirection: 'up' },
    ],
  },
  {
    id: 'svc-postgres',
    name: 'PostgreSQL',
    kind: 'postgres',
    status: 'healthy',
    uptimePercent: 99.99,
    region: 'eu-central-1',
    version: '15.6',
    metrics: [
      { label: 'Replica lag', value: '180 ms', trendPercent: -12.1, goodDirection: 'down' },
      { label: 'Active conns', value: '82/100', trendPercent: 6.8, goodDirection: 'down' },
      { label: 'Cache hit', value: '98.9%', trendPercent: 0.3, goodDirection: 'up' },
    ],
  },
  {
    id: 'svc-kafka',
    name: 'Kafka',
    kind: 'kafka',
    status: 'degraded',
    uptimePercent: 99.92,
    region: 'eu-central-1',
    version: '3.6.1',
    metrics: [
      { label: 'Under-replicated', value: '2 partitions', trendPercent: 200, goodDirection: 'down' },
      { label: 'Max consumer lag', value: '12.8k', trendPercent: 18.4, goodDirection: 'down' },
      { label: 'Ingress', value: '14.2k msg/s', trendPercent: 9.1, goodDirection: 'up' },
    ],
  },
  {
    id: 'svc-spark',
    name: 'Spark',
    kind: 'spark',
    status: 'healthy',
    uptimePercent: 99.95,
    region: 'eu-central-1',
    version: '3.5.1',
    metrics: [
      { label: 'Active workers', value: '8', trendPercent: 0, goodDirection: 'up' },
      { label: 'Executors', value: '24', trendPercent: 0, goodDirection: 'up' },
      { label: 'Task fail rate', value: '0.4%', trendPercent: -33.3, goodDirection: 'down' },
    ],
  },
  {
    id: 'svc-snowflake',
    name: 'Snowflake',
    kind: 'snowflake',
    status: 'healthy',
    uptimePercent: 99.97,
    region: 'eu-central-1',
    version: 'Enterprise',
    metrics: [
      { label: 'Queue depth', value: '2 queries', trendPercent: -50, goodDirection: 'down' },
      { label: 'Credits / hr', value: '3.4', trendPercent: -8.2, goodDirection: 'down' },
      { label: 'Avg query', value: '1.9 s', trendPercent: -14.7, goodDirection: 'down' },
    ],
  },
  {
    id: 'svc-redis',
    name: 'Redis',
    kind: 'redis',
    status: 'healthy',
    uptimePercent: 99.99,
    region: 'eu-central-1',
    version: '7.2',
    metrics: [
      { label: 'p99 GET', value: '1.8 ms', trendPercent: -5.2, goodDirection: 'down' },
      { label: 'Memory', value: '64 / 96 GB', trendPercent: 2.1, goodDirection: 'down' },
      { label: 'Evictions', value: '0', trendPercent: 0, goodDirection: 'down' },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Time-series generator                                               */
/* ------------------------------------------------------------------ */

function genSeries(count: number, base: number, variance: number, drift: number, seed = 7): { t: string; value: number }[] {
  const points: { t: string; value: number }[] = [];
  let s = seed;
  const rand = () => {
    s = (s * 137 + 71) % 9973;
    return s / 9973;
  };
  const start = now - count * 5 * MIN;
  for (let i = 0; i < count; i += 1) {
    const t = new Date(start + i * 5 * MIN);
    points.push({
      t: `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`,
      value: Math.max(0, Math.round((base + drift * i + (rand() - 0.5) * variance) * 100) / 100),
    });
  }
  return points;
}

export const MOCK_SERIES: MetricSeries[] = [
  {
    id: 'throughput',
    label: 'Pipeline throughput',
    unit: 'k rows/min',
    color: '#6366F1',
    points: genSeries(36, 210, 60, 1.4, 11),
  },
  {
    id: 'latency',
    label: 'End-to-end latency',
    unit: 's',
    color: '#06B6D4',
    points: genSeries(36, 42, 14, -0.3, 23),
    threshold: 60,
  },
  {
    id: 'error-rate',
    label: 'Error rate',
    unit: '%',
    color: '#EF4444',
    points: genSeries(36, 1.2, 0.9, 0.02, 37),
    threshold: 3,
  },
  {
    id: 'warehouse-credits',
    label: 'Warehouse credits',
    unit: 'credits/hr',
    color: '#22C55E',
    points: genSeries(36, 3.2, 0.8, 0.01, 53),
  },
];

/* ------------------------------------------------------------------ */
/* Kafka topics                                                        */
/* ------------------------------------------------------------------ */

export const MOCK_TOPICS: KafkaTopic[] = [
  {
    id: 'topic-orders-cdc',
    name: 'orders-cdc',
    partitions: 6,
    inRate: 3400,
    outRate: 3150,
    retentionHours: 168,
    status: 'degraded',
    consumerGroups: [
      { id: 'cg-1', group: 'spark_streaming_etl', lag: 12800, lagThreshold: 15000, members: 4 },
      { id: 'cg-2', group: 'audit_sink', lag: 420, lagThreshold: 15000, members: 1 },
    ],
  },
  {
    id: 'topic-payments',
    name: 'payments.raw',
    partitions: 12,
    inRate: 14200,
    outRate: 14180,
    retentionHours: 72,
    status: 'healthy',
    consumerGroups: [
      { id: 'cg-3', group: 'flink_velocity', lag: 310, lagThreshold: 50000, members: 8 },
    ],
  },
  {
    id: 'topic-inventory',
    name: 'inventory-events',
    partitions: 3,
    inRate: 210,
    outRate: 210,
    retentionHours: 336,
    status: 'healthy',
    consumerGroups: [
      { id: 'cg-4', group: 'lakehouse_sink', lag: 12, lagThreshold: 10000, members: 1 },
    ],
  },
  {
    id: 'topic-clickstream',
    name: 'web.clickstream',
    partitions: 6,
    inRate: 8600,
    outRate: 8500,
    retentionHours: 72,
    status: 'healthy',
    consumerGroups: [
      { id: 'cg-5', group: 'session_aggregator', lag: 1900, lagThreshold: 40000, members: 3 },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Data quality                                                        */
/* ------------------------------------------------------------------ */

export const MOCK_QUALITY_CHECKS: QualityCheck[] = [
  {
    id: 'qc-1',
    pipeline: 'orders_cdc_v1',
    dataset: 'MART_ORDERS',
    assertion: 'uniq(order_id) — zero duplicate keys',
    passRate: 99.97,
    severity: 'error',
    lastRunAt: iso(2 * MIN),
    status: 'passing',
  },
  {
    id: 'qc-2',
    pipeline: 'orders_cdc_v1',
    dataset: 'MART_ORDERS',
    assertion: 'freshness(order_timestamp) ≤ 15 min',
    passRate: 100,
    severity: 'error',
    lastRunAt: iso(2 * MIN),
    status: 'passing',
  },
  {
    id: 'qc-3',
    pipeline: 'orders_cdc_v1',
    dataset: 'MART_ORDERS',
    assertion: 'regex(customer_email_hash) ^[a-f0-9]{64}$',
    passRate: 100,
    severity: 'error',
    lastRunAt: iso(2 * MIN),
    status: 'passing',
  },
  {
    id: 'qc-4',
    pipeline: 'fraud_stream_processor',
    dataset: 'features:card_risk',
    assertion: 'latency_p99 ≤ 250 ms',
    passRate: 91.4,
    severity: 'warning',
    lastRunAt: iso(1 * MIN),
    status: 'failing',
  },
  {
    id: 'qc-5',
    pipeline: 'marketing_attribution',
    dataset: 'MART_ATTRIBUTION',
    assertion: 'completeness(touch_id) = 100%',
    passRate: 68.2,
    severity: 'error',
    lastRunAt: iso(14 * 60 * MIN),
    status: 'failing',
  },
  {
    id: 'qc-6',
    pipeline: 'customer_360_etl',
    dataset: 'MART_CUSTOMERS',
    assertion: 'range(lifetime_value_usd) ≥ 0',
    passRate: 99.8,
    severity: 'warning',
    lastRunAt: iso(18 * MIN),
    status: 'flaky',
  },
];

/* ------------------------------------------------------------------ */
/* Alerts                                                              */
/* ------------------------------------------------------------------ */

export const MOCK_ALERTS: MonitoringAlert[] = [
  {
    id: 'alert-1',
    severity: 'critical',
    title: 'marketing_attribution run failed twice',
    source: 'airflow / marketing_attribution',
    message: 'Quality gate failing on completeness(touch_id) at 68.2%. Downstream Finance dashboard is stale.',
    firedAt: iso(14 * 60 * MIN),
    acknowledged: false,
    actionLabel: 'Diagnose',
    actionPath: '/incidents',
  },
  {
    id: 'alert-2',
    severity: 'critical',
    title: 'Kafka consumer lag approaching threshold',
    source: 'kafka / orders-cdc',
    message: 'spark_streaming_etl lag at 12.8k of 15k threshold on partition 3. Auto-scaling proposed.',
    firedAt: iso(6 * MIN),
    acknowledged: false,
    actionLabel: 'Scale consumers',
    actionPath: '/self-healing',
  },
  {
    id: 'alert-3',
    severity: 'warning',
    title: 'Fraud latency SLA breach risk',
    source: 'monitor / features:card_risk',
    message: 'p99 processing latency at 228 ms against 250 ms budget. Sustained for 12 minutes.',
    firedAt: iso(9 * MIN),
    acknowledged: false,
    actionLabel: 'View pipeline',
    actionPath: '/pipelines/manage',
  },
  {
    id: 'alert-4',
    severity: 'warning',
    title: '2 under-replicated Kafka partitions',
    source: 'kafka / cluster health',
    message: 'Broker-2 is rebuilding replicas after a restart. Throughput impact minimal.',
    firedAt: iso(31 * MIN),
    acknowledged: true,
  },
  {
    id: 'alert-5',
    severity: 'info',
    title: 'inventory_sync paused by Priya Nair',
    source: 'pipeline manager',
    message: 'Paused for WMS maintenance window. Resume scheduled after 18:00 UTC.',
    firedAt: iso(6 * 60 * MIN),
    acknowledged: true,
  },
];
