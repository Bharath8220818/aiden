import {
  ArchitectureFlowNode,
  ArchitectureFlowEdge,
  ArchitectureValidationReport,
  ArchitectureTemplate,
} from './types';

const now = () => new Date().toISOString();

/* ------------------------------------------------------------------ */
/* Blueprint 1 — Orders CDC (mirrors the Requirements Studio contract) */
/* ------------------------------------------------------------------ */

export const BLUEPRINT_ORDERS_CDC_NODES: ArchitectureFlowNode[] = [
  {
    id: 'src-postgres',
    type: 'architecture',
    position: { x: 40, y: 180 },
    data: {
      label: 'Orders OLTP',
      kind: 'source',
      status: 'healthy',
      technology: 'PostgreSQL 15',
      description: 'Production transactional cluster (WAL replication enabled).',
      metrics: [
        { label: 'DB Size', value: '412 GB' },
        { label: 'Conn Pool', value: '82/100' },
      ],
      contract: {
        contractId: 'ecommerce.orders',
        version: '—',
        rowsPerDay: '2.4M/day',
        schemaFields: 12,
      },
    },
  },
  {
    id: 'cdc-debezium',
    type: 'architecture',
    position: { x: 300, y: 180 },
    data: {
      label: 'CDC Connector',
      kind: 'ingestion',
      status: 'healthy',
      technology: 'Debezium 2.5',
      description: 'Logical replication slot streaming row-level changes.',
      metrics: [
        { label: 'LSN Lag', value: '1.2s' },
        { label: 'Events/s', value: '3.4k' },
      ],
    },
  },
  {
    id: 'kafka-orders',
    type: 'architecture',
    position: { x: 560, y: 180 },
    data: {
      label: 'orders-cdc Topic',
      kind: 'storage',
      status: 'warning',
      technology: 'Kafka 3.6',
      description: 'Avro-encoded CDC events, 6 partitions, RF=3.',
      metrics: [
        { label: 'Partitions', value: '6' },
        { label: 'Retention', value: '7d' },
        { label: 'Lag', value: '12.8k' },
      ],
    },
  },
  {
    id: 'pii-mask',
    type: 'architecture',
    position: { x: 820, y: 60 },
    data: {
      label: 'PII Tokenizer',
      kind: 'processing',
      status: 'healthy',
      technology: 'Spark Structured Streaming',
      description: 'SHA-256 salted hashing for email / phone columns.',
      metrics: [
        { label: 'p99 Latency', value: '310ms' },
        { label: 'Throughput', value: '9.6k rows/s' },
      ],
      contract: {
        contractId: 'ANALYTICS_PROD.MART_ORDERS',
        version: '1.2.0',
        rowsPerDay: '2.4M/day',
        schemaFields: 8,
      },
    },
  },
  {
    id: 'dq-gate',
    type: 'architecture',
    position: { x: 820, y: 320 },
    data: {
      label: 'Quality Gate',
      kind: 'quality',
      status: 'healthy',
      technology: 'Great Expectations',
      description: 'Uniqueness on order_id, non-negative amounts, freshness ≤ 15m.',
      metrics: [
        { label: 'Rules', value: '5' },
        { label: 'Pass Rate', value: '99.7%' },
      ],
    },
  },
  {
    id: 'snowflake-mart',
    type: 'architecture',
    position: { x: 1100, y: 180 },
    data: {
      label: 'MART_ORDERS',
      kind: 'sink',
      status: 'healthy',
      technology: 'Snowflake Enterprise',
      description: 'Analytics warehouse mart consumed by Finance & ML platforms.',
      metrics: [
        { label: 'Freshness', value: '8m' },
        { label: 'Rows', value: '1.8B' },
      ],
      contract: {
        contractId: 'ANALYTICS_PROD.MART_ORDERS',
        version: '1.2.0',
        rowsPerDay: '2.4M/day',
        schemaFields: 8,
      },
    },
  },
  {
    id: 'airflow-dag',
    type: 'architecture',
    position: { x: 560, y: 400 },
    data: {
      label: 'DAG: orders_cdc_v1',
      kind: 'orchestration',
      status: 'idle',
      technology: 'Apache Airflow 2.9',
      description: 'Schedules micro-batch consolidation and backfill runs.',
      metrics: [
        { label: 'Schedule', value: '@continuous' },
        { label: 'Success 24h', value: '99.2%' },
      ],
    },
  },
];

export const BLUEPRINT_ORDERS_CDC_EDGES: ArchitectureFlowEdge[] = [
  { id: 'e1', source: 'src-postgres', target: 'cdc-debezium', label: 'WAL', animated: true, style: { stroke: '#6366F1' } },
  { id: 'e2', source: 'cdc-debezium', target: 'kafka-orders', label: 'Avro', animated: true, style: { stroke: '#6366F1' } },
  { id: 'e3', source: 'kafka-orders', target: 'pii-mask', label: 'consume', animated: true, style: { stroke: '#6366F1' } },
  { id: 'e4', source: 'kafka-orders', target: 'dq-gate', label: 'validate', style: { stroke: '#E5E7EB' } },
  { id: 'e5', source: 'pii-mask', target: 'snowflake-mart', label: 'Snowpipe', animated: true, style: { stroke: '#22C55E' } },
  { id: 'e6', source: 'dq-gate', target: 'snowflake-mart', label: 'certify', style: { stroke: '#22C55E' } },
  { id: 'e7', source: 'airflow-dag', target: 'pii-mask', label: 'orchestrates', style: { stroke: '#F59E0B', strokeDasharray: '6 4' } },
];

/* ------------------------------------------------------------------ */
/* Blueprint 2 — Fraud feature stream                                  */
/* ------------------------------------------------------------------ */

export const BLUEPRINT_FRAUD_NODES: ArchitectureFlowNode[] = [
  {
    id: 'gw-webhooks',
    type: 'architecture',
    position: { x: 40, y: 200 },
    data: {
      label: 'Payment Webhooks',
      kind: 'source',
      status: 'healthy',
      technology: 'Stripe / Adyen',
      description: 'Authorization event ingress from card networks.',
      metrics: [
        { label: 'Events/s', value: '14k' },
        { label: 'p99 Ingress', value: '42ms' },
      ],
    },
  },
  {
    id: 'kafka-payments',
    type: 'architecture',
    position: { x: 300, y: 200 },
    data: {
      label: 'payments.raw',
      kind: 'storage',
      status: 'healthy',
      technology: 'Kafka 3.6',
      description: 'Raw protobuf payment events, 12 partitions.',
      metrics: [
        { label: 'Partitions', value: '12' },
        { label: 'Ingress', value: '14k msg/s' },
      ],
    },
  },
  {
    id: 'flink-velocity',
    type: 'architecture',
    position: { x: 560, y: 200 },
    data: {
      label: 'Velocity Windows',
      kind: 'processing',
      status: 'healthy',
      technology: 'Apache Flink',
      description: '5-minute sliding-window velocity aggregation per card_token.',
      metrics: [
        { label: 'Window', value: '5m slide 30s' },
        { label: 'State', value: 'RocksDB 18GB' },
      ],
      contract: {
        contractId: 'REDIS:FEATURES:CARD_RISK',
        version: '2.0.0',
        rowsPerDay: '1.2B/day',
        schemaFields: 4,
      },
    },
  },
  {
    id: 'redis-features',
    type: 'architecture',
    position: { x: 820, y: 90 },
    data: {
      label: 'Feature Store',
      kind: 'sink',
      status: 'healthy',
      technology: 'Redis Cluster',
      description: 'Sub-250ms feature lookups for online fraud scoring.',
      metrics: [
        { label: 'p99 Get', value: '1.8ms' },
        { label: 'Memory', value: '64 GB' },
      ],
      contract: {
        contractId: 'REDIS:FEATURES:CARD_RISK',
        version: '2.0.0',
        rowsPerDay: '1.2B/day',
        schemaFields: 4,
      },
    },
  },
  {
    id: 'alerts-sink',
    type: 'architecture',
    position: { x: 820, y: 330 },
    data: {
      label: 'Risk Alerts',
      kind: 'sink',
      status: 'warning',
      technology: 'PagerDuty + Kafka',
      description: 'Emits escalation when risk_score > 0.85.',
      metrics: [
        { label: 'Alerts 24h', value: '37' },
        { label: 'Precision', value: '92%' },
      ],
    },
  },
];

export const BLUEPRINT_FRAUD_EDGES: ArchitectureFlowEdge[] = [
  { id: 'f-e1', source: 'gw-webhooks', target: 'kafka-payments', label: 'protobuf', animated: true, style: { stroke: '#6366F1' } },
  { id: 'f-e2', source: 'kafka-payments', target: 'flink-velocity', label: 'consume', animated: true, style: { stroke: '#6366F1' } },
  { id: 'f-e3', source: 'flink-velocity', target: 'redis-features', label: 'features', animated: true, style: { stroke: '#22C55E' } },
  { id: 'f-e4', source: 'flink-velocity', target: 'alerts-sink', label: 'score > 0.85', style: { stroke: '#F59E0B' } },
];

/* ------------------------------------------------------------------ */
/* Shared validation report for the default blueprint                  */
/* ------------------------------------------------------------------ */

export const INITIAL_VALIDATION_REPORT: ArchitectureValidationReport = {
  passed: true,
  checkedAt: now(),
  issues: [
    {
      id: 'iss-1',
      severity: 'warning',
      title: 'Consumer lag on orders-cdc',
      message: 'Partition 3 lag at 12.8k messages (threshold 15k). AIDEN recommends scaling the consumer group.',
      nodeId: 'kafka-orders',
    },
    {
      id: 'iss-2',
      severity: 'info',
      title: 'Contract coverage 50%',
      message: '2 of 4 data-plane hops reference a published ODCS contract. Attaching contracts enables downstream impact analysis.',
    },
  ],
  stats: {
    nodes: 7,
    edges: 7,
    sources: 1,
    sinks: 1,
    orphanNodes: 0,
    cyclicConnections: 0,
    contractCoverage: 50,
  },
};

/* ------------------------------------------------------------------ */
/* Node palette template library                                       */
/* ------------------------------------------------------------------ */

export const ARCHITECTURE_TEMPLATES: ArchitectureTemplate[] = [
  {
    id: 'tpl-orders-cdc',
    name: 'Orders CDC (Snowflake Mart)',
    pattern: 'Streaming CDC',
    description: 'PostgreSQL → Debezium → Kafka → Spark → Snowflake with PII masking and quality gates.',
    nodes: BLUEPRINT_ORDERS_CDC_NODES,
    edges: BLUEPRINT_ORDERS_CDC_EDGES,
  },
  {
    id: 'tpl-fraud',
    name: 'Fraud Velocity Stream',
    pattern: 'Streaming Analytics',
    description: 'Payment webhooks → Kafka → Flink windows → Redis feature store and risk alerting.',
    nodes: BLUEPRINT_FRAUD_NODES,
    edges: BLUEPRINT_FRAUD_EDGES,
  },
];
