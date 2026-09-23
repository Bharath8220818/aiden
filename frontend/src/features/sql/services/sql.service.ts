import { api } from '@/services/api';
import {
  QueryResult,
  QueryLogEntry,
  ExecutionPlan,
  AiSuggestion,
  AiChatMessage,
  DatabaseConnection,
} from '../types';
import {
  MOCK_DATABASES,
  buildMockResult,
  buildMockPlan,
  buildMockSuggestions,
  buildAiReply,
} from '../mockData';

const isMockEnabled = () => import.meta.env.VITE_ENABLE_MOCK_DATA !== 'false';

/* ------------------------------------------------------------------ */
/* Catalog                                                             */
/* ------------------------------------------------------------------ */

export async function fetchDatabases(): Promise<DatabaseConnection[]> {
  if (!isMockEnabled()) {
    return api.get('/sql/databases');
  }
  await new Promise((resolve) => setTimeout(resolve, 300));
  return MOCK_DATABASES;
}

/* ------------------------------------------------------------------ */
/* Query execution                                                     */
/* ------------------------------------------------------------------ */

export async function executeQuery(sql: string, databaseId: string): Promise<QueryResult> {
  if (!isMockEnabled()) {
    return api.post('/sql/execute', { sql, databaseId });
  }

  const seed = Date.now();
  // Simulate warehouse latency proportional to statement weight
  const weight = Math.min(2400, 260 + sql.length * 3);
  await new Promise((resolve) => setTimeout(resolve, weight));
  return buildMockResult(sql, seed);
}

export function buildQueryLogs(sql: string, result: QueryResult): QueryLogEntry[] {
  const logs: QueryLogEntry[] = [
    {
      id: `log-${result.runId}-1`,
      ts: new Date().toISOString(),
      level: 'info' as const,
      message: `Statement dispatched to ${result.warehouse} (${(sql.length / 1024).toFixed(2)} KB).`,
    },
  ];

  if (result.status === 'success') {
    logs.push(
      {
        id: `log-${result.runId}-2`,
        ts: new Date().toISOString(),
        level: 'info' as const,
        message: `Scan complete: ${result.rowsScanned.toLocaleString()} rows / ${result.bytesSpilled} in ${result.durationMs} ms.`,
      },
      {
        id: `log-${result.runId}-3`,
        ts: new Date().toISOString(),
        level: 'info' as const,
        message: `Result set materialized: ${result.rowCount} rows returned to client.`,
      }
    );
  } else if (result.error) {
    logs.push({
      id: `log-${result.runId}-2`,
      ts: new Date().toISOString(),
      level: 'error' as const,
      message: `${result.error.code} (line ${result.error.line ?? '?'}): ${result.error.message}`,
    });
  }

  return logs;
}

/* ------------------------------------------------------------------ */
/* Plans, suggestions, optimization                                    */
/* ------------------------------------------------------------------ */

export async function fetchExecutionPlan(sql: string): Promise<ExecutionPlan> {
  if (!isMockEnabled()) {
    return api.post('/sql/explain', { sql });
  }
  await new Promise((resolve) => setTimeout(resolve, 700));
  return buildMockPlan(sql);
}

export async function fetchAiSuggestions(sql: string): Promise<AiSuggestion[]> {
  if (!isMockEnabled()) {
    return api.post('/sql/optimize/suggestions', { sql });
  }
  await new Promise((resolve) => setTimeout(resolve, 900));
  return buildMockSuggestions(sql);
}

export async function sendAiChat(
  prompt: string,
  history: AiChatMessage[]
): Promise<AiChatMessage> {
  if (!isMockEnabled()) {
    return api.post('/sql/assistant', { prompt, history });
  }
  await new Promise((resolve) => setTimeout(resolve, 1100));
  const reply = buildAiReply(prompt);
  return {
    id: `aiden-${Date.now().toString(36)}`,
    role: 'aiden',
    content: reply.content,
    sql: reply.sql,
    ts: new Date().toISOString(),
  };
}
