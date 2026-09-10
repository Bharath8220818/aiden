import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plug, Zap, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import OpsPageShell from '../components/ops/OpsPageShell';
import { connectionsApi, type Connection } from '../api/ops';

const statusIcon = (status: string) => {
  if (status === 'connected' || status === 'healthy') return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  if (status === 'error') return <XCircle className="h-4 w-4 text-rose-400" />;
  return <HelpCircle className="h-4 w-4 text-slate-400" />;
};

export default function DataSourcesPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      // default project scope until the project picker lands; project 1 is the seeded default
      setConnections(await connectionsApi.list(1));
    } catch {
      setError('Connections are unavailable. Start the backend and create a connection to see it here.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const test = async (id: number) => {
    setTesting(id);
    try { await connectionsApi.test(id); await load(); } finally { setTesting(null); }
  };

  const healthy = connections.filter(c => c.status === 'connected' || c.status === 'healthy').length;

  return (
    <OpsPageShell
      title="Data Sources"
      subtitle="Stored tool connections and their health"
      actions={
        <Link to="/tool-gateway" className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-500">
          <Plug className="h-4 w-4" /> Add Connection
        </Link>
      }
      stats={[
        { label: 'Connections', value: connections.length },
        { label: 'Healthy', value: healthy, accent: 'green' },
        { label: 'Errors', value: connections.filter(c => c.status === 'error').length, accent: connections.some(c => c.status === 'error') ? 'red' : undefined },
      ]}
    >
      {error ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-8 text-center text-sm text-[var(--color-text-muted)]">{error}</div>
      ) : loading ? (
        <div className="grid gap-3">{[1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-[var(--color-card)]" />)}</div>
      ) : connections.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-8 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">No stored connections yet.</p>
          <Link to="/tool-gateway" className="mt-2 inline-block text-sm font-medium text-purple-400 hover:text-purple-300">
            Configure one in the Tool Gateway →
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {connections.map(c => (
            <div key={c.id} className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {statusIcon(c.status)}
                  <p className="truncate font-medium text-[var(--color-text)]">{c.name}</p>
                </div>
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                  {c.tool_type}
                  {c.last_health_check?.latency_ms ? ` · ${Math.round(c.last_health_check.latency_ms)}ms` : ''}
                </p>
              </div>
              <button
                onClick={() => test(c.id)}
                disabled={testing === c.id}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-card-hover)] disabled:opacity-50"
              >
                <Zap className={`h-3.5 w-3.5 ${testing === c.id ? 'animate-pulse' : ''}`} />
                {testing === c.id ? 'Testing…' : 'Test'}
              </button>
            </div>
          ))}
        </div>
      )}
    </OpsPageShell>
  );
}
