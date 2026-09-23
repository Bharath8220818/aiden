import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAgents } from '@/features/intelligence/hooks/useAgents';
import { AgentRoster } from '@/features/intelligence/components/AgentRoster';
import { AgentDetail } from '@/features/intelligence/components/AgentDetail';
import { SwarmFeed } from '@/features/intelligence/components/SwarmFeed';
import { AgentRun } from '@/features/intelligence/services/intelligence.service';
import { usePermission } from '@/features/auth/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Bot, CheckCircle2, Loader2, Play, Radio, XCircle, Zap } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Orchestrator panel — trigger the 11-stage workflow, show stage strip */
/* ------------------------------------------------------------------ */

const WORKFLOWS = [
  { id: 'full_loop', label: 'Full Engineering Loop' },
  { id: 'requirement_to_code', label: 'Requirement → Code' },
  { id: 'quality_gate', label: 'Quality Gate' },
  { id: 'health_check', label: 'Fleet Health Check' },
] as const;

const OrchestratorPanel: React.FC<{
  onStart: (workflow: string) => Promise<AgentRun>;
  canControl: boolean;
}> = ({ onStart, canControl }) => {
  const [workflow, setWorkflow] = useState<string>('full_loop');
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState<AgentRun | null>(null);

  const handleStart = async () => {
    setIsRunning(true);
    try {
      const run = await onStart(workflow);
      setLastRun(run);
    } finally {
      setIsRunning(false);
    }
  };

  const stageIcon = (state: string) =>
    state === 'done' ? (
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
    ) : state === 'failed' ? (
      <XCircle className="w-3.5 h-3.5 text-red-600" />
    ) : (
      <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
    );

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Play className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-primary shrink-0">
            Orchestrator
          </span>
          <select
            value={workflow}
            onChange={(e) => setWorkflow(e.target.value)}
            disabled={isRunning}
            aria-label="Workflow"
            className="h-7 px-2 text-[11px] rounded-md bg-card border border-border text-text-primary focus:outline-none focus:border-indigo-500/60 max-w-52"
          >
            {WORKFLOWS.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label}
              </option>
            ))}
          </select>
        </div>
        <Button
          variant="ai"
          size="sm"
          onClick={handleStart}
          isLoading={isRunning}
          disabled={!canControl || isRunning}
          leftIcon={<Play className="w-3.5 h-3.5" />}
          className="text-[11px] shrink-0"
        >
          {isRunning ? 'Executing loop…' : 'Run workflow'}
        </Button>
      </div>

      {/* Stage strip from the last run */}
      {lastRun?.stages && (
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {lastRun.stages.map((stage) => {
            const output = lastRun.outputs?.[stage.id];
            const state = output?.status ?? 'running';
            return (
              <div
                key={stage.id}
                title={`${stage.label} — ${output?.summary ?? output?.error ?? state}`}
                className={cn(
                  'flex items-center gap-1 px-1.5 py-1 rounded-md border text-[9px] font-mono whitespace-nowrap',
                  state === 'done' && 'border-emerald-500/30 bg-emerald-500/5 text-emerald-600',
                  state === 'failed' && 'border-red-500/40 bg-red-500/10 text-red-600',
                  state === 'running' && 'border-indigo-500/40 bg-indigo-500/10 text-indigo-600'
                )}
              >
                {stageIcon(state)}
                {stage.no}. {stage.label}
              </div>
            );
          })}
          {lastRun.status === 'success' && (
            <Badge variant="success" size="sm" className="ml-2 shrink-0">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Loop complete
            </Badge>
          )}
          {lastRun.status === 'failed' && (
            <Badge variant="error" size="sm" className="ml-2 shrink-0">
              <XCircle className="w-3 h-3 mr-1" /> {lastRun.error?.slice(0, 60) ?? 'Failed'}
            </Badge>
          )}
        </div>
      )}
      {!lastRun && (
        <p className="text-[10px] text-text-muted font-mono">
          {canControl
            ? 'Executes the 11-stage AIDEN workflow against live platform state — progress streams to the swarm feed.'
            : 'agent.control permission required to run orchestrated workflows.'}
        </p>
      )}
    </div>
  );
};

export const AgentsPage: React.FC = () => {
  const {
    agents,
    swarmMessages,
    stats,
    selectedAgentId,
    setSelectedAgentId,
    selectedAgent,
    togglePause,
    toggleGrant,
    pendingTool,
    pendingPause,
    isLoading,
    startWorkflow,
  } = useAgents();
  const canControlAgents = usePermission('agents.control');
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();

  // URL-driven selection: /agents/:agentId selects that agent; unknown ids fall back.
  useEffect(() => {
    if (!agentId || isLoading) return;
    const exists = agents.some((a) => a.id === agentId);
    if (!exists) {
      navigate('/agents', { replace: true });
    } else if (selectedAgentId !== agentId) {
      setSelectedAgentId(agentId);
    }
  }, [agentId, agents, isLoading, selectedAgentId, setSelectedAgentId, navigate]);

  const handleSelectAgent = (id: string) => {
    setSelectedAgentId(id);
    navigate(`/agents/${id}`);
  };

  const tokenPct = stats.tokenBudget > 0 ? Math.round((stats.tokensToday / stats.tokenBudget) * 100) : 0;

  return (
    <PageContainer
      title="Agent Control Center"
      description="Autonomous agent fleet — memory, ReAct trajectories, tool permissions, and inter-agent coordination"
      fullWidth
      breadcrumbs={[{ label: 'AIDEN' }, { label: 'Intelligence' }, { label: 'Agent Control Center' }]}
      actions={
        <Badge variant="ai" size="sm" dot pulse>
          {stats.active} active · {stats.total} agents
        </Badge>
      }
    >
      {/* Fleet stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Agents', value: String(stats.total), color: 'text-text-primary' },
          { label: 'Active / working', value: String(stats.active), color: 'text-indigo-600' },
          { label: 'Paused', value: String(stats.paused), color: 'text-amber-600' },
          { label: 'Avg success', value: `${stats.avgSuccess}%`, color: 'text-emerald-600' },
          { label: `Tokens today (${tokenPct}%)`, value: `${(stats.tokensToday / 1000).toFixed(0)}k / ${(stats.tokenBudget / 1000).toFixed(0)}k`, color: tokenPct > 80 ? 'text-amber-600' : 'text-cyan-600' },
        ].map((s) => (
          <div key={s.label} className="p-3 rounded-lg bg-card border border-border text-center">
            <div className={cn('text-lg font-bold font-mono', s.color)}>{s.value}</div>
            <div className="text-[9px] uppercase text-text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Orchestrator — 11-stage workflow trigger + last-run progress */}
      <OrchestratorPanel onStart={startWorkflow} canControl={canControlAgents} />

      {/* Master-detail + swarm */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] xl:grid-cols-[320px_1fr_300px] gap-4 h-[calc(100vh-340px)] min-h-[560px]">
        {/* Roster */}
        <div className="rounded-lg border border-border bg-card overflow-hidden flex flex-col min-h-[280px]">
          <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 shrink-0">
            <Bot className="w-4 h-4 text-indigo-600" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-primary">Agent Roster</span>
            <span className="text-[10px] font-mono text-text-muted ml-auto">·20s live</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <AgentRoster
              agents={agents}
              selectedId={selectedAgentId}
              onSelect={handleSelectAgent}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Detail inspector */}
        <div className="rounded-lg border border-border bg-card overflow-hidden min-h-[280px]">
          <AgentDetail
            agent={selectedAgent}
            isPendingPause={pendingPause}
            pendingTool={pendingTool}
            onTogglePause={togglePause}
            onToggleGrant={toggleGrant}
            readOnly={!canControlAgents}
          />
        </div>

        {/* Swarm feed */}
        <div className="rounded-lg border border-border bg-card overflow-hidden flex flex-col min-h-[280px] xl:col-span-1 lg:col-span-2 xl:col-auto lg:order-first xl:order-none">
          <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 shrink-0">
            <Radio className="w-4 h-4 text-cyan-600" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-primary">Agent Swarm</span>
            <span className="text-[9px] font-mono text-text-muted ml-auto flex items-center gap-1">
              <Zap className="w-3 h-3" />
              {swarmMessages.length} msgs
            </span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <SwarmFeed messages={swarmMessages} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default AgentsPage;
