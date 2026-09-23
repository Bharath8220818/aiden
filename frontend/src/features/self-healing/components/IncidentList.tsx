import React from 'react';
import { Incident, IncidentSeverity, IncidentStatus } from '../types';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import { AlertOctagon, CircleAlert, Zap, ShieldAlert, Eye, ChevronRight } from 'lucide-react';

export interface IncidentListProps {
  incidents: Incident[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
}

const SEVERITY_META: Record<IncidentSeverity, { icon: JSX.Element; badge: 'error' | 'warning' | 'info' | 'neutral' }> = {
  critical: { icon: <AlertOctagon className="w-3.5 h-3.5" />, badge: 'error' },
  high: { icon: <CircleAlert className="w-3.5 h-3.5" />, badge: 'warning' },
  medium: { icon: <CircleAlert className="w-3.5 h-3.5" />, badge: 'info' },
  low: { icon: <CircleAlert className="w-3.5 h-3.5" />, badge: 'neutral' },
};

const STATUS_LABEL: Record<string, { label: string; variant: 'error' | 'warning' | 'ai' | 'success' | 'neutral' }> = {
  detected: { label: 'Detected', variant: 'error' },
  investigating: { label: 'Investigating', variant: 'warning' },
  fix_proposed: { label: 'Fix proposed', variant: 'ai' },
  awaiting_approval: { label: 'Needs approval', variant: 'warning' },
  healing: { label: 'Healing', variant: 'ai' },
  resolved: { label: 'Resolved', variant: 'success' },
  dismissed: { label: 'Dismissed', variant: 'neutral' },
};

const statusLabel = (status: string) =>
  STATUS_LABEL[status] ?? { label: status?.replace(/_/g, ' ') || 'Unknown', variant: 'neutral' as const };

const DETECTOR_ICON: Record<string, JSX.Element> = {
  anomaly_detector: <Zap className="w-3 h-3" />,
  quality_gate: <ShieldAlert className="w-3 h-3" />,
  task_failure: <AlertOctagon className="w-3 h-3" />,
  schema_drift_watcher: <Eye className="w-3 h-3" />,
  drift: <Eye className="w-3 h-3" />,
};

/** Tolerant accessors — the backend persists free-form detector/status strings. */
const detectorIcon = (key: string | null | undefined) => DETECTOR_ICON[key ?? ''] ?? <Zap className="w-3 h-3" />;

export const IncidentList: React.FC<IncidentListProps> = ({ incidents, selectedId, onSelect, isLoading }) => {
  if (isLoading) {
    return (
      <div className="p-3 space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  const sorted = [...incidents].sort((a, b) => {
    const openRank = (s: IncidentStatus) => (s === 'resolved' || s === 'dismissed' ? 1 : 0);
    if (openRank(a.status) !== openRank(b.status)) return openRank(a.status) - openRank(b.status);
    const sevRank = { critical: 0, high: 1, medium: 2, low: 3 };
    return sevRank[a.severity] - sevRank[b.severity];
  });

  return (
    <div className="p-2 space-y-1.5 overflow-y-auto">
      {sorted.map((incident) => {
        const sev = SEVERITY_META[incident.severity];
        const status = statusLabel(incident.status);
        const active = incident.id === selectedId;
        const isResolved = incident.status === 'resolved' || incident.status === 'dismissed';
        return (
          <button
            key={incident.id}
            onClick={() => onSelect(incident.id)}
            className={cn(
              'w-full text-left p-3 rounded-lg border transition-all space-y-1.5',
              active
                ? 'bg-indigo-500/10 border-indigo-500/40 ring-1 ring-indigo-500/30'
                : 'bg-card border-border hover:border-border-highlight',
              isResolved && !active && 'opacity-60'
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={cn('flex items-center gap-1.5', incident.severity === 'critical' ? 'text-red-600' : 'text-amber-600')}>
                {sev.icon}
                <span className="text-[9px] font-bold uppercase tracking-wider">{incident.severity}</span>
              </span>
              <Badge variant={status.variant} size="sm" dot pulse={!isResolved && incident.status !== 'detected'}>
                {status.label}
              </Badge>
            </div>

            <p className="text-[11px] font-semibold text-text-primary leading-snug line-clamp-2">{incident.title}</p>

            <div className="flex items-center gap-1.5 flex-wrap text-[9px] font-mono text-text-muted">
              <span className="px-1.5 py-0.5 rounded bg-card border border-border-subtle font-mono text-text-secondary">
                {incident.pipelineName}
              </span>
              <span className="flex items-center gap-0.5">
                {detectorIcon(incident.detectedBy)}
                {(incident.detectedBy ?? 'auto').replace(/_/g, ' ')}
              </span>
              <span>· {incident.occurrences}×</span>
              {incident.mttrMinutes !== null && (
                <span className="text-emerald-600">· MTTR {incident.mttrMinutes}m</span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[9px] text-text-muted font-mono">{new Date(incident.detectedAt).toLocaleTimeString()}</span>
              <ChevronRight className={cn('w-3.5 h-3.5 transition-transform', active ? 'text-indigo-600 translate-x-0.5' : 'text-text-muted')} />
            </div>
          </button>
        );
      })}
    </div>
  );
};
