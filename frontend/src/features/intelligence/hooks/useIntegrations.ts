import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { McpServer, McpServerStatus } from '../types';
import { fetchMcpServers, setServerStatus } from '../services/intelligence.service';

export function useIntegrations() {
  const queryClient = useQueryClient();
  const serversQuery = useQuery({ queryKey: ['mcp-servers'], queryFn: fetchMcpServers, refetchInterval: 30_000 });

  const servers: McpServer[] = serversQuery.data ?? [];
  const [pendingId, setPendingId] = useState<string | null>(null);

  const changeStatus = useCallback(
    async (server: McpServer, status: McpServerStatus) => {
      setPendingId(server.id);
      try {
        const updated = await setServerStatus(server.id, status);
        queryClient.setQueryData<McpServer[]>(['mcp-servers'], (current) =>
          (current ?? []).map((s) => (s.id === updated.id ? updated : s))
        );
      } finally {
        setPendingId(null);
      }
    },
    [queryClient]
  );

  const stats = {
    total: servers.length,
    connected: servers.filter((s) => s.status === 'connected').length,
    degraded: servers.filter((s) => s.status === 'degraded').length,
    disconnected: servers.filter((s) => s.status === 'disconnected').length,
    tools: servers.reduce((s, srv) => s + srv.tools.length, 0),
    calls24h: servers.reduce((s, srv) => s + srv.tools.reduce((t, tool) => t + tool.calls24h, 0), 0),
  };

  return {
    servers,
    stats,
    pendingId,
    changeStatus,
    isLoading: serversQuery.isLoading,
  };
}
