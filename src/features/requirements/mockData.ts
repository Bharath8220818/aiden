import {
  MultimodalInputState,
  IntentAnalysisResult,
  DataContractSpecification,
  ValidationCheckItem,
} from './types';

export interface RequirementPreset {
  id: string;
  name: string;
  domain: string;
  description: string;
  inputState: MultimodalInputState;
  analysis: IntentAnalysisResult;
  contract: DataContractSpecification;
}

export const PRESET_ECOMMERCE_ORDERS: RequirementPreset = {
  id: 'preset-orders-cdc',
  name: 'E-Commerce Real-time Orders CDC',
  domain: 'Commerce & Revenue Analytics',
  description: 'Stream order mutations from PostgreSQL OLTP into Snowflake analytics warehouse with customer 360 enrichment and PII masking.',
  inputState: {
    activeMode: 'text',
    text: {
      rawText:
        'We need an hourly incremental and streaming CDC pipeline that captures customer orders from our PostgreSQL production cluster (`ecommerce.orders`, `ecommerce.order_items`). Each order must be validated for valid billing address and payment authorization. Anonymize user emails and phone numbers for analytics consumers. Output table should be hosted in Snowflake `ANALYTICS_PROD.MART_ORDERS` with a freshness SLA of under 15 minutes and zero missing transaction IDs.',
      enhancedPrompt:
        'Construct a high-throughput Debezium/Kafka CDC ingestion pipeline from PostgreSQL (tables: orders, order_items) to Snowflake Data Cloud. Ingest fields: order_id, customer_id, gross_amount, tax_cents, currency, status, created_at, billing_country. Enforce GDPR/CCPA PII masking on customer email and contact. Synthesize ODCS contract with 99.9% completeness assertions.',
      tags: ['PostgreSQL', 'Snowflake', 'Streaming CDC', 'GDPR', 'Tier 1'],
    },
    audio: {
      durationSeconds: 28,
      transcript:
        "Hey AIDEN, the revenue operations team needs the order checkout stream moved to Snowflake. Make sure order_id is strictly unique, gross_amount must never be negative, and customer email has to be masked with SHA256 before downstream reporting gets access. Freshness SLA must be 15 minutes or less.",
      isRecording: false,
      confidence: 0.96,
      timestamps: [
        { time: '00:02', text: 'Hey AIDEN, the revenue operations team needs the order checkout stream moved to Snowflake.' },
        { time: '00:10', text: 'Make sure order_id is strictly unique and gross_amount is never negative.' },
        { time: '00:18', text: 'Customer email must be masked with SHA256 before downstream reporting gets access.' },
        { time: '00:24', text: 'Freshness SLA must be 15 minutes or less.' },
      ],
    },
    sql: {
      sqlQuery: `-- Source Query / View Definition
SELECT 
  o.id AS order_id,
  o.customer_id,
  o.gross_amount_cents / 100.0 AS gross_amount_usd,
  o.currency_code,
  o.order_status,
  o.created_at AS order_timestamp,
  c.email AS customer_email,
  c.country_code AS billing_country
FROM postgres_prod.ecommerce.orders o
JOIN postgres_prod.ecommerce.customers c ON o.customer_id = c.id
WHERE o.created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
  AND o.order_status NOT IN ('draft', 'abandoned');`,
      dialect: 'postgresql',
      inferredSources: ['postgres_prod.ecommerce.orders', 'postgres_prod.ecommerce.customers'],
      inferredTarget: 'snowflake.analytics_prod.mart_orders',
    },
    diagram: {
      fileName: 'architecture_ecommerce_cdc.png',
      extractedText: ['PostgreSQL DB', 'Debezium CDC', 'Kafka Topic: orders.v1', 'Spark Streaming', 'Snowflake Analytics'],
      detectedNodes: [
        { id: 'n-1', name: 'PostgreSQL Orders OLTP', type: 'source', x: 50, y: 120 },
        { id: 'n-2', name: 'Debezium CDC Connector', type: 'transform', x: 220, y: 120 },
        { id: 'n-3', name: 'Kafka Topic (orders-cdc)', type: 'transform', x: 400, y: 120 },
        { id: 'n-4', name: 'Spark Structured Stream', type: 'transform', x: 580, y: 120 },
        { id: 'n-5', name: 'Snowflake Mart Orders', type: 'sink', x: 780, y: 120 },
      ],
      detectedEdges: [
        { from: 'n-1', to: 'n-2', label: 'WAL replication' },
        { from: 'n-2', to: 'n-3', label: 'Avro events' },
        { from: 'n-3', to: 'n-4', label: 'Kafka consumer' },
        { from: 'n-4', to: 'n-5', label: 'Snowpipe Streaming' },
      ],
    },
    document: {
      fileName: 'orders_schema.ddl',
      fileType: 'ddl',
      parsedFieldsCount: 8,
      fileContent: `CREATE TABLE ecommerce.orders (
    id VARCHAR(64) PRIMARY KEY,
    customer_id VARCHAR(64) NOT NULL,
    gross_amount_cents BIGINT NOT NULL CHECK (gross_amount_cents >= 0),
    tax_cents BIGINT DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(32) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    billing_country VARCHAR(2)
);`,
    },
  },
  analysis: {
    intentTitle: 'PostgreSQL OLTP to Snowflake Real-time Orders CDC',
    pipelinePattern: 'streaming_cdc',
    patternLabel: 'Near-Real-Time Streaming CDC (Debezium + Snowflake)',
    confidenceScore: 98.4,
    executiveSummary:
      'Captured requirement specifies a mission-critical financial order stream from relational PostgreSQL tables into Snowflake Mart with automated GDPR PII tokenization, strict non-negative revenue assertions, and 15-minute freshness SLA.',
    sourceEntities: [
      { name: 'orders', type: 'source', technology: 'PostgreSQL 15', schema: 'ecommerce' },
      { name: 'customers', type: 'lookup', technology: 'PostgreSQL 15', schema: 'ecommerce' },
      { name: 'orders-cdc', type: 'transform', technology: 'Apache Kafka 3.6', schema: 'avro' },
    ],
    targetEntities: [
      { name: 'MART_ORDERS', type: 'sink', technology: 'Snowflake Enterprise', schema: 'ANALYTICS_PROD' },
    ],
    detectedPii: [
      {
        columnName: 'customer_email',
        piiType: 'email',
        riskLevel: 'high',
        recommendedMasking: 'SHA-256 Hash with Salt / Tokenization',
      },
      {
        columnName: 'customer_id',
        piiType: 'name',
        riskLevel: 'medium',
        recommendedMasking: 'Pseudonymized Internal UUID',
      },
    ],
    suggestedSla: {
      latency: '≤ 15 minutes (p99)',
      schedule: 'Continuous micro-batch (30s interval)',
      slaTier: 'Tier 1 (Mission Critical)',
      availability: '99.95% uptime SLA',
    },
    agentSteps: [
      { agent: 'Requirements Agent', action: 'Parsed multimodal inputs & extracted 8 schema columns', status: 'completed' },
      { agent: 'Architect Agent', action: 'Determined Kafka + Spark Streaming topology', status: 'completed' },
      { agent: 'Governance Agent', action: 'Identified customer_email PII and assigned SHA256 masking', status: 'completed' },
      { agent: 'QA Contract Agent', action: 'Synthesized 5 Open Data Contract quality assertions', status: 'completed' },
    ],
  },
  contract: {
    id: 'contract-orders-v1',
    contractVersion: '1.2.0',
    title: 'E-Commerce Orders & Revenue Stream Contract',
    status: 'verified',
    createdAt: '2026-09-12T10:00:00Z',
    updatedAt: '2026-09-12T13:45:00Z',
    datasetName: 'ANALYTICS_PROD.MART_ORDERS',
    physicalTarget: 'snowflake://acme.eu-central-1.snowflakecomputing.com/ANALYTICS_PROD/MART_ORDERS',
    targetFormat: 'Snowflake Table',
    description: 'Enterprise data contract guaranteeing real-time order transactions with validated pricing, hashed customer identifiers, and verified reconciliation SLAs.',
    columns: [
      {
        id: 'c-1',
        name: 'order_id',
        dataType: 'VARCHAR(64)',
        nullable: false,
        isPrimaryKey: true,
        description: 'Unique immutable identifier for order transaction',
        piiClassification: 'Public',
        businessRule: 'Must match UUID v4 regex pattern',
      },
      {
        id: 'c-2',
        name: 'customer_id',
        dataType: 'VARCHAR(64)',
        nullable: false,
        isForeignKey: true,
        description: 'Pseudonymized buyer entity identifier',
        piiClassification: 'Internal',
        businessRule: 'References ANALYTICS_PROD.DIM_CUSTOMERS(customer_id)',
      },
      {
        id: 'c-3',
        name: 'gross_amount_usd',
        dataType: 'DECIMAL(18,2)',
        nullable: false,
        description: 'Total order value before refunds and promotional credits in USD',
        piiClassification: 'Internal',
        businessRule: 'gross_amount_usd >= 0.00',
      },
      {
        id: 'c-4',
        name: 'currency_code',
        dataType: 'VARCHAR(3)',
        nullable: false,
        description: 'ISO-4217 three-letter currency symbol',
        piiClassification: 'Public',
        businessRule: 'IN ("USD", "EUR", "GBP", "CAD", "JPY")',
      },
      {
        id: 'c-5',
        name: 'order_status',
        dataType: 'VARCHAR(32)',
        nullable: false,
        description: 'Lifecycle state of order fulfillment',
        piiClassification: 'Public',
        businessRule: 'IN ("pending", "paid", "shipped", "delivered", "refunded")',
      },
      {
        id: 'c-6',
        name: 'order_timestamp',
        dataType: 'TIMESTAMP_TZ',
        nullable: false,
        description: 'UTC timestamp when transaction was committed to PostgreSQL WAL',
        piiClassification: 'Public',
        businessRule: 'order_timestamp <= CURRENT_TIMESTAMP()',
      },
      {
        id: 'c-7',
        name: 'customer_email_hash',
        dataType: 'VARCHAR(64)',
        nullable: false,
        description: 'Salted SHA-256 cryptographic digest of customer email',
        piiClassification: 'PII',
        maskingPolicy: 'SHA256_WITH_ENTERPRISE_SALT',
        businessRule: 'Length must be exactly 64 hex characters',
      },
      {
        id: 'c-8',
        name: 'billing_country',
        dataType: 'VARCHAR(2)',
        nullable: true,
        description: 'ISO-3166-1 alpha-2 country code',
        piiClassification: 'Public',
        businessRule: 'Length == 2 or NULL',
      },
    ],
    qualityRules: [
      {
        id: 'qr-1',
        ruleType: 'uniqueness',
        targetColumn: 'order_id',
        assertion: 'is_unique(order_id)',
        severity: 'error',
        threshold: '100% unique (zero duplicate keys)',
      },
      {
        id: 'qr-2',
        ruleType: 'completeness',
        targetColumn: 'gross_amount_usd',
        assertion: 'gross_amount_usd IS NOT NULL AND gross_amount_usd >= 0.00',
        severity: 'error',
        threshold: '100% compliant',
      },
      {
        id: 'qr-3',
        ruleType: 'freshness',
        targetColumn: 'order_timestamp',
        assertion: 'MAX(order_timestamp) >= NOW() - INTERVAL 15 MINUTES',
        severity: 'error',
        threshold: 'Lag <= 15 minutes',
      },
      {
        id: 'qr-4',
        ruleType: 'regex_pattern',
        targetColumn: 'customer_email_hash',
        assertion: 'customer_email_hash RLIKE "^[a-f0-9]{64}$"',
        severity: 'error',
        threshold: '100% hashed format',
      },
      {
        id: 'qr-5',
        ruleType: 'custom_sql',
        assertion: 'COUNT(CASE WHEN order_status = "paid" AND gross_amount_usd = 0 THEN 1 END) == 0',
        severity: 'warning',
        threshold: 'Zero anomalies allowed',
      },
    ],
    sla: {
      freshness: '≤ 15 minutes',
      availability: '99.95% query uptime',
      maxLatency: '30 seconds micro-batch pipeline latency',
      updateFrequency: 'Near-Real-Time CDC Stream',
      retentionPeriod: '7 Years Cold Storage (Immutable)',
      checkpointInterval: 'Every 5,000 records or 30s',
    },
    governance: {
      dataDomain: 'Commerce Revenue',
      dataOwner: 'Sarah Jenkins (VP Commerce Data)',
      technicalOwner: 'Bharath (Lead Data Engineer)',
      securityClassification: 'Confidential',
      complianceTags: ['GDPR Article 32', 'SOX Financial Audit', 'PCI-DSS Tokenized'],
      downstreamConsumers: ['Finance Billing Dashboard', 'Revenue Forecast Model', 'Customer Retention Churn Predictor'],
    },
    rawYaml: `schemaVersion: 3.0.0
kind: DataContract
metadata:
  id: contract-orders-v1
  title: E-Commerce Orders & Revenue Stream Contract
  version: 1.2.0
  status: verified
  domain: Commerce Revenue
  owner:
    business: "Sarah Jenkins (VP Commerce Data)"
    technical: "Bharath (Lead Data Engineer)"

dataset:
  physicalName: "ANALYTICS_PROD.MART_ORDERS"
  targetPlatform: "Snowflake Enterprise"
  format: "Snowflake Table"
  freshnessSLA: "15 minutes"

schema:
  columns:
    - name: order_id
      type: VARCHAR(64)
      nullable: false
      primaryKey: true
      description: "Unique immutable identifier for order transaction"
    - name: customer_id
      type: VARCHAR(64)
      nullable: false
      foreignKey: "ANALYTICS_PROD.DIM_CUSTOMERS.customer_id"
      description: "Pseudonymized buyer entity identifier"
    - name: gross_amount_usd
      type: DECIMAL(18,2)
      nullable: false
      description: "Total order value before refunds in USD"
      constraints:
        - "gross_amount_usd >= 0.00"
    - name: currency_code
      type: VARCHAR(3)
      nullable: false
      enum: ["USD", "EUR", "GBP", "CAD", "JPY"]
    - name: order_status
      type: VARCHAR(32)
      nullable: false
      enum: ["pending", "paid", "shipped", "delivered", "refunded"]
    - name: order_timestamp
      type: TIMESTAMP_TZ
      nullable: false
      description: "UTC commit timestamp in PostgreSQL"
    - name: customer_email_hash
      type: VARCHAR(64)
      nullable: false
      piiClassification: "PII"
      masking: "SHA256_WITH_ENTERPRISE_SALT"
    - name: billing_country
      type: VARCHAR(2)
      nullable: true

qualityRules:
  - id: qr-1
    type: uniqueness
    column: order_id
    threshold: "100%"
  - id: qr-2
    type: completeness
    column: gross_amount_usd
    threshold: "100%"
  - id: qr-3
    type: freshness
    column: order_timestamp
    threshold: "<= 15 minutes"
  - id: qr-4
    type: regex
    column: customer_email_hash
    pattern: "^[a-f0-9]{64}$"

sla:
  availability: "99.95%"
  freshness: "15m"
  maxLatency: "30s"`,
  },
};

export const PRESET_FRAUD_STREAM: RequirementPreset = {
  id: 'preset-fraud-stream',
  name: 'Financial Fraud Detection Stream & Feature Store',
  domain: 'Risk & Fraud Engineering',
  description: 'Sub-second Kafka payment stream ingesting card swipes, computing 5-minute velocity features, and checking isolation forest models.',
  inputState: {
    activeMode: 'text',
    text: {
      rawText:
        'Capture payment events from Kafka topic `payments.card_authorizations`. Filter out test merchants, calculate 5-minute rolling transaction count and cumulative velocity per card_hash. Push real-time features to Redis feature store and alert sink if risk_score > 0.85 within 250 milliseconds.',
      enhancedPrompt:
        'Develop real-time payment risk pipeline using Kafka Streams / Flink with sliding window aggregation over 300s window. Schema: transaction_id, card_hash, merchant_mcc, amount_usd, velocity_5m, is_declined. PII: card_hash must use PCI-DSS token.',
      tags: ['Kafka', 'Redis', 'Sub-second', 'Risk Engine', 'Tier 1'],
    },
    audio: {
      durationSeconds: 20,
      transcript: 'Real time fraud scoring: We need card swipes from Kafka topic payments, compute velocity over five minutes, and emit to Redis under 250ms.',
      isRecording: false,
      confidence: 0.94,
      timestamps: [{ time: '00:05', text: 'Real time fraud scoring on card swipes' }],
    },
    sql: {
      sqlQuery: `SELECT 
  t.transaction_id,
  t.card_token,
  t.amount_cents / 100.0 AS amount_usd,
  t.merchant_category_code,
  COUNT(*) OVER(PARTITION BY t.card_token ORDER BY t.created_at RANGE BETWEEN INTERVAL '5' MINUTE PRECEDING AND CURRENT ROW) AS velocity_5m
FROM kafka_stream.payments_v1 t;`,
      dialect: 'spark_sql',
      inferredSources: ['kafka_stream.payments_v1'],
      inferredTarget: 'redis://feature-store-prod:6379/features:card_risk',
    },
    diagram: {
      fileName: 'fraud_stream_architecture.png',
      extractedText: ['Payment Gateway', 'Kafka Event Bus', 'Flink Complex Event Processing', 'Redis Feature Store', 'Fraud Scoring Model'],
      detectedNodes: [
        { id: 'n-1', name: 'Stripe / Adyen Webhooks', type: 'source', x: 50, y: 100 },
        { id: 'n-2', name: 'Kafka Topic payments.raw', type: 'transform', x: 250, y: 100 },
        { id: 'n-3', name: 'Flink Sliding Windows', type: 'transform', x: 450, y: 100 },
        { id: 'n-4', name: 'Redis Cache (Feature Store)', type: 'sink', x: 680, y: 100 },
      ],
      detectedEdges: [
        { from: 'n-1', to: 'n-2' },
        { from: 'n-2', to: 'n-3' },
        { from: 'n-3', to: 'n-4' },
      ],
    },
    document: {
      fileName: 'payment_event.json',
      fileType: 'json_schema',
      parsedFieldsCount: 6,
      fileContent: `{
  "type": "object",
  "properties": {
    "transaction_id": { "type": "string" },
    "card_token": { "type": "string" },
    "amount_cents": { "type": "integer" },
    "merchant_mcc": { "type": "string" },
    "ip_address": { "type": "string" }
  },
  "required": ["transaction_id", "card_token", "amount_cents"]
}`,
    },
  },
  analysis: {
    intentTitle: 'Sub-Second Financial Payment Stream & Feature Ingestion',
    pipelinePattern: 'streaming_analytics',
    patternLabel: 'Ultra Low-Latency Streaming Analytics (Kafka + Flink + Redis)',
    confidenceScore: 97.8,
    executiveSummary:
      'Sub-second payment monitoring pipeline capturing debit/credit authorization events, computing sliding window aggregation features, and guaranteeing sub-250ms lookup latency in Redis.',
    sourceEntities: [
      { name: 'payments_v1', type: 'source', technology: 'Kafka Topic', schema: 'protobuf' },
    ],
    targetEntities: [
      { name: 'card_risk_features', type: 'sink', technology: 'Redis Cluster', schema: 'key-value' },
    ],
    detectedPii: [
      {
        columnName: 'card_token',
        piiType: 'financial',
        riskLevel: 'high',
        recommendedMasking: 'PCI-DSS Tokenized Reference (No Raw PAN)',
      },
    ],
    suggestedSla: {
      latency: '≤ 250ms (p99)',
      schedule: 'Event-driven real-time stream',
      slaTier: 'Tier 1 (Mission Critical)',
      availability: '99.99% availability SLA',
    },
    agentSteps: [
      { agent: 'Requirements Agent', action: 'Classified streaming risk topology', status: 'completed' },
      { agent: 'Architect Agent', action: 'Selected Flink Stateful Stream processor', status: 'completed' },
      { agent: 'Governance Agent', action: 'PCI-DSS card token compliance verified', status: 'completed' },
    ],
  },
  contract: {
    id: 'contract-fraud-v1',
    contractVersion: '2.0.0',
    title: 'Payment Risk & Velocity Feature Stream Contract',
    status: 'verified',
    createdAt: '2026-09-12T09:00:00Z',
    updatedAt: '2026-09-12T12:30:00Z',
    datasetName: 'REDIS:FEATURES:CARD_RISK',
    physicalTarget: 'redis://feature-store-prod:6379/features:card_risk',
    targetFormat: 'Kafka Topic',
    description: 'Sub-second payment fraud detection contract specifying rolling velocity windows and strict PCI-DSS sanitization.',
    columns: [
      {
        id: 'f-1',
        name: 'transaction_id',
        dataType: 'VARCHAR(64)',
        nullable: false,
        isPrimaryKey: true,
        description: 'Payment network authorization identifier',
        piiClassification: 'Public',
      },
      {
        id: 'f-2',
        name: 'card_token',
        dataType: 'VARCHAR(32)',
        nullable: false,
        description: 'Tokenized PCI-compliant vault reference',
        piiClassification: 'PII',
        maskingPolicy: 'PCI_VAULT_TOKEN',
      },
      {
        id: 'f-3',
        name: 'amount_usd',
        dataType: 'DECIMAL(12,2)',
        nullable: false,
        description: 'Transaction authorization amount in USD',
        piiClassification: 'Internal',
      },
      {
        id: 'f-4',
        name: 'velocity_5m',
        dataType: 'INTEGER',
        nullable: false,
        description: 'Number of transactions authorized on card in preceding 5 minutes',
        piiClassification: 'Internal',
      },
    ],
    qualityRules: [
      {
        id: 'fq-1',
        ruleType: 'completeness',
        targetColumn: 'transaction_id',
        assertion: 'transaction_id IS NOT NULL',
        severity: 'error',
        threshold: '100%',
      },
      {
        id: 'fq-2',
        ruleType: 'freshness',
        assertion: 'processing_latency <= 250ms',
        severity: 'error',
        threshold: 'p99 <= 250ms',
      },
    ],
    sla: {
      freshness: '≤ 250ms',
      availability: '99.99%',
      maxLatency: '250ms p99',
      updateFrequency: 'Real-time Event Stream',
      retentionPeriod: '30 Days in Feature Store',
      checkpointInterval: 'Continuous Checkpointed RocksDB State',
    },
    governance: {
      dataDomain: 'Risk & Fraud',
      dataOwner: 'Markus Weber (Chief Risk Officer)',
      technicalOwner: 'Bharath (Lead Data Engineer)',
      securityClassification: 'Restricted',
      complianceTags: ['PCI-DSS Level 1', 'GLBA Financial Privacy'],
      downstreamConsumers: ['Online ML Fraud Scoring Service', 'Suspicious Activity Escalation Bot'],
    },
    rawYaml: `schemaVersion: 3.0.0
kind: DataContract
metadata:
  id: contract-fraud-v1
  title: Payment Risk & Velocity Feature Stream Contract
  version: 2.0.0
  status: verified
  domain: Risk & Fraud
dataset:
  physicalName: "REDIS:FEATURES:CARD_RISK"
  format: "Redis Feature Store / Kafka Topic"
schema:
  columns:
    - name: transaction_id
      type: VARCHAR(64)
      primaryKey: true
    - name: card_token
      type: VARCHAR(32)
      piiClassification: "PII"
    - name: amount_usd
      type: DECIMAL(12,2)
    - name: velocity_5m
      type: INTEGER
sla:
  freshness: "250ms"
  availability: "99.99%"`,
  },
};

export const INITIAL_VALIDATION_CHECKS: ValidationCheckItem[] = [
  {
    id: 'vc-1',
    category: 'Schema',
    title: 'Column Types & Primary Key Definition',
    passed: true,
    message: 'Primary key (order_id) explicitly declared with non-nullable constraints.',
  },
  {
    id: 'vc-2',
    category: 'Quality',
    title: 'Completeness & Assertion Thresholds',
    passed: true,
    message: '5 quality assertions defined covering uniqueness, range, and format.',
  },
  {
    id: 'vc-3',
    category: 'SLA',
    title: 'Freshness & Latency Guarantees',
    passed: true,
    message: 'SLA set to ≤ 15 minutes with continuous micro-batching.',
  },
  {
    id: 'vc-4',
    category: 'Security',
    title: 'PII Identification & Masking Policies',
    passed: true,
    message: 'Identified 2 PII attributes (customer_email, customer_id); cryptographic SHA-256 masking applied.',
  },
];
