import { DatabaseConnection, QueryResult, ExecutionPlan, PlanNode, AiSuggestion, QueryLogEntry } from './types';

const nowIso = () => new Date().toISOString();

/* ------------------------------------------------------------------ */
/* Connected databases (fed by Phase 6 Connection Manager)             */
/* ------------------------------------------------------------------ */

export const MOCK_DATABASES: DatabaseConnection[] = [
  {
    id: 'db-snowflake-prod',
    name: 'Snowflake — ANALYTICS_PROD',
    technology: 'Snowflake Enterprise',
    environment: 'production',
    status: 'connected',
    schemas: [
      {
        name: 'MART',
        tables: [
          {
            name: 'MART_ORDERS',
            rowEstimate: '1.8B rows',
            sizeOnDisk: '412 GB',
            columns: [
              { name: 'order_id', dataType: 'VARCHAR(64)', nullable: false, flags: ['pk'], description: 'Unique order identifier' },
              { name: 'customer_id', dataType: 'VARCHAR(64)', nullable: false, flags: ['fk', 'indexed'], description: 'Buyer entity reference' },
              { name: 'gross_amount_usd', dataType: 'DECIMAL(18,2)', nullable: false, flags: ['indexed'] },
              { name: 'currency_code', dataType: 'VARCHAR(3)', nullable: false, flags: [] },
              { name: 'order_status', dataType: 'VARCHAR(32)', nullable: false, flags: [] },
              { name: 'order_timestamp', dataType: 'TIMESTAMP_TZ', nullable: false, flags: ['indexed'], description: 'WAL commit time' },
              { name: 'customer_email_hash', dataType: 'VARCHAR(64)', nullable: false, flags: ['pii'], description: 'SHA-256 salted digest' },
              { name: 'billing_country', dataType: 'VARCHAR(2)', nullable: true, flags: ['nullable'] },
            ],
          },
          {
            name: 'MART_CUSTOMERS',
            rowEstimate: '46M rows',
            sizeOnDisk: '18 GB',
            columns: [
              { name: 'customer_id', dataType: 'VARCHAR(64)', nullable: false, flags: ['pk'] },
              { name: 'segment', dataType: 'VARCHAR(32)', nullable: true, flags: ['nullable'] },
              { name: 'lifetime_value_usd', dataType: 'DECIMAL(18,2)', nullable: true, flags: ['nullable'] },
              { name: 'first_order_at', dataType: 'TIMESTAMP_TZ', nullable: true, flags: ['nullable'] },
            ],
          },
          {
            name: 'MART_REVENUE_DAILY',
            rowEstimate: '3,214 rows',
            sizeOnDisk: '1.2 GB',
            columns: [
              { name: 'revenue_date', dataType: 'DATE', nullable: false, flags: ['pk'] },
              { name: 'gross_revenue_usd', dataType: 'DECIMAL(18,2)', nullable: false, flags: [] },
              { name: 'order_count', dataType: 'INTEGER', nullable: false, flags: [] },
              { name: 'refund_count', dataType: 'INTEGER', nullable: true, flags: ['nullable'] },
            ],
          },
        ],
      },
      {
        name: 'RAW',
        tables: [
          {
            name: 'RAW_ORDERS_CDC',
            rowEstimate: '9.4B rows',
            sizeOnDisk: '1.1 TB',
            columns: [
              { name: 'event_id', dataType: 'VARCHAR(64)', nullable: false, flags: ['pk'] },
              { name: 'op', dataType: 'VARCHAR(2)', nullable: false, flags: [], description: 'Debezium c/u/d/r' },
              { name: 'payload', dataType: 'VARIANT', nullable: false, flags: [] },
              { name: 'event_ts', dataType: 'TIMESTAMP_TZ', nullable: false, flags: ['indexed'] },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'db-postgres-ecom',
    name: 'PostgreSQL — ecommerce',
    technology: 'PostgreSQL 15',
    environment: 'production',
    status: 'connected',
    schemas: [
      {
        name: 'ecommerce',
        tables: [
          {
            name: 'orders',
            rowEstimate: '612M rows',
            sizeOnDisk: '96 GB',
            columns: [
              { name: 'id', dataType: 'VARCHAR(64)', nullable: false, flags: ['pk'] },
              { name: 'customer_id', dataType: 'VARCHAR(64)', nullable: false, flags: ['fk', 'indexed'] },
              { name: 'gross_amount_cents', dataType: 'BIGINT', nullable: false, flags: [] },
              { name: 'currency_code', dataType: 'VARCHAR(3)', nullable: false, flags: [] },
              { name: 'status', dataType: 'VARCHAR(32)', nullable: false, flags: [] },
              { name: 'created_at', dataType: 'TIMESTAMPTZ', nullable: false, flags: ['indexed'] },
            ],
          },
          {
            name: 'customers',
            rowEstimate: '46M rows',
            sizeOnDisk: '12 GB',
            columns: [
              { name: 'id', dataType: 'VARCHAR(64)', nullable: false, flags: ['pk'] },
              { name: 'email', dataType: 'VARCHAR(320)', nullable: false, flags: ['pii'] },
              { name: 'country_code', dataType: 'VARCHAR(2)', nullable: true, flags: ['nullable'] },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'db-kafka-analytics',
    name: 'Kafka — streaming analytics',
    technology: 'Kafka 3.6 (Spark SQL)',
    environment: 'development',
    status: 'degraded',
    schemas: [
      {
        name: 'kafka_stream',
        tables: [
          {
            name: 'payments_v1',
            rowEstimate: 'unbounded stream',
            sizeOnDisk: '—',
            columns: [
              { name: 'transaction_id', dataType: 'VARCHAR(64)', nullable: false, flags: ['pk'] },
              { name: 'card_token', dataType: 'VARCHAR(32)', nullable: false, flags: ['pii'] },
              { name: 'amount_cents', dataType: 'INTEGER', nullable: false, flags: [] },
              { name: 'merchant_mcc', dataType: 'VARCHAR(8)', nullable: true, flags: ['nullable'] },
              { name: 'created_at', dataType: 'TIMESTAMP', nullable: false, flags: [] },
            ],
          },
        ],
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Editor starter queries                                              */
/* ------------------------------------------------------------------ */

export const STARTER_QUERY = `-- Revenue by country, last 30 days
SELECT
    o.billing_country                       AS country,
    COUNT(DISTINCT o.order_id)              AS orders,
    SUM(o.gross_amount_usd)                 AS gross_revenue_usd,
    ROUND(AVG(o.gross_amount_usd), 2)       AS avg_order_value_usd
FROM ANALYTICS_PROD.MART.MART_ORDERS o
WHERE o.order_timestamp >= DATEADD(day, -30, CURRENT_TIMESTAMP())
  AND o.order_status IN ('paid', 'shipped', 'delivered')
GROUP BY o.billing_country
ORDER BY gross_revenue_usd DESC;`;

export const STARTER_QUERY_LOGS: QueryLogEntry[] = [
  { id: 'log-1', ts: nowIso(), level: 'info', message: 'Session opened on warehouse AIDEN_DEV_WH (X-Small).' },
  { id: 'log-2', ts: nowIso(), level: 'info', message: 'Schema ANALYTICS_PROD.MART resolved. 3 tables introspected.' },
  { id: 'log-3', ts: nowIso(), level: 'warn', message: 'Consumer lag detected on orders-cdc — results may lag up to 8 minutes.' },
];

/* ------------------------------------------------------------------ */
/* Result generation (deterministic pseudo-random per run)             */
/* ------------------------------------------------------------------ */

const COUNTRIES = ['US', 'DE', 'GB', 'CA', 'JP', 'FR', 'AU', 'NL'];

export function buildMockResult(sql: string, seed: number): QueryResult {
  const lower = sql.toLowerCase();
  const runId = `run-${seed.toString(36)}`;

  const fail = lower.includes('from nonexistent') || lower.includes('syntax error');
  if (fail) {
    return {
      runId,
      status: 'failed',
      columns: [],
      rows: [],
      rowCount: 0,
      truncated: false,
      durationMs: 42,
      rowsScanned: 0,
      bytesSpilled: '0 B',
      warehouse: 'AIDEN_DEV_WH',
      error: {
        code: 'SQL_COMPILATION_ERROR',
        message: "Object 'NONEXISTENT' does not exist or not authorized.",
        line: lower.split('\n').findIndex((l) => l.includes('nonexistent')) + 1 || 1,
        hint: 'Check the schema-qualified table name, or pick a table from the explorer.',
      },
      executedAt: nowIso(),
    };
  }

  const isRevenue = lower.includes('billing_country') || lower.includes('country');
  const columns = isRevenue
    ? [
        { name: 'COUNTRY', type: 'VARCHAR' },
        { name: 'ORDERS', type: 'NUMBER' },
        { name: 'GROSS_REVENUE_USD', type: 'DECIMAL' },
        { name: 'AVG_ORDER_VALUE_USD', type: 'DECIMAL' },
      ]
    : [
        { name: 'ORDER_ID', type: 'VARCHAR' },
        { name: 'ORDER_STATUS', type: 'VARCHAR' },
        { name: 'GROSS_AMOUNT_USD', type: 'DECIMAL' },
        { name: 'ORDER_TIMESTAMP', type: 'TIMESTAMP_TZ' },
      ];

  const count = 8;
  const rows: Record<string, string | number | null>[] = [];
  let s = seed % 9973;
  const nextRand = () => {
    s = (s * 137 + 71) % 9973;
    return s / 9973;
  };

  for (let i = 0; i < count; i += 1) {
    if (isRevenue) {
      const orders = Math.round(420 + nextRand() * 3800);
      const revenue = orders * (52 + nextRand() * 180);
      rows.push({
        COUNTRY: COUNTRIES[i % COUNTRIES.length],
        ORDERS: orders,
        GROSS_REVENUE_USD: Math.round(revenue * 100) / 100,
        AVG_ORDER_VALUE_USD: Math.round((revenue / orders) * 100) / 100,
      });
    } else {
      rows.push({
        ORDER_ID: `ord-${Math.round(nextRand() * 1e9).toString(36)}`,
        ORDER_STATUS: ['paid', 'shipped', 'delivered', 'pending'][Math.floor(nextRand() * 4)],
        GROSS_AMOUNT_USD: Math.round(nextRand() * 48000) / 100,
        ORDER_TIMESTAMP: new Date(Date.now() - Math.round(nextRand() * 8.64e7)).toISOString().replace('T', ' ').substring(0, 19),
      });
    }
  }

  rows.sort((a, b) => Number(b.GROSS_REVENUE_USD ?? b.GROSS_AMOUNT_USD ?? 0) - Number(a.GROSS_REVENUE_USD ?? a.GROSS_AMOUNT_USD ?? 0));

  const durationMs = Math.round(320 + nextRand() * 2400);
  return {
    runId,
    status: 'success',
    columns,
    rows,
    rowCount: rows.length,
    truncated: false,
    durationMs,
    rowsScanned: Math.round(1.2e6 + nextRand() * 4.4e7),
    bytesSpilled: `${(nextRand() * 400 + 20).toFixed(1)} MB`,
    warehouse: 'AIDEN_DEV_WH',
    executedAt: nowIso(),
  };
}

/* ------------------------------------------------------------------ */
/* Execution plan                                                      */
/* ------------------------------------------------------------------ */

export function buildMockPlan(sql: string): ExecutionPlan {
  const lower = sql.toLowerCase();
  const hasJoin = lower.includes('join');
  const hasAgg = lower.includes('group by') || lower.includes('count(') || lower.includes('sum(');

  const leaf: PlanNode = {
    id: 'scan',
    type: 'TableScan',
    detail: 'ANALYTICS_PROD.MART.MART_ORDERS — partition prune on ORDER_TIMESTAMP (30d)',
    rows: 74_000_000,
    cost: 12.4,
    depth: 0,
    children: [],
  };

  let current: PlanNode = leaf;
  let depth = 1;

  if (hasJoin) {
    const join: PlanNode = {
      id: 'join',
      type: 'Join',
      detail: 'INNER JOIN MART_CUSTOMERS on customer_id (broadcast hash)',
      rows: 74_000_000,
      cost: current.cost + 28.9,
      depth,
      children: [current],
    };
    current = join;
    depth += 1;
  }

  if (hasAgg) {
    const exchange: PlanNode = {
      id: 'exchange',
      type: 'Exchange',
      detail: 'HashKeyPartitioning [BILLING_COUNTRY] — 64 partitions',
      rows: 8,
      cost: current.cost + 6.1,
      depth,
      children: [current],
    };
    const aggregate: PlanNode = {
      id: 'agg',
      type: 'Aggregate',
      detail: 'GROUP BY BILLING_COUNTRY — COUNT(DISTINCT), SUM, AVG',
      rows: 8,
      cost: exchange.cost + 9.7,
      depth: depth + 1,
      children: [exchange],
    };
    current = aggregate;
    depth += 2;
  }

  const sort: PlanNode = {
    id: 'sort',
    type: 'Sort',
    detail: 'ORDER BY GROSS_REVENUE_USD DESC — top-8 spill to local storage',
    rows: 8,
    cost: current.cost + 1.2,
    depth,
    children: [current],
  };

  const root: PlanNode = {
    id: 'result',
    type: 'Result',
    detail: 'RETURN 8 rows to client',
    rows: 8,
    cost: sort.cost,
    depth: depth + 1,
    children: [sort],
  };

  const warnings: string[] = [];
  if (!lower.includes('limit') && lower.includes('select')) {
    warnings.push('No LIMIT clause — production warehouses bill per bytes scanned. Consider adding LIMIT for exploratory queries.');
  }
  if (hasJoin && !lower.includes('where')) {
    warnings.push('Join without filter predicate — full scan of both inputs. A date-range filter would prune ~92% of partitions.');
  }

  return {
    root,
    warnings,
    totalCost: Math.round(root.cost * 10) / 10,
    estimatedRuntimeMs: Math.round(root.cost * 118),
  };
}

/* ------------------------------------------------------------------ */
/* AI suggestions                                                      */
/* ------------------------------------------------------------------ */

export function buildMockSuggestions(sql: string): AiSuggestion[] {
  const lower = sql.toLowerCase();
  const suggestions: AiSuggestion[] = [];

  if (lower.includes('billing_country')) {
    suggestions.push({
      id: 'sug-cluster',
      kind: 'optimization',
      title: 'Cluster MART_ORDERS by (BILLING_COUNTRY, ORDER_TIMESTAMP)',
      explanation:
        'This query runs weekly against BILLING_COUNTRY ranges. Clustering the mart on (BILLING_COUNTRY, ORDER_TIMESTAMP) prunes 87% of micro-partitions for this pattern and reduces scanned bytes from 412 GB to ~54 GB.',
      estimatedGain: '−87% bytes scanned',
      optimizedSql: `ALTER TABLE ANALYTICS_PROD.MART.MART_ORDERS\n  CLUSTER BY (BILLING_COUNTRY, ORDER_TIMESTAMP);`,
    });
  }

  if (lower.includes('count(distinct')) {
    suggestions.push({
      id: 'sug-rewrite',
      kind: 'rewrite',
      title: 'Replace COUNT(DISTINCT) with APPROX_COUNT_DISTINCT',
      explanation:
        'HLL approximate distinct counting yields ~1.6% error at 1/9th the shuffle cost for 74M-row aggregations — well inside dashboard tolerance.',
      estimatedGain: '−61% shuffle cost',
      optimizedSql: sql.replace(/COUNT\s*\(\s*DISTINCT\s+([a-z_.]+)\s*\)/i, 'APPROX_COUNT_DISTINCT($1)'),
    });
  }

  if (lower.includes('postgres')) {
    suggestions.push({
      id: 'sug-index',
      kind: 'index',
      title: 'Add covering index on orders(created_at, status)',
      explanation:
        'The WHERE clause filters on created_at ranges and status IN-lists. A covering index avoids heap fetches for the 612M-row orders table during incremental pulls.',
      estimatedGain: '−94% heap fetches',
      optimizedSql: `CREATE INDEX CONCURRENTLY idx_orders_created_status\n  ON ecommerce.orders (created_at, status)\n  INCLUDE (id, customer_id, gross_amount_cents);`,
    });
  }

  suggestions.push({
    id: 'sug-cost',
    kind: 'cost',
    title: 'Schedule heavy aggregates on the XS warehouse, off-peak',
    explanation:
      'Estimated monthly credit burn for this query pattern is $212. Moving ad-hoc runs after 20:00 UTC to the XS warehouse with auto-suspend 60s saves ~$64/month at identical latency.',
    estimatedGain: '−30% credits',
  });

  return suggestions;
}

/* ------------------------------------------------------------------ */
/* AI chat (text-to-SQL simulation)                                    */
/* ------------------------------------------------------------------ */

export function buildAiReply(prompt: string): { content: string; sql?: string } {
  const lower = prompt.toLowerCase();

  if (lower.includes('top') || lower.includes('customer')) {
    return {
      content:
        'Here is a top-customers query ranked by lifetime revenue. It joins MART_ORDERS with MART_CUSTOMERS and uses the clustered date range for partition pruning.',
      sql: `SELECT TOP 20\n    c.customer_id,\n    c.segment,\n    SUM(o.gross_amount_usd)          AS lifetime_revenue_usd,\n    COUNT(o.order_id)                AS total_orders\nFROM ANALYTICS_PROD.MART.MART_ORDERS o\nJOIN ANALYTICS_PROD.MART.MART_CUSTOMERS c\n  ON o.customer_id = c.customer_id\nWHERE o.order_timestamp >= DATEADD(day, -90, CURRENT_TIMESTAMP())\nGROUP BY c.customer_id, c.segment\nORDER BY lifetime_revenue_usd DESC;`,
    };
  }

  if (lower.includes('refund') || lower.includes('return')) {
    return {
      content: 'Refund rate by month with month-over-month delta. Note refund_count is nullable — the query coalesces to zero.',
      sql: `WITH monthly AS (\n    SELECT\n        DATE_TRUNC('month', revenue_date)  AS month,\n        SUM(order_count)                   AS orders,\n        COALESCE(SUM(refund_count), 0)     AS refunds\n    FROM ANALYTICS_PROD.MART.MART_REVENUE_DAILY\n    GROUP BY 1\n)\nSELECT\n    month,\n    orders,\n    refunds,\n    ROUND(100.0 * refunds / NULLIF(orders, 0), 2)          AS refund_rate_pct,\n    ROUND(100.0 * refunds / NULLIF(LAG(orders) OVER (ORDER BY month), 0), 2) AS mom_delta_pct\nFROM monthly\nORDER BY month DESC;`,
    };
  }

  return {
    content:
      'I drafted a safe exploratory query against the revenue mart. It scopes the last 30 days so partition pruning keeps the scan small — extend the filters as needed.',
    sql: `SELECT *\nFROM ANALYTICS_PROD.MART.MART_REVENUE_DAILY\nWHERE revenue_date >= DATEADD(day, -30, CURRENT_DATE())\nORDER BY gross_revenue_usd DESC\nLIMIT 100;`,
  };
}

export function mockOptimize(_sql: string): string {
  return `-- AIDEN optimization: predicate pushdown + CTE dedup + partition pruning
WITH recent_orders AS (
    SELECT
        order_id,
        customer_id,
        billing_country,
        gross_amount_usd,
        order_timestamp
    FROM ANALYTICS_PROD.MART.MART_ORDERS
    WHERE order_timestamp >= DATEADD(day, -30, CURRENT_TIMESTAMP())  -- prunes 87% partitions
      AND order_status IN ('paid', 'shipped', 'delivered')
)
SELECT
    billing_country,
    COUNT(DISTINCT customer_id)   AS active_customers,
    SUM(gross_amount_usd)         AS gross_revenue_usd
FROM recent_orders
GROUP BY billing_country
ORDER BY gross_revenue_usd DESC;`;
}

export const PLACEHOLDER_PLAN_WARNINGS = [
  'Plan generated from client-side cost model — connect a live warehouse for EXPLAIN-verified estimates.',
];
