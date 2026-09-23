import React from 'react';
import { Agent } from '../types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  Brain,
  Wrench,
  History,
  KeyRound,
  Pause,
  Play,
  Cpu,
  Eye,
} from 'lucide-react';

export interface AgentDetailProps {
  agent: Agent | null;
  isPendingPause: boolean;
  pendingTool: string | null;
  onTogglePause: (agent: Agent) => void;
  onToggleGrant: (agent: Agent, tool: string) => void;
  /** When false, pause/resume and grant toggles render disabled with a hint. */
  readOnly?: boolean;
}

const MEMORY_KIND_COLOR: Record<string, string> = {
  episodic: 'text-cyan-600 bg-cyan-500/10 border-cyan-500/30',
  semantic: 'text-indigo-600 bg-indigo-500/10 border-indigo-500/30',
  procedural: 'text-violet-600 bg-violet-500/10 border-violet-500/30',
};

export const AgentDetail: React.FC<AgentDetailProps> = ({
  agent,
  isPendingPause,
  pendingTool,
  onTogglePause,
  onToggleGrant,
  readOnly = false,
}) => {
  if (!agent) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <p className="text-xs text-text-muted">Select an agent to inspect memory and trajectory.</p>
      </div>
    );
  }

  const tokenPct = Math.round((agent.stats.tokensToday / agent.stats.tokenBudget) * 100);

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-text-primary">{agent.name}</h3>
          <p className="text-[11px] text-text-secondary leading-snug mt-0.5">{agent.description}</p>
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <Badge variant="ai" size="sm" className="font-mono">{agent.model}</Badge>
            {agent.capabilities.map((c) => (
              <Badge key={c} variant="neutral" size="sm">{c}</Badge>
            ))}
          </div>
        </div>
        <Button
          variant={agent.status === 'paused' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => onTogglePause(agent)}
          isLoading={isPendingPause}
          disabled={readOnly}
          leftIcon={agent.status === 'paused' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          className="text-xs shrink-0"
          title={readOnly ? 'Agent control requires the Platform Admin role' : undefined}
        >
          {agent.status === 'paused' ? 'Resume' : 'Pause'}
        </Button>
      </div>

      {/* Current task */}
      {agent.currentTask && (
        <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-start gap-2">
          <Cpu className="w-3.5 h-3.5 text-indigo-600 mt-0.5 shrink-0" />
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-indigo-600">Current task</div>
            <p className="text-[11px] text-text-primary leading-snug">{agent.currentTask}</p>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Tasks done', value: agent.stats.tasksCompleted.toLocaleString() },
          { label: 'Success', value: `${agent.stats.successRate}%` },
          { label: 'Avg task', value: `${agent.stats.avgTaskMinutes}m` },
          { label: 'Tokens', value: `${(agent.stats.tokensToday / 1000).toFixed(0)}k` },
        ].map((s) => (
          <div key={s.label} className="p-2 rounded-md bg-card border border-border-subtle text-center">
            <div className="text-xs font-bold font-mono text-text-primary">{s.value}</div>
            <div className="text-[9px] uppercase text-text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Token budget */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[9px] font-mono text-text-muted">
          <span>Daily token budget</span>
          <span>
            {(agent.stats.tokensToday / 1000).toFixed(0)}k / {(agent.stats.tokenBudget / 1000).toFixed(0)}k ({tokenPct}%)
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-card border border-border-subtle overflow-hidden">
          <div
            className={cn('h-full rounded-full', tokenPct > 80 ? 'bg-amber-500' : 'bg-indigo-500')}
            style={{ width: `${Math.min(100, tokenPct)}%` }}
          />
        </div>
      </div>

      {/* Memory buffer */}
      <div className="space-y-1.5">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
          <Brain className="w-3.5 h-3.5 text-cyan-600" />
          Memory Buffer
        </h4>
        <div className="space-y-1.5">
          {agent.memory.map((m) => (
            <div key={m.id} className="p-2.5 rounded-md bg-card border border-border-subtle space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className={cn('text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border', MEMORY_KIND_COLOR[m.kind])}>
                  {m.kind}
                </span>
                <span className="text-[9px] font-mono text-text-muted">
                  {m.tokens} tok · {new Date(m.ts).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-[10px] text-text-secondary leading-snug">{m.content}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Execution trajectory */}
      <div className="space-y-1.5">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-violet-600" />
          Execution Trajectory (ReAct)
        </h4>
        <div className="space-y-1.5">
          {agent.trajectory.map((step) => (
            <div key={step.id} className="p-2.5 rounded-md bg-background border border-border-subtle space-y-1 font-mono">
              <div className="flex items-center justify-between text-[9px] text-text-muted">
                <span>{new Date(step.ts).toLocaleTimeString()}</span>
                <span>{step.tokens} tok</span>
              </div>
              <p className="text-[10px] text-indigo-600">
                <span className="text-text-muted">thought:</span> {step.thought}
              </p>
              <p className="text-[10px] text-text-primary">
                <span className="text-text-muted">action:</span> {step.action}
                {step.toolUsed && (
                  <span className="ml-1.5 text-violet-600">[{step.toolUsed}]</span>
                )}
              </p>
              <p className="text-[10px] text-emerald-600">
                <span className="text-text-muted">observe:</span> {step.observation}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Tool permissions */}
      <div className="space-y-1.5">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
          <KeyRound className="w-3.5 h-3.5 text-amber-600" />
          Tool Permissions (MCP)
        </h4>
        <div className="space-y-1">
          {agent.toolGrants.map((grant) => (
            <div
              key={grant.tool}
              className="flex items-center justify-between gap-2 p-2.5 rounded-md bg-card border border-border-subtle"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Wrench className="w-3.5 h-3.5 text-text-muted shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] font-mono font-semibold text-text-primary truncate">{grant.tool}</div>
                  <div className="text-[9px] text-text-muted font-mono">
                    {grant.server} · {grant.permission}
                  </div>
                </div>
              </div>
              <button
                onClick={() => onToggleGrant(agent, grant.tool)}
                disabled={pendingTool === grant.tool || readOnly}
                className={cn(
                  'w-9 h-4.5 rounded-full relative transition-colors shrink-0 h-[18px] w-9',
                  grant.enabled ? 'bg-emerald-500/60' : 'bg-border',
                  readOnly && 'opacity-50 cursor-not-allowed'
                )}
                title={readOnly ? 'Tool grants require the Platform Admin role' : grant.enabled ? 'Revoke tool access' : 'Grant tool access'}
              >
                <span
                  className={cn(
                    'absolute top-[2px] w-3.5 h-3.5 rounded-full bg-white transition-all',
                    grant.enabled ? 'left-[20px]' : 'left-[2px]'
                  )}
                />
              </button>
            </div>
          ))}
        </div>
        <p className="text-[9px] text-text-muted flex items-center gap-1">
          <Eye className="w-3 h-3" />
          All tool invocations are logged to the audit trail with full arguments.
        </p>
      </div>
    </div>
  );
};
