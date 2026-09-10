import { useEffect, useState } from 'react';
import { Brain, Search, RefreshCw } from 'lucide-react';
import OpsPageShell from '../components/ops/OpsPageShell';
import { memoryApi, type KnowledgeResult } from '../api/ops';

interface LayerStat {
  label: string;
  status: string;
  detail: string;
  accent: string;
}

export default function ProjectMemoryPage() {
  const [layers, setLayers] = useState<LayerStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<KnowledgeResult[]>([]);
  const [searched, setSearched] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const stats = await memoryApi.stats();
      const conv = stats.conversation as Record<string, unknown> | undefined;
      const proj = stats.project as Record<string, unknown> | undefined;
      const know = (stats.knowledge ?? stats.vector_store) as Record<string, unknown> | undefined;
      setLayers([
        {
          label: 'Conversation Memory',
          status: String(conv?.backend ?? 'active'),
          detail: `${conv?.total_sessions ?? conv?.sessions ?? 0} sessions`,
          accent: 'text-purple-400',
        },
        {
          label: 'Project Memory',
          status: String(proj?.backend ?? 'postgres'),
          detail: `${proj?.architectures ?? 0} architectures · ${proj?.incidents ?? 0} incidents`,
          accent: 'text-cyan-400',
        },
        {
          label: 'Knowledge (RAG)',
          status: String(know?.backend ?? know?.status ?? 'memory'),
          detail: `${know?.total_points ?? know?.memory_points ?? know?.points ?? 0} vectors`,
          accent: 'text-emerald-400',
        },
      ]);
    } catch {
      setError('Memory stats are unavailable. Start the backend to inspect the three memory layers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearched(true);
    try {
      const resp = await memoryApi.search(query.trim(), 5);
      setResults(resp.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  return (
    <OpsPageShell
      title="Project Memory"
      subtitle="What AIDEN remembers: conversations, project state, and project knowledge"
      actions={
        <button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-card-hover)]">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      }
    >
      {error && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-center text-sm text-[var(--color-text-muted)]">{error}</div>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        {loading && layers.length === 0
          ? [1, 2, 3].map(i => <div key={i} className="h-28 animate-pulse rounded-xl bg-[var(--color-card)]" />)
          : layers.map(l => (
              <div key={l.label} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
                <div className="flex items-center gap-2">
                  <Brain className={`h-5 w-5 ${l.accent}`} />
                  <p className="font-medium text-[var(--color-text)]">{l.label}</p>
                </div>
                <p className={`mt-2 font-mono text-sm capitalize ${l.accent}`}>{l.status}</p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">{l.detail}</p>
              </div>
            ))}
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Search Project Knowledge</h2>
        <form onSubmit={search} className="mt-3 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="e.g. why did the customer_etl pipeline fail last week?"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] py-2 pl-9 pr-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-purple-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50"
          >
            {searching ? 'Searching…' : 'Search'}
          </button>
        </form>

        {searched && !searching && results.length === 0 && (
          <p className="mt-4 text-sm text-[var(--color-text-muted)]">
            No matching knowledge found. Ingest documents via the Knowledge Base or resolve incidents to build memory.
          </p>
        )}
        <div className="mt-4 space-y-2">
          {results.map((r, idx) => (
            <div key={idx} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono uppercase tracking-wider text-purple-400">{r.payload.source_type}</span>
                <span className="text-[var(--color-text-muted)]">score {r.score.toFixed(3)}</span>
              </div>
              <p className="mt-1.5 line-clamp-3 text-sm text-[var(--color-text)]">{r.payload.content}</p>
            </div>
          ))}
        </div>
      </div>
    </OpsPageShell>
  );
}
