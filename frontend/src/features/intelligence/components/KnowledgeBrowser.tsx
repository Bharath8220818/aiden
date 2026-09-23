import React from 'react';
import { KnowledgeDoc, RetrievedChunk, KnowledgeSourceKind } from '../types';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import {
  BookOpen,
  Search,
  FileText,
  ShieldAlert,
  BookMarked,
  Table2,
  Calculator,
  GitBranch,
  Zap,
  Database,
  Sparkles,
} from 'lucide-react';

export interface KnowledgeBrowserProps {
  docs: KnowledgeDoc[];
  corpusStats: { docs: number; chunks: number; tokens: number; retrievals: number; lastIndexedAt: string | null };
  query: string;
  onQueryChange: (q: string) => void;
  results: RetrievedChunk[] | null;
  isRetrieving: boolean;
  retrievedAt: string | null;
  onSearch: (q: string) => void;
  isLoading: boolean;
}

const KIND_META: Record<KnowledgeSourceKind, { icon: JSX.Element; label: string; accent: string }> = {
  data_contract: { icon: <FileText className="w-3.5 h-3.5" />, label: 'Contract', accent: 'text-indigo-600 bg-indigo-500/10 border-indigo-500/30' },
  postmortem: { icon: <ShieldAlert className="w-3.5 h-3.5" />, label: 'Postmortem', accent: 'text-red-600 bg-red-500/10 border-red-500/30' },
  runbook: { icon: <BookMarked className="w-3.5 h-3.5" />, label: 'Runbook', accent: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30' },
  schema_doc: { icon: <Table2 className="w-3.5 h-3.5" />, label: 'Schema', accent: 'text-cyan-600 bg-cyan-500/10 border-cyan-500/30' },
  metric_definition: { icon: <Calculator className="w-3.5 h-3.5" />, label: 'Metric', accent: 'text-amber-600 bg-amber-500/10 border-amber-500/30' },
  lineage_snapshot: { icon: <GitBranch className="w-3.5 h-3.5" />, label: 'Lineage', accent: 'text-violet-600 bg-violet-500/10 border-violet-500/30' },
  incident_pattern: { icon: <Zap className="w-3.5 h-3.5" />, label: 'Pattern', accent: 'text-fuchsia-600 bg-fuchsia-500/10 border-fuchsia-500/30' },
};

const SUGGESTED = ['duplicate touch_id retries', 'kafka consumer lag escalation', 'gross_revenue_usd definition'];

export const KnowledgeBrowser: React.FC<KnowledgeBrowserProps> = ({
  docs,
  corpusStats,
  query,
  onQueryChange,
  results,
  isRetrieving,
  retrievedAt,
  onSearch,
  isLoading,
}) => {
  return (
    <div className="space-y-4">
      {/* Corpus stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Documents', value: corpusStats.docs.toLocaleString() },
          { label: 'Chunks indexed', value: corpusStats.chunks.toLocaleString() },
          { label: 'Tokens', value: `${(corpusStats.tokens / 1000).toFixed(1)}k` },
          { label: 'Retrievals', value: corpusStats.retrievals.toLocaleString() },
          {
            label: 'Last indexed',
            value: corpusStats.lastIndexedAt ? new Date(corpusStats.lastIndexedAt).toLocaleTimeString() : '—',
          },
        ].map((s) => (
          <div key={s.label} className="p-3 rounded-lg bg-card border border-border text-center">
            <div className="text-lg font-bold font-mono text-text-primary">{s.value}</div>
            <div className="text-[9px] uppercase text-text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Corpus list */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-primary">Corpus</span>
            <span className="text-[9px] font-mono text-text-muted ml-auto">text-embedding-3-large · 3072-dim</span>
          </div>
          <div className="p-2 space-y-1.5 max-h-[420px] overflow-y-auto">
            {isLoading
              ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)
              : docs.map((doc) => {
                  const meta = KIND_META[doc.kind];
                  return (
                    <div key={doc.id} className="p-3 rounded-lg bg-card border border-border space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase', meta.accent)}>
                          {meta.icon}
                          {meta.label}
                        </span>
                        <span className="text-[9px] font-mono text-text-muted">
                          {doc.chunks} chunks · {new Date(doc.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-text-primary leading-snug">{doc.title}</p>
                      <p className="text-[10px] text-text-secondary leading-snug line-clamp-2">{doc.excerpt}</p>
                      <div className="flex items-center gap-1 flex-wrap">
                        {doc.tags.slice(0, 4).map((t) => (
                          <span key={t} className="text-[8px] px-1.5 py-0.5 rounded bg-card border border-border-subtle text-text-muted font-mono">
                            #{t}
                          </span>
                        ))}
                        <span className="text-[9px] text-text-muted font-mono ml-auto">{doc.retrievalCount}× retrieved</span>
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>

        {/* Retrieval playground */}
        <div className="rounded-lg border border-border bg-card overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-primary">Retrieval Preview</span>
            {retrievedAt && (
              <span className="text-[9px] font-mono text-text-muted ml-auto">{new Date(retrievedAt).toLocaleTimeString()}</span>
            )}
          </div>

          <div className="p-3 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                <input
                  value={query}
                  onChange={(e) => onQueryChange(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onSearch(query)}
                  placeholder="Ask the knowledge base…"
                  className="w-full bg-background text-text-primary placeholder-[#9CA3AF] text-[11px] rounded-md border border-border pl-8 pr-2.5 py-2 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/80"
                />
              </div>
              <Button variant="ai" size="sm" onClick={() => onSearch(query)} isLoading={isRetrieving} className="text-xs shrink-0">
                Retrieve
              </Button>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    onQueryChange(s);
                    onSearch(s);
                  }}
                  className="text-[9px] px-2 py-1 rounded-md bg-card border border-border text-text-secondary hover:text-indigo-600 hover:border-indigo-500/40 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>

            {isRetrieving && (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-20 rounded-md bg-card-hover animate-pulse" style={{ width: `${100 - i * 8}%` }} />
                ))}
              </div>
            )}

            {results && !isRetrieving && (
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {results.map((chunk) => {
                  const meta = KIND_META[chunk.kind];
                  const pct = Math.round(chunk.score * 100);
                  return (
                    <div key={`${chunk.docId}-${chunk.score}`} className="p-2.5 rounded-lg bg-card border border-border space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase', meta.accent)}>
                          {meta.icon}
                          {meta.label}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Database className="w-3 h-3 text-text-muted" />
                          <span className={cn('text-[10px] font-mono font-bold', pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-text-secondary')}>
                            {pct}% match
                          </span>
                        </span>
                      </div>
                      <p className="text-[10px] font-semibold text-text-primary">{chunk.docTitle}</p>
                      <p className="text-[10px] text-text-secondary font-mono leading-relaxed">{chunk.content}</p>
                      <div className="h-1 rounded-full bg-background border border-border-subtle overflow-hidden">
                        <div
                          className={cn('h-full rounded-full', pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-border-highlight')}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!results && !isRetrieving && (
              <p className="text-[10px] text-text-muted text-center py-6">
                Try a query — agents use this same retrieval pipeline grounded on the corpus.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
