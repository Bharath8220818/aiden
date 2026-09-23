import React, { useState } from 'react';
import { QueryResult, ExecutionPlan, QueryLogEntry, PlanNode } from '../types';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { Table2, GitBranch, ScrollText, Download, CheckCircle2, XCircle, AlertTriangle, Info, Timer, Zap } from 'lucide-react';

export interface ResultsPanelProps {
  result: QueryResult | null;
  plan: ExecutionPlan | null;
  isPlanLoading: boolean;
  logs: QueryLogEntry[];
  onLoadPlan: () => void;
  isRunning: boolean;
  runSeconds: number;
}

const PLAN_NODE_COLORS: Record<string, string> = {
  TableScan: 'border-emerald-500/50 text-emerald-600',
  IndexScan: 'border-emerald-400/60 text-emerald-200',
  Join: 'border-indigo-500/50 text-indigo-600',
  Aggregate: 'border-violet-500/50 text-violet-600',
  Sort: 'border-amber-500/50 text-amber-600',
  Filter: 'border-cyan-500/50 text-cyan-600',
  Exchange: 'border-fuchsia-500/50 text-fuchsia-600',
  Window: 'border-blue-500/50 text-blue-600',
  Result: 'border-border-highlight text-text-secondary',
};

function PlanTree({ node }: { node: PlanNode }) {
  return (
    <div className="space-y-1.5">
      <div className={cn('inline-flex flex-col rounded-md border bg-card px-3 py-2 min-w-[280px]', PLAN_NODE_COLORS[node.type] ?? 'border-border text-text-secondary')}>
        <div className="flex items-center justify-between gap-6">
          <span className="text-[11px] font-bold">{node.type}</span>
          <span className="text-[9px] font-mono opacity-80">
            rows≈{node.rows.toLocaleString()} · cost {node.cost}
          </span>
        </div>
        <span className="text-[10px] text-text-secondary mt-0.5">{node.detail}</span>
      </div>
      {node.children.length > 0 && (
        <div className="ml-6 pl-4 border-l border-border space-y-1.5">
          {node.children.map((child) => (
            <PlanTree key={child.id} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
  result,
  plan,
  isPlanLoading,
  logs,
  onLoadPlan,
  isRunning,
  runSeconds,
}) => {
  const [tab, setTab] = useState<'results' | 'plan' | 'logs'>('results');

  const exportCsv = () => {
    if (!result || result.rows.length === 0) return;
    const header = result.columns.map((c) => c.name).join(',');
    const body = result.rows.map((r) => result.columns.map((c) => JSON.stringify(r[c.name] ?? '')).join(',')).join('\n');
    const blob = new Blob([`${header}\n${body}`], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${result.runId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const tabs = [
    { id: 'results' as const, label: 'Results', icon: <Table2 className="w-3.5 h-3.5" />, badge: result?.rowCount },
    { id: 'plan' as const, label: 'Execution Plan', icon: <GitBranch className="w-3.5 h-3.5" /> },
    { id: 'logs' as const, label: 'Logs', icon: <ScrollText className="w-3.5 h-3.5" />, badge: logs.length || undefined },
  ];

  return (
    <div className="flex flex-col h-full bg-card border-t border-border">
      {/* Tab bar + stats */}
      <div className="flex items-center justify-between px-3 border-b border-border shrink-0">
        <div className="flex items-center">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                if (t.id === 'plan' && !plan && !isPlanLoading) onLoadPlan();
              }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold border-b-2 transition-colors',
                tab === t.id
                  ? 'text-text-primary border-indigo-500'
                  : 'text-text-muted border-transparent hover:text-text-secondary'
              )}
            >
              {t.icon}
              {t.label}
              {t.badge !== undefined && (
                <span className="px-1.5 py-0.5 text-[9px] rounded-full bg-card-active text-text-secondary font-mono">{t.badge}</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono text-text-secondary">
          {isRunning ? (
            <span className="flex items-center gap-1.5 text-indigo-600">
              <Zap className="w-3 h-3 animate-pulse" /> running {runSeconds.toFixed(1)}s
            </span>
          ) : result?.status === 'success' ? (
            <>
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="w-3 h-3" /> {result.durationMs} ms
              </span>
              <span className="hidden sm:inline">{result.rowsScanned.toLocaleString()} rows scanned</span>
              <span className="hidden md:inline">{result.bytesSpilled}</span>
              <span className="hidden lg:inline px-1.5 py-0.5 rounded bg-card border border-border">{result.warehouse}</span>
            </>
          ) : result?.status === 'failed' ? (
            <span className="flex items-center gap-1 text-red-600">
              <XCircle className="w-3 h-3" /> {result.error?.code}
            </span>
          ) : null}
          {tab === 'results' && result?.rows.length ? (
            <button onClick={exportCsv} className="p-1 rounded hover:bg-card-active text-text-muted hover:text-text-primary" title="Export CSV">
              <Download className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Panels */}
      <div className="flex-1 min-h-0 overflow-auto">
        {/* RESULTS */}
        {tab === 'results' && (
          <>
            {isRunning ? (
              <div className="h-full flex flex-col items-center justify-center gap-2">
                <Timer className="w-5 h-5 text-indigo-600 animate-pulse" />
                <p className="text-xs text-text-secondary">Executing on {result?.warehouse ?? 'warehouse'}… {runSeconds.toFixed(1)}s</p>
              </div>
            ) : result?.status === 'failed' ? (
              <div className="p-5">
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 space-y-1.5">
                  <div className="flex items-center gap-2 text-red-600 text-xs font-bold">
                    <XCircle className="w-4 h-4" /> {result.error?.code}
                  </div>
                  <p className="text-xs text-text-primary font-mono">{result.error?.message}</p>
                  <p className="text-[11px] text-text-secondary">Line {result.error?.line} — {result.error?.hint}</p>
                </div>
              </div>
            ) : result ? (
              <table className="w-full text-[11px] font-mono">
                <thead className="sticky top-0 bg-card border-b border-border">
                  <tr>
                    <th className="px-2 py-1.5 text-left text-text-muted font-medium w-10">#</th>
                    {result.columns.map((c) => (
                      <th key={c.name} className="px-3 py-1.5 text-left">
                        <span className="text-text-primary font-semibold">{c.name}</span>
                        <span className="text-text-muted ml-1.5">{c.type}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {result.rows.map((row, i) => (
                    <tr key={i} className="hover:bg-card/60">
                      <td className="px-2 py-1.5 text-text-muted">{i + 1}</td>
                      {result.columns.map((c) => (
                        <td key={c.name} className="px-3 py-1.5 text-text-secondary whitespace-nowrap">
                          {row[c.name] === null ? <span className="text-text-muted italic">NULL</span> : String(row[c.name])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center gap-1.5 p-6">
                <Table2 className="w-5 h-5 text-text-muted" />
                <p className="text-xs text-text-secondary">Run a query to see results — press Ctrl+Enter or click Execute.</p>
              </div>
            )}
          </>
        )}

        {/* PLAN */}
        {tab === 'plan' && (
          <div className="p-4 space-y-3">
            {isPlanLoading ? (
              <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-12 rounded-md bg-card-hover animate-pulse" />)}</div>
            ) : plan ? (
              <>
                <div className="flex items-center gap-3 text-[10px] font-mono text-text-secondary">
                  <Badge variant="ai" size="sm">total cost {plan.totalCost}</Badge>
                  <Badge variant="neutral" size="sm">est. {plan.estimatedRuntimeMs} ms</Badge>
                </div>
                {plan.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-600">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    {w}
                  </div>
                ))}
                <PlanTree node={plan.root} />
              </>
            ) : (
              <p className="text-xs text-text-secondary">Plan is generated automatically when you open this tab.</p>
            )}
          </div>
        )}

        {/* LOGS */}
        {tab === 'logs' && (
          <div className="p-3 space-y-1 font-mono">
            {logs.length === 0 ? (
              <p className="text-[11px] text-text-muted p-3">Session log is empty.</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 text-[11px] py-0.5">
                  {log.level === 'info' ? (
                    <Info className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                  ) : log.level === 'warn' ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-red-600 mt-0.5 shrink-0" />
                  )}
                  <span className="text-text-muted shrink-0">{new Date(log.ts).toLocaleTimeString()}</span>
                  <span className={cn(log.level === 'error' ? 'text-red-600' : log.level === 'warn' ? 'text-amber-600' : 'text-text-secondary')}>
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
