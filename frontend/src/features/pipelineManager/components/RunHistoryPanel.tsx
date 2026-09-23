import React, { useState } from 'react';
import { PipelineDetail, PipelineRun, RunTask, LogLevel } from '../types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { usePermission } from '@/features/auth/hooks/useAuth';
import { cn } from '@/lib/utils';
import { History, ListTree, ScrollText, RotateCcw, Play, CheckCircle2, XCircle, Loader2, Circle, SkipForward, Clock } from 'lucide-react';

export interface RunHistoryPanelProps {
  detail: PipelineDetail | null;
  isLoading: boolean;
  isRefetching: boolean;
  onRetry: () => void;
  onTrigger: () => void;
  actionPending: boolean;
}

const RUN_ICON: Record<string, JSX.Element> = {
  success: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
  running: <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />,
  failed: <XCircle className="w-3.5 h-3.5 text-red-600" />,
  queued: <Circle className="w-3.5 h-3.5 text-text-muted" />,
  skipped: <SkipForward className="w-3.5 h-3.5 text-text-muted" />,
};

const TASK_STATUS_COLOR: Record<RunTask['status'], string> = {
  success: 'border-emerald-500/60 bg-emerald-500/15 text-emerald-600',
  running: 'border-indigo-500/60 bg-indigo-500/15 text-indigo-600 animate-pulse',
  failed: 'border-red-500/60 bg-red-500/15 text-red-600',
  queued: 'border-border-highlight bg-card-hover text-text-muted',
  skipped: 'border-border-highlight bg-card text-text-muted opacity-60',
  up_for_retry: 'border-amber-500/60 bg-amber-500/15 text-amber-600',
};

const LOG_COLOR: Record<LogLevel, string> = {
  info: 'text-text-secondary',
  debug: 'text-text-muted',
  warn: 'text-amber-600',
  error: 'text-red-600',
};

export const RunHistoryPanel: React.FC<RunHistoryPanelProps> = ({
  detail,
  isLoading,
  isRefetching,
  onRetry,
  onTrigger,
  actionPending,
}) => {
  const [tab, setTab] = useState<'runs' | 'tasks' | 'logs'>('runs');
  const [selectedRun, setSelectedRun] = useState<PipelineRun | null>(null);
  const canControl = usePermission('pipelines.control');

  if (isLoading || !detail) {
    return (
      <div className="p-4 space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    );
  }

  const { pipeline, runs, latestTasks, logs } = detail;
  const activeRun = selectedRun ?? runs[0];
  const tasks = selectedRun ? latestTasks : latestTasks;

  const tabs = [
    { id: 'runs' as const, label: 'Runs', icon: <History className="w-3.5 h-3.5" />, count: runs.length },
    { id: 'tasks' as const, label: 'Tasks', icon: <ListTree className="w-3.5 h-3.5" /> },
    { id: 'logs' as const, label: 'Logs', icon: <ScrollText className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-bold font-mono text-text-primary truncate">{pipeline.name}</h2>
            <p className="text-[11px] text-text-secondary mt-0.5">{pipeline.description}</p>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {pipeline.tags.map((t) => (
                <Badge key={t} variant="neutral" size="sm">#{t}</Badge>
              ))}
              <Badge variant="info" size="sm">owner: {pipeline.owner}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {canControl && (
              <>
            <Button variant="secondary" size="sm" onClick={onRetry} isLoading={actionPending} leftIcon={<RotateCcw className="w-3.5 h-3.5" />} className="text-xs">
              Retry
            </Button>
            <Button variant="primary" size="sm" onClick={onTrigger} isLoading={actionPending} leftIcon={<Play className="w-3.5 h-3.5" />} className="text-xs">
              Trigger
            </Button>
              </>
            )}
          </div>
        </div>

        {/* Pipeline stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
          {[
            { label: 'Success 24h', value: `${pipeline.stats.successRate24h}%` },
            { label: 'Avg duration', value: `${pipeline.stats.avgDurationMin} min` },
            { label: 'Runs today', value: String(pipeline.stats.runsToday) },
            { label: 'Rows 24h', value: pipeline.stats.rowsProcessed24h.toLocaleString() },
          ].map((s) => (
            <div key={s.label} className="p-2 rounded-md bg-card border border-border-subtle">
              <div className="text-xs font-bold text-text-primary font-mono">{s.value}</div>
              <div className="text-[9px] uppercase text-text-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center px-3 border-b border-border shrink-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold border-b-2 transition-colors',
              tab === t.id ? 'text-text-primary border-indigo-500' : 'text-text-muted border-transparent hover:text-text-secondary'
            )}
          >
            {t.icon}
            {t.label}
            {t.count !== undefined && (
              <span className="px-1.5 py-0.5 text-[9px] rounded-full bg-card-active text-text-secondary font-mono">{t.count}</span>
            )}
            {tab === 'runs' && isRefetching && t.id === 'runs' && (
              <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
            )}
          </button>
        ))}
      </div>

      {/* Panels */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* RUNS */}
        {tab === 'runs' && (
          <div className="space-y-1">
            {runs.map((run) => (
              <button
                key={run.id}
                onClick={() => {
                  setSelectedRun(run);
                  setTab('tasks');
                }}
                className={cn(
                  'w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all',
                  activeRun?.id === run.id && tab !== 'runs'
                    ? 'bg-indigo-500/10 border-indigo-500/30'
                    : 'bg-card border-border hover:border-border-highlight'
                )}
              >
                {RUN_ICON[run.status]}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-semibold text-text-primary">#{run.id.split('-').pop()}</span>
                    <Badge variant="neutral" size="sm">{run.trigger}</Badge>
                    {run.attempt > 1 && <Badge variant="warning" size="sm">attempt {run.attempt}</Badge>}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-text-muted font-mono mt-0.5">
                    <Clock className="w-3 h-3" />
                    {new Date(run.startedAt).toLocaleTimeString()}
                    {run.durationMin !== null && <span>• {run.durationMin} min</span>}
                    <span>• {run.rowsProcessed.toLocaleString()} rows</span>
                    <span className="hidden sm:inline">• ${run.costUsd.toFixed(2)}</span>
                  </div>
                </div>
                <span className="text-[9px] font-mono text-text-muted hidden lg:block">{run.warehouse}</span>
              </button>
            ))}
          </div>
        )}

        {/* TASKS */}
        {tab === 'tasks' && (
          <div className="space-y-2">
            <p className="text-[10px] text-text-muted font-mono">Task graph for run #{activeRun?.id.split('-').pop()} ({activeRun?.status})</p>
            {tasks.map((task, idx) => (
              <div key={task.id} className="flex items-center gap-3">
                <span className="text-[9px] text-text-muted font-mono w-4 text-right">{idx + 1}</span>
                <div className={cn('flex-1 p-2.5 rounded-lg border', TASK_STATUS_COLOR[task.status])}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono font-semibold">{task.name}</span>
                    <span className="text-[9px] uppercase font-bold tracking-wide opacity-80">{task.status}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] opacity-70 mt-0.5 font-mono">
                    <span>{task.taskType.replace('_', ' ')}</span>
                    {task.durationSec !== null && <span>• {task.durationSec}s</span>}
                    {task.retryCount > 0 && <span>• {task.retryCount} retries</span>}
                  </div>
                  {task.error && (
                    <p className="text-[10px] text-red-200 mt-1 font-mono bg-red-500/10 border border-red-500/30 rounded px-2 py-1">
                      {task.error.type}: {task.error.message}
                    </p>
                  )}
                </div>
                {idx < tasks.length - 1 && <span className="text-text-muted text-[10px]">↓</span>}
              </div>
            ))}
          </div>
        )}

        {/* LOGS */}
        {tab === 'logs' && (
          <div className="space-y-0.5 font-mono">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 text-[10px] py-0.5">
                <span className="text-text-muted shrink-0">{new Date(log.ts).toLocaleTimeString()}</span>
                <span className={cn('shrink-0 w-24 truncate', LOG_COLOR[log.level])}>[{log.task}]</span>
                <span className={LOG_COLOR[log.level]}>{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
