import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DataConnection, ConnectionProvider, TestConnectionResult } from '../types';
import {
  fetchProviders,
  fetchConnections,
  saveConnection,
  deleteConnectionId,
  testConnection,
  connectionSummaryStats,
} from '../services/connections.service';

export function useConnections() {
  const queryClient = useQueryClient();

  const providersQuery = useQuery({ queryKey: ['connection-providers'], queryFn: fetchProviders, staleTime: Infinity });
  const connectionsQuery = useQuery({ queryKey: ['connections'], queryFn: fetchConnections });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<DataConnection | null>(null);
  const [formProviderId, setFormProviderId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [lastTestResult, setLastTestResult] = useState<(TestConnectionResult & { connectionId: string }) | null>(null);

  const providers: ConnectionProvider[] = useMemo(() => providersQuery.data ?? [], [providersQuery.data]);
  const connections: DataConnection[] = useMemo(() => connectionsQuery.data ?? [], [connectionsQuery.data]);
  const stats = connectionSummaryStats(connections);

  /* ---------------- form lifecycle ---------------- */
  const openCreateForm = useCallback((providerId?: string) => {
    setEditingConnection(null);
    setFormProviderId(providerId ?? null);
    setIsFormOpen(true);
  }, []);

  const openEditForm = useCallback((connection: DataConnection) => {
    setEditingConnection(connection);
    setFormProviderId(connection.providerId);
    setIsFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setIsFormOpen(false);
    setEditingConnection(null);
    setFormProviderId(null);
  }, []);

  const persistConnection = useCallback(
    async (draft: DataConnection) => {
      setIsSaving(true);
      try {
        const saved = await saveConnection(draft);
        const existing = connections.some((c) => c.id === draft.id);
        queryClient.setQueryData<DataConnection[]>(['connections'], (current) =>
          existing
            ? (current ?? []).map((c) => (c.id === saved.id ? saved : c))
            : [...(current ?? []), saved]
        );
        queryClient.invalidateQueries({ queryKey: ['sql-databases'] });
        closeForm();
        return saved;
      } finally {
        setIsSaving(false);
      }
    },
    [connections, queryClient, closeForm]
  );

  const removeConnection = useCallback(
    async (id: string) => {
      await deleteConnectionId(id);
      queryClient.setQueryData<DataConnection[]>(['connections'], (current) =>
        (current ?? []).filter((c) => c.id !== id)
      );
      queryClient.invalidateQueries({ queryKey: ['sql-databases'] });
    },
    [queryClient]
  );

  /* ---------------- health testing ---------------- */
  const runHealthCheck = useCallback(
    async (connection: DataConnection) => {
      setTestingId(connection.id);
      setLastTestResult(null);
      try {
        const result = await testConnection(connection);
        setLastTestResult({ ...result, connectionId: connection.id });
        queryClient.setQueryData<DataConnection[]>(['connections'], (current) =>
          (current ?? []).map((c) =>
            c.id === connection.id
              ? {
                  ...c,
                  status: result.success ? 'connected' : 'disconnected',
                  latencyMs: result.success ? result.latencyMs : null,
                  lastCheckedAt: result.testedAt,
                  lastError: result.success ? undefined : result.steps.find((s) => s.status === 'failed')?.detail,
                }
              : c
          )
        );
        return result;
      } finally {
        setTestingId(null);
      }
    },
    [queryClient]
  );

  return {
    // catalog + list
    providers,
    connections,
    stats,
    isLoading: connectionsQuery.isLoading || providersQuery.isLoading,
    // form
    isFormOpen,
    editingConnection,
    formProviderId,
    isSaving,
    openCreateForm,
    openEditForm,
    closeForm,
    persistConnection,
    removeConnection,
    // health
    testingId,
    lastTestResult,
    runHealthCheck,
  };
}
