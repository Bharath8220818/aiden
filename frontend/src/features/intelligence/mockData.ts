import { Agent, SwarmMessage, KnowledgeDoc, RetrievedChunk, McpServer } from './types';

const MIN = 60_000;
const now = Date.now();
const iso = (msAgo: number) => new Date(now - msAgo).toISOString();

/* ------------------------------------------------------------------ */
/* Agents                                                              */
/* ------------------------------------------------------------------ */

export const MOCK_AGENTS: Agent[] = [
  {
    id: 'agent-requirements',
    name: 'Requirements Agent',
    role: 'requirements',
    status: 'working',
    model: 'gpt-4.1',
    description: 'Extracts structured intent from multimodal input and synthesizes ODCS data contracts.',
    capabilities: ['intent extraction', 'PII classification', 'contract synthesis', 'SLA inference'],
    stats: { tasksCompleted: 1_284, successRate: 96.4, avgTaskMinutes: 2.1, tokensToday: 184_220, tokenBudget: 400_000 },
    currentTask: 'Analyzing voice transcript → contract for “EU marketing consent stream”',
    toolGrants: [
      { tool: 'schema_introspect', server: 'mcp-snowflake', permission: 'read', enabled: true },
      { tool: 'contract_publish', server: 'mcp-contracts', permission: 'write', enabled: true },
    ],
    memory: [
      { id: 'm1', kind: 'semantic', content: '“gross_amount” is always pre-tax; tax fields are separate columns.', ts: iso(44 * MIN), tokens: 42 },
      { id: 'm2', kind: 'episodic', content: 'Bharath prefers SHA-256 salted hashing over tokenization for email PII.', ts: iso(3 * 60 * MIN), tokens: 38 },
      { id: 'm3', kind: 'procedural', content: 'Finance contracts always require SOX compliance tag before publish.', ts: iso(26 * 60 * MIN), tokens: 51 },
    ],
    trajectory: [
      { id: 't1', ts: iso(6 * MIN), thought: 'The transcript mentions “consent” — this is GDPR scope, flag governance.', action: 'classify_intent', toolUsed: null, observation: 'domain=risk, pii=high', tokens: 812 },
      { id: 't2', ts: iso(5 * MIN), thought: 'Need the source schema to anchor the contract columns.', action: 'introspect', toolUsed: 'schema_introspect', observation: '8 columns found on marketing.consents', tokens: 1204 },
      { id: 't3', ts: iso(4 * MIN), thought: 'Drafting contract v0.1 with masking policy on email_hash.', action: 'synthesize_contract', toolUsed: null, observation: 'contract draft ready for QA', tokens: 2210 },
    ],
  },
  {
    id: 'agent-architect',
    name: 'Architect Agent',
    role: 'architecture',
    status: 'active',
    model: 'claude-4-sonnet',
    description: 'Designs pipeline topologies, selects technologies, and validates DAG integrity.',
    capabilities: ['topology synthesis', 'technology selection', 'DAG validation', 'cost modeling'],
    stats: { tasksCompleted: 892, successRate: 98.1, avgTaskMinutes: 3.4, tokensToday: 96_400, tokenBudget: 300_000 },
    currentTask: null,
    toolGrants: [
      { tool: 'blueprint_generate', server: 'mcp-contracts', permission: 'write', enabled: true },
      { tool: 'cost_catalog', server: 'mcp-cloudops', permission: 'read', enabled: true },
    ],
    memory: [
      { id: 'm1', kind: 'procedural', content: 'For >5k msg/s streams prefer Flink over Spark Structured Streaming.', ts: iso(2 * 60 * MIN), tokens: 33 },
      { id: 'm2', kind: 'semantic', content: 'Acme Kafka clusters are provisioned with RF=3 and 7-day retention.', ts: iso(2 * 24 * 60 * MIN), tokens: 29 },
    ],
    trajectory: [
      { id: 't1', ts: iso(52 * MIN), thought: 'Payments velocity at 14k msg/s — windowing must be stateful.', action: 'select_topology', toolUsed: null, observation: 'Kafka+Flink+Redis selected', tokens: 980 },
    ],
  },
  {
    id: 'agent-builder',
    name: 'Builder Agent',
    role: 'builder',
    status: 'idle',
    model: 'gpt-4.1',
    description: 'Generates production PySpark, SQL, Airflow, and Kafka artifacts from blueprints.',
    capabilities: ['codegen', 'unit-test synthesis', 'idempotent writes'],
    stats: { tasksCompleted: 2_140, successRate: 99.2, avgTaskMinutes: 4.8, tokensToday: 41_800, tokenBudget: 500_000 },
    currentTask: null,
    toolGrants: [
      { tool: 'repo_commit', server: 'mcp-github', permission: 'write', enabled: true },
      { tool: 'warehouse_ddl', server: 'mcp-snowflake', permission: 'write', enabled: false },
    ],
    memory: [
      { id: 'm1', kind: 'procedural', content: 'Always emit MERGE with a dedupe CTE for CDC targets.', ts: iso(5 * 60 * MIN), tokens: 27 },
    ],
    trajectory: [
      { id: 't1', ts: iso(3 * 60 * MIN), thought: 'Blueprint validated; generating 5 artifacts.', action: 'codegen', toolUsed: 'repo_commit', observation: 'orders_cdc_v1 pushed to feature branch', tokens: 6402 },
    ],
  },
  {
    id: 'agent-qa',
    name: 'QA Contract Agent',
    role: 'qa',
    status: 'active',
    model: 'claude-4-haiku',
    description: 'Verifies contracts, runs expectation suites, and gates deployments.',
    capabilities: ['expectation synthesis', 'regression replay', 'contract diffing'],
    stats: { tasksCompleted: 3_902, successRate: 97.7, avgTaskMinutes: 1.2, tokensToday: 210_600, tokenBudget: 350_000 },
    currentTask: 'Sandbox regression for heal-inc-marketing-attr patch',
    toolGrants: [
      { tool: 'sandbox_exec', server: 'mcp-cloudops', permission: 'admin', enabled: true },
      { tool: 'warehouse_query', server: 'mcp-snowflake', permission: 'read', enabled: true },
    ],
    memory: [
      { id: 'm1', kind: 'episodic', content: 'uniq assertions on replayed batches must exclude the 02:00–02:30 dedup window.', ts: iso(60 * MIN), tokens: 46 },
    ],
    trajectory: [
      { id: 't1', ts: iso(18 * MIN), thought: 'Patch changes partitioning — replay the 14 affected micro-batches.', action: 'replay_window', toolUsed: 'sandbox_exec', observation: '1.2M events, 5/5 assertions green', tokens: 1520 },
    ],
  },
  {
    id: 'agent-healer',
    name: 'Healer Agent',
    role: 'healer',
    status: 'working',
    model: 'claude-4-sonnet',
    description: 'Runs the incident loop: diagnose, patch, sandbox, request approval, deploy, verify.',
    capabilities: ['RCA correlation', 'AST patching', 'backfill planning', 'auto-rollback'],
    stats: { tasksCompleted: 341, successRate: 91.8, avgTaskMinutes: 9.6, tokensToday: 322_100, tokenBudget: 600_000 },
    currentTask: 'heal-inc-marketing-attr — awaiting engineer approval',
    toolGrants: [
      { tool: 'sandbox_exec', server: 'mcp-cloudops', permission: 'admin', enabled: true },
      { tool: 'deploy_dag', server: 'mcp-airflow', permission: 'write', enabled: true },
      { tool: 'page_oncall', server: 'mcp-slack', permission: 'write', enabled: true },
    ],
    memory: [
      { id: 'm1', kind: 'episodic', content: 'S3 throttle at 02:00 caused ads_ingest_s3 double-emit; dedup guard now standard for attribution flows.', ts: iso(30 * MIN), tokens: 64 },
      { id: 'm2', kind: 'semantic', content: 'PagerDuty escalation for tier-1 pipelines goes to #data-oncall with 5-min ack SLA.', ts: iso(4 * 24 * 60 * MIN), tokens: 41 },
    ],
    trajectory: [
      { id: 't1', ts: iso(14 * MIN), thought: 'Quality gate signature matches the replay-duplicate pattern from memory.', action: 'correlate', toolUsed: null, observation: 'root cause: upstream retry, 97% confidence', tokens: 2210 },
      { id: 't2', ts: iso(11 * MIN), thought: 'Patching emit.py with run_id idempotency and transform dedup.', action: 'synthesize_patch', toolUsed: null, observation: '2-file patch ready', tokens: 4180 },
      { id: 't3', ts: iso(8 * MIN), thought: 'Verifying against production snapshot before asking for approval.', action: 'sandbox_verify', toolUsed: 'sandbox_exec', observation: '5/5 assertions passed', tokens: 1890 },
    ],
  },
];

export const MOCK_SWARM_MESSAGES: SwarmMessage[] = [
  { id: 'sm-1', from: 'requirements', to: 'architecture', kind: 'handoff', summary: 'Contract orders v1.3.0 verified — blueprint request queued.', ts: iso(26 * MIN) },
  { id: 'sm-2', from: 'healer', to: 'qa', kind: 'question', summary: 'Is the 02:00 dedup window exclusion still required for uniq assertions?', ts: iso(12 * MIN) },
  { id: 'sm-3', from: 'qa', to: 'healer', kind: 'result', summary: 'Yes — and sandbox regression for your patch passed 5/5.', ts: iso(10 * MIN) },
  { id: 'sm-4', from: 'healer', to: 'broadcast', kind: 'approval_request', summary: 'marketing_attribution patch awaiting engineer approval (medium risk).', ts: iso(8 * MIN) },
  { id: 'sm-5', from: 'orchestrator', to: 'builder', kind: 'handoff', summary: 'New blueprint approved — generate artifacts for fraud-velocity-v2.', ts: iso(4 * MIN) },
];

/* ------------------------------------------------------------------ */
/* Knowledge base                                                      */
/* ------------------------------------------------------------------ */

export const MOCK_DOCS: KnowledgeDoc[] = [
  {
    id: 'kb-1',
    title: 'Postmortem — ads_ingest_s3 duplicate emission (2026-09-12)',
    kind: 'postmortem',
    source: 'incidents/inc-marketing-attr',
    updatedAt: iso(30 * MIN),
    chunks: 12,
    tokens: 4820,
    embeddingModel: 'text-embedding-3-large',
    tags: ['idempotency', 's3', 'retries', 'attribution'],
    excerpt:
      'Root cause: S3 throttle triggered Airflow retries without an idempotency key, double-emitting 412 touch records. Fix: run_id-keyed emit dedup + window row_number guard in transform.',
    retrievalCount: 47,
  },
  {
    id: 'kb-2',
    title: 'Data Contract — ANALYTICS_PROD.MART_ORDERS v1.2.0',
    kind: 'data_contract',
    source: 'contracts/contract-orders-v1',
    updatedAt: iso(5 * 60 * MIN),
    chunks: 8,
    tokens: 3110,
    embeddingModel: 'text-embedding-3-large',
    tags: ['orders', 'snowflake', 'tier-1', 'gdpr'],
    excerpt:
      '8 columns, 5 quality assertions, 15-minute freshness SLA. customer_email_hash is PII with SHA256_WITH_ENTERPRISE_SALT masking. Consumers: Finance Billing, Revenue Forecast, Churn Predictor.',
    retrievalCount: 312,
  },
  {
    id: 'kb-3',
    title: 'Runbook — Kafka consumer lag escalation',
    kind: 'runbook',
    source: 'runbooks/kafka-lag',
    updatedAt: iso(2 * 24 * 60 * MIN),
    chunks: 6,
    tokens: 2240,
    embeddingModel: 'text-embedding-3-large',
    tags: ['kafka', 'lag', 'escalation', 'tier-1'],
    excerpt:
      'If lag > 80% of threshold for 10 minutes: scale consumer group members ×2; if sustained 30 minutes, page data-oncall and consider partition rebalance. Never restart brokers during tier-1 windows.',
    retrievalCount: 89,
  },
  {
    id: 'kb-4',
    title: 'Schema — ecommerce.orders (PostgreSQL 15)',
    kind: 'schema_doc',
    source: 'databases/postgres-prod/ecommerce',
    updatedAt: iso(41 * MIN),
    chunks: 4,
    tokens: 1180,
    embeddingModel: 'text-embedding-3-large',
    tags: ['orders', 'postgres', 'cdc', 'source-of-truth'],
    excerpt:
      '612M rows, 96 GB. Columns: id (PK), customer_id (FK), gross_amount_cents, tax_amount_cents (added 2026-09-12), currency_code, status, created_at. WAL logical replication enabled.',
    retrievalCount: 520,
  },
  {
    id: 'kb-5',
    title: 'Metric definition — gross_revenue_usd',
    kind: 'metric_definition',
    source: 'metrics/revenue',
    updatedAt: iso(7 * 24 * 60 * MIN),
    chunks: 2,
    tokens: 640,
    embeddingModel: 'text-embedding-3-large',
    tags: ['finance', 'revenue', 'semantics'],
    excerpt:
      'gross_revenue_usd = SUM(gross_amount_usd) over paid+shipped+delivered orders in window. Excludes refunds (tracked separately). Pre-tax by definition — do not add tax_amount_usd.',
    retrievalCount: 204,
  },
  {
    id: 'kb-6',
    title: 'Incident pattern — replay duplicates on CDC sinks',
    kind: 'incident_pattern',
    source: 'patterns/replay-duplicates',
    updatedAt: iso(28 * MIN),
    chunks: 5,
    tokens: 1670,
    embeddingModel: 'text-embedding-3-large',
    tags: ['cdc', 'idempotency', 'dedup', 'pattern'],
    excerpt:
      'Signature: uniqueness assertion fails shortly after upstream retry events. Prevention: emit-side idempotency keys + ingest-side window dedup. Detected 3× across attribution and inventory flows.',
    retrievalCount: 66,
  },
];

export function buildRetrieval(query: string): RetrievedChunk[] {
  const q = query.toLowerCase();

  const score = (doc: KnowledgeDoc, keywords: string[]) => {
    const hits = keywords.filter((k) => q.includes(k) || k.split(' ').some((w) => w.length > 3 && q.includes(w))).length;
    return Math.min(0.98, 0.52 + hits * 0.14);
  };

  const candidates: RetrievedChunk[] = [
    {
      docId: 'kb-1',
      docTitle: MOCK_DOCS[0].title,
      kind: 'postmortem',
      score: score(MOCK_DOCS[0], ['duplicate', 'retry', 'idempotency', 's3', 'touch']),
      content:
        '…Airflow retried ads_ingest_s3 at 02:00 and 02:14 after an S3 throttle event. Because emit_batch lacked an idempotency key, both retries produced the full touch batch. The quality gate (uniq(touch_id)) halted the MERGE. Resolution added run_id-keyed dedup…',
      ts: iso(30 * MIN),
    },
    {
      docId: 'kb-6',
      docTitle: MOCK_DOCS[5].title,
      kind: 'incident_pattern',
      score: score(MOCK_DOCS[5], ['duplicate', 'retry', 'dedup', 'cdc', 'replay']),
      content:
        '…Prevention template: (1) emit-side idempotency keyed on run_id + record key, (2) ingest-side Window.partitionBy(record_key).orderBy(ingested_at) row_number==1 filter, (3) contract assertion uniq(record_key) with severity=error…',
      ts: iso(28 * MIN),
    },
    {
      docId: 'kb-2',
      docTitle: MOCK_DOCS[1].title,
      kind: 'data_contract',
      score: score(MOCK_DOCS[1], ['orders', 'contract', 'snowflake', 'mart']),
      content:
        '…MART_ORDERS carries order_id VARCHAR(64) PK with a 100% uniqueness assertion (severity error) and a 15-minute freshness SLA. Write path is MERGE-upsert from orders_cdc_v1_staging with _dedupe_rank = 1…',
      ts: iso(5 * 60 * MIN),
    },
    {
      docId: 'kb-3',
      docTitle: MOCK_DOCS[2].title,
      kind: 'runbook',
      score: score(MOCK_DOCS[2], ['kafka', 'lag', 'scale', 'consumer']),
      content:
        '…Scale-out procedure: kafka-consumer-groups --describe to confirm per-partition skew; double group members only if max lag > 80% threshold for 10 min; page on-call if sustained 30 min…',
      ts: iso(2 * 24 * 60 * MIN),
    },
    {
      docId: 'kb-4',
      docTitle: MOCK_DOCS[3].title,
      kind: 'schema_doc',
      score: score(MOCK_DOCS[3], ['orders', 'schema', 'postgres', 'column']),
      content:
        '…tax_amount_cents BIGINT DEFAULT 0 added 2026-09-12 13:41 UTC (marketplace facilitator taxes). CDC consumers must coalesce to zero; gross_amount_cents remains pre-tax…',
      ts: iso(41 * MIN),
    },
    {
      docId: 'kb-5',
      docTitle: MOCK_DOCS[4].title,
      kind: 'metric_definition',
      score: score(MOCK_DOCS[4], ['revenue', 'gross', 'metric', 'definition']),
      content:
        '…gross_revenue_usd is pre-tax. tax_amount_usd must never be added to it. Refunds are excluded at query time via order_status IN (paid, shipped, delivered)…',
      ts: iso(7 * 24 * 60 * MIN),
    },
  ];

  return candidates.sort((a, b) => b.score - a.score).slice(0, 4);
}

/* ------------------------------------------------------------------ */
/* MCP servers                                                         */
/* ------------------------------------------------------------------ */

export const MOCK_MCP_SERVERS: McpServer[] = [
  {
    id: 'mcp-snowflake',
    name: 'Snowflake Warehouse',
    transport: 'http',
    endpoint: 'https://mcp.acme.internal/snowflake',
    status: 'connected',
    authMode: 'oauth',
    lastSyncAt: iso(2 * MIN),
    toolsAllowedFor: ['requirements', 'qa', 'builder', 'optimizer'],
    tools: [
      { name: 'schema_introspect', description: 'List databases, schemas, tables, and columns', kind: 'source', scopes: ['read'], calls24h: 1284, avgLatencyMs: 210 },
      { name: 'warehouse_query', description: 'Run read-only SQL against approved warehouses', kind: 'utility', scopes: ['read'], calls24h: 3420, avgLatencyMs: 640 },
      { name: 'warehouse_ddl', description: 'Apply ALTER/CREATE with approval gating', kind: 'sink', scopes: ['write', 'admin'], calls24h: 14, avgLatencyMs: 890 },
    ],
  },
  {
    id: 'mcp-github',
    name: 'GitHub Repositories',
    transport: 'http',
    endpoint: 'https://mcp.acme.internal/github',
    status: 'connected',
    authMode: 'oauth',
    lastSyncAt: iso(6 * MIN),
    toolsAllowedFor: ['builder', 'healer'],
    tools: [
      { name: 'repo_commit', description: 'Commit generated artifacts to feature branches', kind: 'utility', scopes: ['write'], calls24h: 96, avgLatencyMs: 720 },
      { name: 'pr_create', description: 'Open pull requests with AIDEN-generated summaries', kind: 'utility', scopes: ['write'], calls24h: 22, avgLatencyMs: 530 },
      { name: 'ci_status', description: 'Read CI pipeline status for generated code', kind: 'utility', scopes: ['read'], calls24h: 410, avgLatencyMs: 180 },
    ],
  },
  {
    id: 'mcp-airflow',
    name: 'Airflow Orchestrator',
    transport: 'http',
    endpoint: 'https://mcp.acme.internal/airflow',
    status: 'connected',
    authMode: 'service_account',
    lastSyncAt: iso(1 * MIN),
    toolsAllowedFor: ['healer', 'orchestrator', 'builder'],
    tools: [
      { name: 'deploy_dag', description: 'Deploy generated DAGs to the orchestration plane', kind: 'orchestration', scopes: ['write'], calls24h: 38, avgLatencyMs: 1240 },
      { name: 'trigger_run', description: 'Trigger or retry DAG runs', kind: 'orchestration', scopes: ['write'], calls24h: 141, avgLatencyMs: 340 },
      { name: 'read_logs', description: 'Fetch task logs for diagnosis', kind: 'utility', scopes: ['read'], calls24h: 892, avgLatencyMs: 260 },
    ],
  },
  {
    id: 'mcp-slack',
    name: 'Slack Notifications',
    transport: 'sse',
    endpoint: 'https://mcp.acme.internal/slack',
    status: 'degraded',
    authMode: 'api_key',
    lastSyncAt: iso(23 * MIN),
    toolsAllowedFor: ['healer', 'orchestrator'],
    tools: [
      { name: 'page_oncall', description: 'Page data-oncall for tier-1 escalations', kind: 'utility', scopes: ['write'], calls24h: 7, avgLatencyMs: 2100 },
      { name: 'post_update', description: 'Post healing-run updates to incident channels', kind: 'utility', scopes: ['write'], calls24h: 64, avgLatencyMs: 980 },
    ],
  },
  {
    id: 'mcp-cloudops',
    name: 'Cloud Ops & Sandbox',
    transport: 'http',
    endpoint: 'https://mcp.acme.internal/cloudops',
    status: 'connected',
    authMode: 'service_account',
    lastSyncAt: iso(3 * MIN),
    toolsAllowedFor: ['healer', 'qa', 'architecture'],
    tools: [
      { name: 'sandbox_exec', description: 'Clone production snapshots and run isolated verification', kind: 'quality', scopes: ['admin'], calls24h: 28, avgLatencyMs: 14200 },
      { name: 'cost_catalog', description: 'Query infrastructure and warehouse pricing', kind: 'utility', scopes: ['read'], calls24h: 156, avgLatencyMs: 140 },
      { name: 'scale_resources', description: 'Resize consumer groups and compute clusters', kind: 'processing', scopes: ['write', 'admin'], calls24h: 9, avgLatencyMs: 620 },
    ],
  },
  {
    id: 'mcp-dbt',
    name: 'dbt Cloud',
    transport: 'http',
    endpoint: 'https://mcp.acme.internal/dbt',
    status: 'disconnected',
    authMode: 'api_key',
    lastSyncAt: iso(26 * 60 * MIN),
    toolsAllowedFor: ['builder', 'qa'],
    tools: [
      { name: 'run_job', description: 'Trigger dbt jobs for transformation steps', kind: 'processing', scopes: ['write'], calls24h: 0, avgLatencyMs: 0 },
      { name: 'lineage_query', description: 'Fetch dbt DAG lineage for impact analysis', kind: 'utility', scopes: ['read'], calls24h: 0, avgLatencyMs: 0 },
    ],
  },
];
