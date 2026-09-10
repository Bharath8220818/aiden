import { useCallback, useEffect, useState } from 'react';
import { Siren, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';
import OpsPageShell from '../components/ops/OpsPageShell';
import { incidentsApi, type Incident } from '../api/ops';

const severityBadge: Record<string, string> = {
  critical: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  error: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  info: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
};

const statusBadge: Record<string, string> = {
  open: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  investigating: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  identified: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  resolved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  closed: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
};

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'open' | 'resolved' | 'all'>('open');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = statusFilter === 'all' ? { limit: 100 } : { status: statusFilter, limit: 100 };
      setIncidents(await incidentsApi.list(params));
    } catch {
      setError('Incidents are unavailable. Start the backend to create and track incidents.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const analyze = async (id: number) => {
    setBusyId(id);
    try { await incidentsApi.analyze(id); await load(); } catch { /* surfaced via list refresh */ } finally { setBusyId(null); }
  };

  const resolve = async (id: number) => {
    setBusyId(id);
    try {
      await incidentsApi.resolve(id, 'Resolved via dashboard', 'Fix applied manually; recorded for learning.');
      await load();
    } finally { setBusyId(null); }
  };

  const counts = {
    open: incidents.filter(i => i.status !== 'resolved' && i.status !== 'closed').length,
    critical: incidents.filter(i => i.severity === 'critical').length,
    resolved: incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length,
  };

  return (
    <OpsPageShell
      title="Incidents"
      subtitle="Failures, diagnoses, and resolutions across your pipelines"
      actions={
        <button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-card-hover)]">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      }
      stats={[
        { label: 'Open', value: counts.open, accent: counts.open > 0 ? 'red' : 'green' },
        { label: 'Critical', value: counts.critical, accent: counts.critical > 0 ? 'red' : undefined },
        { label: 'Resolved', value: counts.resolved, accent: 'green' },
      ]}
    >
      <div className="mb-4 flex gap-2">
        {(['open', 'resolved', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-sm capitalize transition-colors ${
              statusFilter === f
                ? 'bg-purple-600 text-white'
                : 'border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-secondary)] hover:bg-[var(--color-card-hover)]'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-8 text-center text-sm text-[var(--color-text-muted)]">{error}</div>
      ) : loading ? (
        <div className="grid gap-3">{[1, 2, 3].map(i => <div key={i} className="h-24 animate-pulse rounded-xl bg-[var(--color-card)]" />)}</div>
      ) : incidents.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-10 text-center">
          <Siren className="h-8 w-8 text-emerald-400" />
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">
            No {statusFilter === 'all' ? '' : statusFilter + ' '}incidents. Pipelines are reporting clean.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map(i => (
            <div key={i.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-[var(--color-text-muted)]">{i.incident_key}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${severityBadge[i.severity] ?? severityBadge.info}`}>{i.severity}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${statusBadge[i.status] ?? statusBadge.open}`}>{i.status}</span>
                  </div>
                  <button onClick={() => setExpandedId(expandedId === i.id ? null : i.id)} className="mt-1.5 text-left">
                    <p className="font-medium text-[var(--color-text)] hover:text-purple-400">{i.title}</p>
                  </button>
                  <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                    {i.created_at ? new Date(i.created_at).toLocaleString() : ''} · confidence {i.confidence}%
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => analyze(i.id)}
                    disabled={busyId === i.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-500 disabled:opacity-50"
                  >
                    <Sparkles className={`h-3.5 w-3.5 ${busyId === i.id ? 'animate-pulse' : ''}`} /> Analyze
                  </button>
                  {i.status !== 'resolved' && i.status !== 'closed' && (
                    <button
                      onClick={() => resolve(i.id)}
                      disabled={busyId === i.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
                    </button>
                  )}
                </div>
              </div>

              {expandedId === i.id && (
                <div className="mt-3 space-y-2 border-t border-[var(--color-border)] pt-3 text-sm">
                  {i.description && <p className="text-[var(--color-text-secondary)]">{i.description}</p>}
                  {i.root_cause && (
                    <div className="rounded-lg bg-purple-500/5 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-purple-400">AI Root Cause</p>
                      <p className="mt-1 text-[var(--color-text)]">{i.root_cause}</p>
                    </div>
                  )}
                  {i.suggested_fix && (
                    <div className="rounded-lg bg-cyan-500/5 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Suggested Fix</p>
                      <p className="mt-1 text-[var(--color-text)]">{i.suggested_fix}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </OpsPageShell>
  );
}
