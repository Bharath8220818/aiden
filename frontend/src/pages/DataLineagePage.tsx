import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Database, Workflow, GitBranch } from 'lucide-react';
import OpsPageShell from '../components/ops/OpsPageShell';
import { api } from '../api';

interface LineagePipeline {
  id: number;
  name: string;
  source_type: string;
  destination_type: string;
  status?: string;
}

export default function DataLineagePage() {
  const [pipelines, setPipelines] = useState<LineagePipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<LineagePipeline[] | { pipelines: LineagePipeline[] }>('/api/v1/pipelines', { params: { limit: 50 } })
      .then(r => setPipelines(Array.isArray(r.data) ? r.data : r.data.pipelines ?? []))
      .catch(() => setError('Lineage requires pipelines. Start the backend and create a pipeline to trace its flow.'))
      .finally(() => setLoading(false));
  }, []);

  const sourceCounts = pipelines.reduce<Record<string, number>>((acc, p) => {
    acc[p.source_type] = (acc[p.source_type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <OpsPageShell
      title="Data Lineage"
      subtitle="How data flows from sources to destinations across pipelines"
      stats={[
        { label: 'Pipelines', value: pipelines.length },
        { label: 'Distinct Sources', value: Object.keys(sourceCounts).length, accent: 'cyan' },
      ]}
    >
      {error ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-8 text-center text-sm text-[var(--color-text-muted)]">{error}</div>
      ) : loading ? (
        <div className="h-48 animate-pulse rounded-xl bg-[var(--color-card)]" />
      ) : pipelines.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-10 text-center">
          <Workflow className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">No pipelines to trace yet.</p>
          <Link to="/builder" className="mt-2 inline-block text-sm font-medium text-purple-400 hover:text-purple-300">Build a pipeline →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {pipelines.map(p => (
            <Link
              key={p.id}
              to={`/pipelines/${p.id}`}
              className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 transition-colors hover:border-purple-500/40"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500/10 px-3 py-1.5 text-sm font-medium text-cyan-400">
                  <Database className="h-4 w-4" /> {p.source_type}
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
                <span className="truncate text-sm font-medium text-[var(--color-text)]">{p.name}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-purple-500/10 px-3 py-1.5 text-sm font-medium text-purple-400">
                  <GitBranch className="h-4 w-4" /> {p.destination_type}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </OpsPageShell>
  );
}
