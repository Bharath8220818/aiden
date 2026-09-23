import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Agent } from '../types';
import {
  fetchAgents,
  fetchSwarmMessages,
  startOrchestration,
  toggleAgentStatus,
  updateToolGrant,
  AgentRun,
} from '../services/intelligence.service';

export function useAgents() {
  const queryClient = useQueryClient();

  const agentsQuery = useQuery({ queryKey: ['agents'], queryFn: fetchAgents, refetchInterval: 20_000 });
  const swarmQuery = useQuery({ queryKey: ['agent-swarm'], queryFn: fetchSwarmMessages, refetchInterval: 20_000 });

  const agents: Agent[] = agentsQuery.data ?? [];
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [pendingTool, setPendingTool] = useState<string | null>(null);
  const [pendingPause, setPendingPause] = useState(false);

  // Derived default selection: first agent until the user picks one — no effect needed
  const effectiveSelectedId = selectedAgentId ?? agents[0]?.id ?? null;
  const selectedAgent = agents.find((a) => a.id === effectiveSelectedId) ?? null;

  const togglePause = useCallback(
    async (agent: Agent) => {
      setPendingPause(true);
      try {
        const updated = await toggleAgentStatus(agent.id, agent.status !== 'paused');
        queryClient.setQueryData<Agent[]>(['agents'], (current) =>
          (current ?? []).map((a) => (a.id === updated.id ? updated : a))
        );
      } finally {
        setPendingPause(false);
      }
    },
    [queryClient]
  );

  const toggleGrant = useCallback(
    async (agent: Agent, tool: string) => {
      setPendingTool(tool);
      const current = agent.toolGrants.find((g) => g.tool === tool);
      try {
        const updated = await updateToolGrant(agent.id, tool, !current?.enabled);
        queryClient.setQueryData<Agent[]>(['agents'], (currentList) =>
          (currentList ?? []).map((a) => (a.id === updated.id ? updated : a))
        );
      } finally {
        setPendingTool(null);
      }
    },
    [queryClient]
  );

  const startWorkflow = useCallback(
    async (workflow: string, prompt?: string): Promise<AgentRun> => {
      const run = await startOrchestration(workflow, prompt);
      // Refresh swarm so inter-agent handoffs from the run appear immediately.
      await queryClient.invalidateQueries({ queryKey: ['agent-swarm'] });
      return run;
    },
    [queryClient]
  );

  const stats = {
    total: agents.length,
    active: agents.filter((a) => a.status === 'active' || a.status === 'working').length,
    paused: agents.filter((a) => a.status === 'paused').length,
    tokensToday: agents.reduce((s, a) => s + a.stats.tokensToday, 0),
    tokenBudget: agents.reduce((s, a) => s + a.stats.tokenBudget, 0),
    avgSuccess:
      agents.length > 0
        ? Math.round((agents.reduce((s, a) => s + a.stats.successRate, 0) / agents.length) * 10) / 10
        : 0,
  };

  return {
    agents,
    swarmMessages: swarmQuery.data ?? [],
    stats,
    startWorkflow,
    selectedAgentId: effectiveSelectedId,
    setSelectedAgentId,
    selectedAgent,
    togglePause,
    toggleGrant,
    pendingTool,
    pendingPause,
    isLoading: agentsQuery.isLoading,
  };
}
