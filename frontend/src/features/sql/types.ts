/* ------------------------------------------------------------------ */
/* Schema catalog                                                      */
/* ------------------------------------------------------------------ */

export type ColumnFlag = 'pk' | 'fk' | 'pii' | 'indexed' | 'nullable';

export interface CatalogColumn {
  name: string;
  dataType: string;
  nullable: boolean;
  flags: ColumnFlag[];
  description?: string;
}

export interface CatalogTable {
  name: string;
  rowEstimate: string;
  sizeOnDisk: string;
  columns: CatalogColumn[];
}

export interface CatalogSchema {
  name: string;
  tables: CatalogTable[];
}

export interface DatabaseConnection {
  id: string;
  name: string;
  technology: string;
  environment: 'development' | 'staging' | 'production';
  status: 'connected' | 'degraded' | 'offline';
  schemas: CatalogSchema[];
}

/* ------------------------------------------------------------------ */
/* Query execution                                                     */
/* ------------------------------------------------------------------ */

export type QueryRunStatus = 'running' | 'success' | 'failed' | 'cancelled';

export interface QueryColumnMeta {
  name: string;
  type: string;
}

export interface QueryResult {
  runId: string;
  status: QueryRunStatus;
  columns: QueryColumnMeta[];
  rows: Record<string, string | number | null>[];
  rowCount: number;
  truncated: boolean;
  durationMs: number;
  rowsScanned: number;
  bytesSpilled: string;
  warehouse: string;
  error?: { code: string; message: string; line?: number; hint?: string };
  executedAt: string;
}

export interface QueryLogEntry {
  id: string;
  ts: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

/* ------------------------------------------------------------------ */
/* Execution plan                                                      */
/* ------------------------------------------------------------------ */

export type PlanNodeType =
  | 'TableScan'
  | 'IndexScan'
  | 'Join'
  | 'Aggregate'
  | 'Sort'
  | 'Filter'
  | 'Exchange'
  | 'Window'
  | 'Result';

export interface PlanNode {
  id: string;
  type: PlanNodeType;
  detail: string;
  rows: number;
  cost: number;
  depth: number;
  children: PlanNode[];
}

export interface ExecutionPlan {
  root: PlanNode;
  warnings: string[];
  totalCost: number;
  estimatedRuntimeMs: number;
}

/* ------------------------------------------------------------------ */
/* AI assistant                                                        */
/* ------------------------------------------------------------------ */

export type AiSuggestionKind = 'optimization' | 'index' | 'rewrite' | 'cost';

export interface AiSuggestion {
  id: string;
  kind: AiSuggestionKind;
  title: string;
  explanation: string;
  optimizedSql?: string;
  estimatedGain: string;
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'aiden';
  content: string;
  sql?: string;
  ts: string;
}

/* ------------------------------------------------------------------ */
/* Editor state                                                        */
/* ------------------------------------------------------------------ */

export interface QueryHistoryItem {
  id: string;
  sql: string;
  status: QueryRunStatus;
  durationMs: number;
  executedAt: string;
}
