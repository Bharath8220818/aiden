import React from 'react';
import { Agent, AgentStatus, AgentRole } from '../types';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import {
  Sparkles,
  Network,
  Hammer,
  ShieldCheck,
  HeartPulse,
  Scale,
  Gauge,
  Bot,
} from 'lucide-react';

export interface AgentRosterProps {
  agents: Agent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
}

const ROLE_ICON: Record<AgentRole, JSX.Element> = {
  requirements: <Sparkles className="w-4 h-4" />,
  architecture: <Network className="w-4 h-4" />,
  builder: <Hammer className="w-4 h-4" />,
  qa: <ShieldCheck className="w-4 h-4" />,
  healer: <HeartPulse className="w-4 h-4" />,
  governance: <Scale className="w-4 h-4" />,
  optimizer: <Gauge className="w-4 h-4" />,
  orchestrator: <Bot className="w-4 h-4" />,
};

const STATUS_META: Record<AgentStatus, { dot: string; label: string; badge: 'success' | 'ai' | 'warning' | 'neutral' | 'error' }> = {
  working: { dot: 'bg-indigo-400', label: 'Working', badge: 'ai' },
  active: { dot: 'bg-emerald-400', label: 'Active', badge: 'success' },
  idle: { dot: 'bg-gray-500', label: 'Idle', badge: 'neutral' },
  paused: { dot: 'bg-amber-400', label: 'Paused', badge: 'warning' },
  error: { dot: 'bg-red-400', label: 'Error', badge: 'error' },
};

export const AgentRoster: React.FC<AgentRosterProps> = ({ agents, selectedId, onSelect, isLoading }) => {
  if (isLoading) {
    return (
      <div className="p-3 space-y-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-2 space-y-1.5 overflow-y-auto">
      {agents.map((agent) => {
        const status = STATUS_META[agent.status];
        const active = agent.id === selectedId;
        const tokenPct = Math.round((agent.stats.tokensToday / agent.stats.tokenBudget) * 100);
        return (
          <button
            key={agent.id}
            onClick={() => onSelect(agent.id)}
            className={cn(
              'w-full text-left p-3 rounded-lg border transition-all space-y-1.5',
              active
                ? 'bg-indigo-500/10 border-indigo-500/40 ring-1 ring-indigo-500/30'
                : 'bg-card border-border hover:border-border-highlight'
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={cn(
                  'flex items-center gap-2 min-w-0',
                  active ? 'text-indigo-600' : 'text-text-primary'
                )}
              >
                <span className="p-1.5 rounded-md bg-indigo-500/15 border border-indigo-500/30 shrink-0">
                  {ROLE_ICON[agent.role]}
                </span>
                <span className="text-[11px] font-bold truncate">{agent.name}</span>
              </span>
              <Badge variant={status.badge} size="sm" dot pulse={agent.status === 'working'}>
                {status.label}
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-[9px] font-mono text-text-muted">
              <span>{agent.model}</span>
              <span>•</span>
              <span>{agent.stats.tasksCompleted.toLocaleString()} tasks</span>
              <span className={cn('ml-auto', agent.stats.successRate >= 95 ? 'text-emerald-600' : 'text-amber-600')}>
                {agent.stats.successRate}%
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full bg-card border border-border-subtle overflow-hidden">
                <div
                  className={cn('h-full rounded-full', tokenPct > 80 ? 'bg-amber-500' : 'bg-indigo-500')}
                  style={{ width: `${Math.min(100, tokenPct)}%` }}
                />
              </div>
              <span className="text-[8px] font-mono text-text-muted">{tokenPct}% tokens</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
