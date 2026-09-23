import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Incident, IncidentStatus } from '@/features/self-healing/types';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  Bot,
  Timer,
  TrendingDown,
  ArrowRight,
  ShieldCheck,
  Eye,
  Zap,
  AlertOctagon,
  CheckCircle2,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchIncidents } from '@/features/self-healing/services/selfHealing.service';

type SeverityFilter = 'all' | 'critical' | 'high' | 'medium';
type OpenFilter = 'open' | 'resolved' | 'all';

/**
 * Detector metadata. Keyed by the known detection sources, but tolerant of
 * unexpected values — the backend persists free-form `detection_source`
 * strings (e.g. 'drift'), and an unknown key must never crash the page.
 */
const DETECTOR_ICONS: Record<string, { icon: JSX.Element; label: string }> = {
  anomaly_detector: { icon: <Zap className="w-3 h-3" />, label: 'Anomaly detector' },
  quality_gate: { icon: <ShieldCheck className="w-3 h-3" />, label: 'Quality gate' },
  task_failure: { icon: <AlertOctagon className="w-3 h-3" />, label: 'Task failure' },
  schema_drift_watcher: { icon: <Eye className="w-3 h-3" />, label: 'Schema watcher' },
  drift: { icon: <Eye className="w-3 h-3" />, label: 'Schema watcher' },
};

/** Unknown detector values fall back to a generic pulse — never undefined. */
const detectorMeta = (key: string | null | undefined) =>
  (key && DETECTOR_ICONS[key]) || { icon: <Zap className="w-3 h-3" />, label: key || 'Auto-detected' };

/** Status metadata; unknown statuses degrade to a neutral badge. */
const STATUS_META: Record<string, { variant: 'error' | 'warning' | 'ai' | 'success' | 'neutral'; label: string }> = {
  detected: { variant: 'error', label: 'Detected' },
  investigating: { variant: 'warning', label: 'Investigating' },
  fix_proposed: { variant: 'ai', label: 'Fix proposed' },
  awaiting_approval: { variant: 'warning', label: 'Needs approval' },
  healing: { variant: 'ai', label: 'Healing' },
  resolved: { variant: 'success', label: 'Resolved' },
  dismissed: { variant: 'neutral', label: 'Dismissed' },
};

const statusMeta = (status: string) =>
  STATUS_META[status] ?? { variant: 'neutral' as const, label: status?.replace(/_/g, ' ') || 'Unknown' };

export const IncidentsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { incidentId } = useParams<{ incidentId: string }>();

  const incidentsQuery = useQuery({ queryKey: ['incidents'], queryFn: fetchIncidents, refetchInterval: 30_000 });
  const incidents: Incident[] = useMemo(() => incidentsQuery.data ?? [], [incidentsQuery.data]);

  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [openFilter, setOpenFilter] = useState<OpenFilter>('open');
  const [healingId, setHealingId] = useState<string | null>(null);

  // Deep-link support: /incidents/:incidentId highlights the incident; unknown ids redirect.
  const focusedId = incidentId
    ? incidents.find((i) => i.id === incidentId)?.id ?? null
    : null;
  useEffect(() => {
    if (incidentId && !focusedId && !incidentsQuery.isLoading && !incidentsQuery.isFetching) {
      navigate('/incidents', { replace: true });
    }
  }, [incidentId, focusedId, incidentsQuery.isLoading, incidentsQuery.isFetching, navigate]);

  const filtered = useMemo(
    () =>
      incidents.filter((i) => {
        const matchesSeverity = severityFilter === 'all' || i.severity === severityFilter;
        const isOpen = i.status !== 'resolved' && i.status !== 'dismissed';
        const matchesOpen =
          openFilter === 'all' ? true : openFilter === 'open' ? isOpen : !isOpen;
        return matchesSeverity && matchesOpen;
      }),
    [incidents, severityFilter, openFilter]
  );

  const stats = {
    open: incidents.filter((i) => i.status !== 'resolved' && i.status !== 'dismissed').length,
    critical: incidents.filter((i) => i.severity === 'critical' && i.status !== 'resolved').length,
    resolved: incidents.filter((i) => i.status === 'resolved').length,
    avgMttr: (() => {
      const resolved = incidents.filter((i) => i.mttrMinutes !== null);
      return resolved.length
        ? Math.round(resolved.reduce((s, i) => s + (i.mttrMinutes ?? 0), 0) / resolved.length)
        : 0;
    })(),
    mttrTrend: -34, // percent vs previous period (mock)
  };

  const handleHeal = (incident: Incident) => {
    setHealingId(incident.id);
    // Mark investigating optimistically
    queryClient.setQueryData<Incident[]>(['incidents'], (current) =>
      (current ?? []).map((i) => (i.id === incident.id ? { ...i, status: 'investigating' as IncidentStatus } : i))
    );
    setTimeout(() => navigate(`/self-healing/${incident.id}`), 600);
  };

  return (
    <PageContainer
      title="Incidents & Alerting"
      description="Failure triage, MTTR tracking, and one-click handoff to the self-healing engine"
      fullWidth
      breadcrumbs={[
        { label: 'AIDEN' },
        { label: 'Operations' },
        { label: 'Incidents' },
      ]}
    >
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Open incidents', value: stats.open, icon: <AlertTriangle className="w-4 h-4 text-red-600" /> },
          { label: 'Critical', value: stats.critical, icon: <AlertOctagon className="w-4 h-4 text-red-600" /> },
          {
            label: 'Avg MTTR',
            value: `${stats.avgMttr}m`,
            icon: <Timer className="w-4 h-4 text-amber-600" />,
            trend: (
              <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 font-mono">
                <TrendingDown className="w-3 h-3" />
                {stats.mttrTrend}%
              </span>
            ),
          },
          { label: 'Auto-resolved', value: stats.resolved, icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" /> },
        ].map((s) => (
          <div key={s.label} className="p-3.5 rounded-lg bg-card border border-border">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-semibold text-text-muted">{s.label}</span>
              {s.icon}
            </div>
            <div className="flex items-end gap-2 mt-1">
              <span className="text-2xl font-bold text-text-primary font-mono">{s.value}</span>
              {s.trend}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {(['open', 'resolved', 'all'] as OpenFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setOpenFilter(f)}
            className={cn(
              'px-3 py-1.5 text-[11px] font-medium rounded-md border transition-all capitalize',
              openFilter === f
                ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-600'
                : 'bg-card border-border text-text-secondary hover:text-text-primary'
            )}
          >
            {f}
          </button>
        ))}
        <span className="w-px h-4 bg-border mx-1" />
        {(['all', 'critical', 'high', 'medium'] as SeverityFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setSeverityFilter(f)}
            className={cn(
              'px-3 py-1.5 text-[11px] font-medium rounded-md border transition-all capitalize',
              severityFilter === f
                ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-600'
                : 'bg-card border-border text-text-secondary hover:text-text-primary'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Incident cards */}
      {incidentsQuery.isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="w-6 h-6" />}
          title="No incidents in this view"
          description="When a pipeline fails, a quality gate trips, or schema drift is detected, the incident appears here for triage."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map((incident) => {
            const status = statusMeta(incident.status);
            const isResolving = healingId === incident.id;
            const isFocused = incident.id === focusedId;
            return (
              <Card
                key={incident.id}
                onClick={() => navigate(`/incidents/${incident.id}`)}
                className={cn(
                  'p-4 space-y-2.5 transition-colors cursor-pointer',
                  isFocused ? 'border-indigo-500/50 ring-1 ring-indigo-500/30' : 'bg-card border-border'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <Badge
                      variant={incident.severity === 'critical' ? 'error' : incident.severity === 'high' ? 'warning' : 'info'}
                      size="sm"
                      dot
                      pulse={incident.status !== 'resolved' && incident.status !== 'dismissed'}
                    >
                      {incident.severity}
                    </Badge>
                    <Badge variant={status.variant} size="sm">
                      {status.label}
                    </Badge>
                    <span className="text-[9px] text-text-muted font-mono flex items-center gap-1">
                      {detectorMeta(incident.detectedBy).icon}
                      {detectorMeta(incident.detectedBy).label}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-text-muted shrink-0">
                    {new Date(incident.detectedAt).toLocaleTimeString()}
                  </span>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-text-primary leading-snug">{incident.title}</h3>
                  <p className="text-[10px] font-mono text-text-muted mt-0.5">
                    {incident.pipelineName} · {incident.errorSignature}
                  </p>
                </div>

                <p className="text-[10px] text-text-secondary leading-relaxed line-clamp-2">{incident.errorMessage}</p>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {incident.affectedDownstream.map((d) => (
                    <span key={d} className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/25 text-red-600">
                      ↓ {d}
                    </span>
                  ))}
                  <span className="text-[9px] text-text-muted font-mono ml-auto">{incident.occurrences}× seen</span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-border-subtle">
                  {incident.mttrMinutes !== null ? (
                    <span className="text-[10px] font-mono text-emerald-600 flex items-center gap-1">
                      <Timer className="w-3 h-3" /> resolved in {incident.mttrMinutes} min
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-text-muted">
                      downstream: {incident.affectedDownstream.length} consumers
                    </span>
                  )}
                  {incident.status !== 'resolved' && incident.status !== 'dismissed' ? (
                    <Button
                      variant="ai"
                      size="sm"
                      onClick={() => handleHeal(incident)}
                      isLoading={isResolving}
                      leftIcon={<Bot className="w-3.5 h-3.5" />}
                      rightIcon={!isResolving ? <ArrowRight className="w-3.5 h-3.5" /> : undefined}
                      className="text-[10px] shadow-ai-glow"
                    >
                      {isResolving ? 'Opening healer…' : 'Heal with AIDEN'}
                    </Button>
                  ) : (
                    <Badge variant="success" size="sm">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Closed
                    </Badge>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
};

export default IncidentsPage;
