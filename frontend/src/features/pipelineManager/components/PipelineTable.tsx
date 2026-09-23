import React from 'react';
import { Pipeline } from '../types';
import { StatusFilter } from '../hooks/usePipelineManager';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import { Loader2, CheckCircle2, TriangleAlert, CirclePause, FileEdit, Search } from 'lucide-react';

export interface PipelineTableProps {
  pipelines: Pipeline[];
  statusFilter: StatusFilter;
  onStatusFilter: (f: StatusFilter) => void;
  search: string;
  onSearch: (s: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
}

const STATUS_META: Record<Pipeline['status'], { variant: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'ai'; label: string; icon: JSX.Element }> = {
  running: { variant: 'ai', label: 'Running', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
  healthy: { variant: 'success', label: 'Healthy', icon: <CheckCircle2 className="w-3 h-3" /> },
  degraded: { variant: 'warning', label: 'Degraded', icon: <TriangleAlert className="w-3 h-3" /> },
  paused: { variant: 'neutral', label: 'Paused', icon: <CirclePause className="w-3 h-3" /> },
  failed: { variant: 'error', label: 'Failed', icon: <TriangleAlert className="w-3 h-3" /> },
  draft: { variant: 'info', label: 'Draft', icon: <FileEdit className="w-3 h-3" /> },
};

const FILTERS: StatusFilter[] = ['all', 'running', 'healthy', 'degraded', 'paused', 'failed'];

export const PipelineTable: React.FC<PipelineTableProps> = ({
  pipelines,
  statusFilter,
  onStatusFilter,
  search,
  onSearch,
  selectedId,
  onSelect,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="p-3 border-b border-border space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search pipelines, targets, tags…"
            className="w-full bg-card text-text-primary placeholder-[#9CA3AF] text-[11px] rounded-md border border-border pl-8 pr-2.5 py-1.5 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/80"
          />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => onStatusFilter(f)}
              className={cn(
                'px-2 py-0.5 text-[10px] rounded-md border transition-all capitalize',
                statusFilter === f
                  ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-600'
                  : 'bg-card border-border text-text-secondary hover:text-text-primary'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {pipelines.map((p) => {
          const meta = STATUS_META[p.status];
          const active = p.id === selectedId;
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={cn(
                'w-full text-left p-2.5 rounded-lg border transition-all',
                active
                  ? 'bg-indigo-500/10 border-indigo-500/40 ring-1 ring-indigo-500/30'
                  : 'bg-card border-border hover:border-border-highlight'
              )}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-mono text-[11px] font-bold text-text-primary truncate">{p.name}</span>
                <Badge variant={meta.variant} size="sm" dot pulse={p.status === 'running'}>
                  {meta.label}
                </Badge>
              </div>
              <p className="text-[10px] text-text-secondary truncate mb-1.5">
                {p.source} → {p.target}
              </p>
              <div className="flex items-center gap-2 text-[9px] font-mono text-text-muted">
                <span>{p.cadence.replace('_', ' ')}</span>
                <span>•</span>
                <span className={p.stats.successRate24h >= 98 ? 'text-emerald-600' : p.stats.successRate24h >= 90 ? 'text-amber-600' : 'text-red-600'}>
                  {p.stats.successRate24h}%
                </span>
                <span>•</span>
                <span>SLA {p.slaMinutes}m</span>
              </div>
            </button>
          );
        })}

        {pipelines.length === 0 && (
          <p className="text-[11px] text-text-muted text-center py-8 px-4">No pipelines match the current filters.</p>
        )}
      </div>
    </div>
  );
};
