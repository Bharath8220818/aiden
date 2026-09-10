import { useEffect, useState } from 'react';
import { ShieldCheck, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';
import OpsPageShell from '../components/ops/OpsPageShell';
import { monitoringApi, type QualityResult } from '../api/ops';

const statusStyle: Record<string, { badge: string; icon: React.ReactNode }> = {
  passed: { badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', icon: <ShieldCheck className="h-4 w-4" /> },
  warning: { badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30', icon: <AlertTriangle className="h-4 w-4" /> },
  failed: { badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30', icon: <XCircle className="h-4 w-4" /> },
};

export default function DataQualityPage() {
  const [results, setResults] = useState<QualityResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'passed' | 'warning' | 'failed'>('all');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setResults(await monitoringApi.quality({ limit: 100 }));
    } catch {
      setError('Quality results are unavailable. Start the backend to collect data quality checks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const counts = {
    passed: results.filter(r => r.status === 'passed').length,
    warning: results.filter(r => r.status === 'warning').length,
    failed: results.filter(r => r.status === 'failed').length,
  };
  const passRate = results.length ? Math.round((counts.passed / results.length) * 100) : 100;
  const shown = filter === 'all' ? results : results.filter(r => r.status === filter);

  return (
    <OpsPageShell
      title="Data Quality"
      subtitle="Rule outcomes from pipeline quality gates"
      actions={
        <button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-card-hover)]">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      }
      stats={[
        { label: 'Pass Rate', value: `${passRate}%`, accent: passRate >= 95 ? 'green' : passRate >= 80 ? 'amber' : 'red' },
        { label: 'Passed', value: counts.passed, accent: 'green' },
        { label: 'Warnings', value: counts.warning, accent: 'amber' },
        { label: 'Failed', value: counts.failed, accent: 'red' },
        { label: 'Total Checks', value: results.length },
      ]}
    >
      <div className="mb-4 flex gap-2">
        {(['all', 'passed', 'warning', 'failed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-sm capitalize transition-colors ${
              filter === f
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
        <div className="grid gap-3">{[1, 2, 3].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-[var(--color-card)]" />)}</div>
      ) : shown.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-8 text-center text-sm text-[var(--color-text-muted)]">
          No quality checks recorded yet. Run a pipeline with quality rules to populate this view.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-card)] text-left text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
              <tr>
                <th className="px-4 py-3">Rule</th>
                <th className="px-4 py-3">Status</th>
                <th className="hidden px-4 py-3 sm:table-cell">Pass Rate</th>
                <th className="hidden px-4 py-3 md:table-cell">Evaluated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-background)]">
              {shown.map(r => {
                const style = statusStyle[r.status] ?? statusStyle.passed;
                return (
                  <tr key={r.id} className="hover:bg-[var(--color-card-hover)]">
                    <td className="px-4 py-3 font-medium text-[var(--color-text)]">{r.rule_name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${style.badge}`}>
                        {style.icon} {r.status}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-[var(--color-text-secondary)] sm:table-cell">{Math.round(r.pass_rate * 100)}%</td>
                    <td className="hidden px-4 py-3 text-xs text-[var(--color-text-muted)] md:table-cell">
                      {r.evaluated_at ? new Date(r.evaluated_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </OpsPageShell>
  );
}
