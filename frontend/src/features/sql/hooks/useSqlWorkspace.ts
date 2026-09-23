import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  QueryResult,
  QueryLogEntry,
  ExecutionPlan,
  AiSuggestion,
  AiChatMessage,
  QueryHistoryItem,
} from '../types';
import {
  fetchDatabases,
  executeQuery,
  buildQueryLogs,
  fetchExecutionPlan,
  fetchAiSuggestions,
  sendAiChat,
} from '../services/sql.service';

export function useSqlWorkspace() {
  /* ---------------- catalog ---------------- */
  const databasesQuery = useQuery({
    queryKey: ['sql-databases'],
    queryFn: fetchDatabases,
    staleTime: 5 * 60 * 1000,
  });

  const [activeDatabaseId, setActiveDatabaseId] = useState<string | null>(null);
  const databases = useMemo(() => databasesQuery.data ?? [], [databasesQuery.data]);
  const activeDatabase = useMemo(
    () => databases.find((d) => d.id === activeDatabaseId) ?? databases[0] ?? null,
    [databases, activeDatabaseId]
  );

  /* ---------------- editor state ---------------- */
  const [sql, setSql] = useState<string>(STARTER);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [logs, setLogs] = useState<QueryLogEntry[]>([]);
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [runSeconds, setRunSeconds] = useState(0);

  /* ---------------- derived analysis (lazy) ---------------- */
  const [plan, setPlan] = useState<ExecutionPlan | null>(null);
  const [isPlanLoading, setIsPlanLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);

  /* ---------------- AI assistant ---------------- */
  const [chatMessages, setChatMessages] = useState<AiChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  /* ---------------- execution ---------------- */
  const runQuery = useCallback(async () => {
    if (!sql.trim() || isRunning) return;
    setIsRunning(true);
    setResult(null);
    setRunSeconds(0);
    const startedAt = Date.now();
    const ticker = setInterval(() => setRunSeconds((Date.now() - startedAt) / 1000), 100);

    try {
      const res = await executeQuery(sql, activeDatabase?.id ?? '');
      setResult(res);
      setLogs((current) => [...buildQueryLogs(sql, res), ...current].slice(0, 40));
      setHistory((current) =>
        [
          {
            id: res.runId,
            sql,
            status: res.status,
            durationMs: res.durationMs,
            executedAt: res.executedAt,
          },
          ...current,
        ].slice(0, 20)
      );
    } finally {
      clearInterval(ticker);
      setIsRunning(false);
    }
  }, [sql, isRunning, activeDatabase]);

  const cancelQuery = useCallback(() => {
    setIsRunning(false);
    setLogs((current) => [
      {
        id: `log-cancel-${Date.now()}`,
        ts: new Date().toISOString(),
        level: 'warn' as const,
        message: 'Statement cancelled by user (ABORT).',
      },
      ...current,
    ]);
  }, []);

  /* ---------------- plan / suggestions ---------------- */
  const loadPlan = useCallback(async () => {
    setIsPlanLoading(true);
    try {
      setPlan(await fetchExecutionPlan(sql));
    } finally {
      setIsPlanLoading(false);
    }
  }, [sql]);

  const loadSuggestions = useCallback(async () => {
    setIsSuggestionsLoading(true);
    try {
      setSuggestions(await fetchAiSuggestions(sql));
    } finally {
      setIsSuggestionsLoading(false);
    }
  }, [sql]);

  const applySuggestionSql = useCallback(
    (optimized: string) => {
      setSql(optimized);
    },
    []
  );

  /* ---------------- assistant ---------------- */
  const askAiden = useCallback(async (prompt: string) => {
    const userMessage: AiChatMessage = {
      id: `user-${Date.now().toString(36)}`,
      role: 'user',
      content: prompt,
      ts: new Date().toISOString(),
    };
    setChatMessages((current) => [...current, userMessage]);
    setIsChatLoading(true);
    try {
      const reply = await sendAiChat(prompt, chatMessages);
      setChatMessages((current) => [...current, reply]);
    } finally {
      setIsChatLoading(false);
    }
  }, [chatMessages]);

  const insertSqlFromChat = useCallback((snippet: string) => {
    setSql((current) => `${current}\n\n${snippet}`);
  }, []);

  return {
    // catalog
    databases,
    activeDatabase,
    setActiveDatabaseId,
    isLoadingCatalog: databasesQuery.isLoading,
    // editor
    sql,
    setSql,
    // execution
    result,
    isRunning,
    runSeconds,
    runQuery,
    cancelQuery,
    logs,
    history,
    // analysis
    plan,
    isPlanLoading,
    loadPlan,
    suggestions,
    isSuggestionsLoading,
    loadSuggestions,
    applySuggestionSql,
    // assistant
    chatMessages,
    isChatLoading,
    askAiden,
    insertSqlFromChat,
  };
}

const STARTER = `-- Revenue by country, last 30 days
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
