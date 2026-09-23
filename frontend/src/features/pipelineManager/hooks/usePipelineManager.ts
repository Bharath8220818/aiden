import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { Pipeline } from '../types';
import {
  fetchPipelines,
  fetchPipelineDetail,
  controlPipeline,
  ControlAction,
} from '../services/pipelineManager.service';

export type StatusFilter = 'all' | 'running' | 'healthy' | 'degraded' | 'paused' | 'failed';

export function usePipelineManager() {
  const queryClient = useQueryClient();

  // Project context (spec §21): the active project scopes the fleet listing.
  const activeProjectId = useWorkspaceStore((s) => s.currentProject?.id ?? null);

  const pipelinesQuery = useQuery({
    queryKey: ['pipelines', activeProjectId],
    queryFn: () => fetchPipelines(activeProjectId ?? undefined),
    refetchInterval: 30_000,
  });

  const pipelines: Pipeline[] = pipelinesQuery.data ?? [];
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState<string | null>(null);

  // Derived default selection: first pipeline until the user picks one
  const effectiveSelectedId = selectedId ?? pipelines[0]?.id ?? null;
  const selectedPipeline = pipelines.find((p) => p.id === effectiveSelectedId) ?? null;

  const detailQuery = useQuery({
    queryKey: ['pipeline-detail', selectedId],
    queryFn: () => fetchPipelineDetail(selectedId!),
    enabled: Boolean(selectedId),
    refetchInterval: 15_000,
  });

  const filtered = pipelines.filter((p) => {
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.target.toLowerCase().includes(q) ||
      p.tags.some((t) => t.includes(q));
    return matchesStatus && matchesSearch;
  });

  const runControl = useCallback(
    async (pipelineId: string, action: ControlAction) => {
      setActionPending(pipelineId);
      try {
        const updated = await controlPipeline(pipelineId, action);
        queryClient.setQueryData<Pipeline[]>(['pipelines', activeProjectId], (current) =>
          (current ?? []).map((p) => (p.id === updated.id ? updated : p))
        );
        queryClient.invalidateQueries({ queryKey: ['pipeline-detail', pipelineId] });
      } finally {
        setActionPending(null);
      }
    },
    [queryClient, activeProjectId]
  );

  const fleetStats = {
    total: pipelines.length,
    running: pipelines.filter((p) => p.status === 'running').length,
    healthy: pipelines.filter((p) => p.status === 'healthy').length,
    degraded: pipelines.filter((p) => p.status === 'degraded').length,
    paused: pipelines.filter((p) => p.status === 'paused').length,
    failed: pipelines.filter((p) => p.status === 'failed').length,
    successRate:
      pipelines.length > 0
        ? Math.round(
            (pipelines.reduce((sum, p) => sum + p.stats.successRate24h, 0) / pipelines.length) * 10
          ) / 10
        : 0,
  };

  return {
    pipelines: filtered,
    allPipelines: pipelines,
    fleetStats,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    selectedId: effectiveSelectedId,
    setSelectedId,
    selectedPipeline,
    detail: detailQuery.data ?? null,
    isDetailLoading: detailQuery.isLoading,
    isRefetching: detailQuery.isRefetching,
    actionPending,
    runControl,
    isLoading: pipelinesQuery.isLoading,
  };
}
