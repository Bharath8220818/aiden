import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import { Activity, Zap, CheckCircle, AlertTriangle, Radio } from 'lucide-react';

type TimeRange = '1H' | '6H' | '24H' | '7D';

interface ExecutionEvent {
  pipeline_id: number;
  execution_id: number;
  status: 'running' | 'success' | 'failed' | 'pending' | 'cancelled' | 'cancelling';
  progress: number;
  stage?: string;
  records_processed?: number;
  duration_seconds?: number;
  error?: string;
  timestamp: string;
}

interface TaskEvent {
  pipeline_id: number;
  execution_id: number;
  stage: string;
  task: string;
  status: string;
  progress: number;
  detail: string;
  timestamp: string;
}

interface PipelineRun {
  pipelineId: number;
  executionId: number;
  name: string;
  source: string;
  destination: string;
  status: string;
  progress: number;
  stage: string;
  records: number;
  duration: number;
  tasks: TaskEvent[];
  startTime: Date;
  completedTime?: Date;
}

const alertConfig: Record<string, { bg: string; border: string; label: string }> = {
  error:   { bg: 'bg-red-50',    border: 'border-red-200',    label: 'bg-red-100 text-red-700' },
  warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', label: 'bg-yellow-100 text-yellow-700' },
  info:    { bg: 'bg-blue-50',   border: 'border-blue-200',   label: 'bg-blue-100 text-blue-700' },
};

const STAGE_LABELS: Record<string, string> = {
  initialize: 'Initialize',
  extract: 'Extract',
  transform: 'Transform',
  load: 'Load',
  finalize: 'Finalize',
};

const MonitoringPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('24H');
  const [liveRefresh, setLiveRefresh] = useState(true);
  const [pipelineRuns, setPipelineRuns] = useState<PipelineRun[]>([]);
  const [alerts, setAlerts] = useState<{ id: number; severity: string; message: string; pipeline: string; time: string }[]>([]);
  const [executionCounts, setExecutionCounts] = useState({ total: 0, succeeded: 0, failed: 0, running: 0 });
  const alertCounterRef = useRef(0);

  // ── WebSocket Connection ──

  const handleWsMessage = useCallback((data: any) => {
    if (!data || !data.type) return;

    if (data.type === 'pipeline_status') {
      const event = data as ExecutionEvent;
      setPipelineRuns((prev) => {
        const idx = prev.findIndex((r) => r.executionId === event.execution_id);
        const updated = [...prev];

        if (idx === -1) {
          // New run
          updated.push({
            pipelineId: event.pipeline_id,
            executionId: event.execution_id,
            name: `Pipeline #${event.pipeline_id}`,
            source: '',
            destination: '',
            status: event.status,
            progress: event.progress,
            stage: event.stage || '',
            records: event.records_processed || 0,
            duration: event.duration_seconds || 0,
            tasks: [],
            startTime: new Date(),
          });
        } else {
          // Update existing
          updated[idx] = {
            ...updated[idx],
            status: event.status,
            progress: event.progress,
            stage: event.stage || '',
            records: event.records_processed || updated[idx].records,
            duration: event.duration_seconds || updated[idx].duration,
            completedTime: event.status === 'success' || event.status === 'failed' || event.status === 'cancelled' ? new Date() : undefined,
          };
        }
        return updated;
      });

      // Update counts
      setExecutionCounts((prev) => {
        if (event.status === 'running') return { ...prev, total: prev.total + 1, running: prev.running + 1 };
        if (event.status === 'success') return { ...prev, succeeded: prev.succeeded + 1, running: Math.max(0, prev.running - 1) };
        if (event.status === 'failed') return { ...prev, failed: prev.failed + 1, running: Math.max(0, prev.running - 1) };
        if (event.status === 'cancelled') return { ...prev, failed: prev.failed + 0, running: Math.max(0, prev.running - 1) };
        return prev;
      });
    }

    if (data.type === 'pipeline_task') {
      const task = data as TaskEvent;
      setPipelineRuns((prev) => {
        const idx = prev.findIndex((r) => r.executionId === task.execution_id);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          tasks: [...updated[idx].tasks, task],
        };
        return updated;
      });
    }

    if (data.type === 'pipeline_failed' || data.type === 'pipeline_error') {
      const errorData = data as any;
      alertCounterRef.current += 1;
      const newAlert = {
        id: alertCounterRef.current,
        severity: 'error' as const,
        message: errorData.error || errorData.payload?.error || 'Pipeline failed',
        pipeline: `${errorData.pipeline_id ? `Pipeline #${errorData.pipeline_id}` : 'Unknown'}`,
        time: new Date().toLocaleTimeString(),
      };
      setAlerts((prev) => [newAlert, ...prev].slice(0, 20));
    }
  }, []);

  const { isConnected } = useWebSocket({
    url: `${import.meta.env.VITE_WS_URL || 'ws://localhost:8000'}/api/v1/ws/monitoring`,
    onMessage: handleWsMessage,
    reconnectInterval: 3000,
    maxReconnectAttempts: 10,
  });

  // Clean up completed runs after a delay
  useEffect(() => {
    if (!liveRefresh) return;
    const interval = setInterval(() => {
      setPipelineRuns((prev) =>
        prev.filter((r) => {
          if (r.status === 'success' || r.status === 'failed' || r.status === 'cancelled') {
            // Keep completed runs visible for 30 seconds
            if (r.completedTime && Date.now() - r.completedTime.getTime() > 30000) {
              return false;
            }
          }
          return true;
        }),
      );
    }, 5000);
    return () => clearInterval(interval);
  }, [liveRefresh]);

  // ── Stats from live data ──
  const stats = {
    totalRuns: executionCounts.total || pipelineRuns.length,
    running: pipelineRuns.filter((r) => r.status === 'running').length,
    success: pipelineRuns.filter((r) => r.status === 'success').length,
    failed: pipelineRuns.filter((r) => r.status === 'failed').length,
    avgDuration: pipelineRuns.filter((r) => r.duration > 0).reduce((s, r) => s + r.duration, 0) / Math.max(1, pipelineRuns.filter((r) => r.duration > 0).length),
    successRate: executionCounts.total > 0 ? (executionCounts.succeeded / executionCounts.total) * 100 : 0,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Page Header ─────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-purple-600 dark:text-purple-400">Operations</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">Monitoring</h1>
          <p className="mt-1 text-sm text-gray-500">
            {isConnected
              ? <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />Live — real-time pipeline execution</span>
              : <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" />Disconnected — reconnect in 3s</span>
            }
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setLiveRefresh(!liveRefresh)}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
              liveRefresh
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-gray-200 bg-white text-gray-600'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${liveRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            {liveRefresh ? 'Live' : 'Paused'}
          </button>

          <div className="flex rounded-xl border border-gray-100 bg-white p-1 shadow-sm">
            {(['1H', '6H', '24H', '7D'] as TimeRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                  timeRange === r
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Metric Cards ─────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total Runs', value: stats.totalRuns.toLocaleString(), sub: `Last ${timeRange}`, icon: <Activity size={16} />, status: 'healthy' as const, sparkline: [5, 8, 12, 10, 14, stats.totalRuns || 11] },
          { label: 'Running Now', value: stats.running.toString(), sub: `${pipelineRuns.length > 0 ? Math.round(stats.avgDuration) : '—'}s avg`, icon: <Zap size={16} />, status: stats.running > 0 ? 'healthy' as const : 'healthy' as const, sparkline: [2, 3, 1, 4, 2, stats.running || 2] },
          { label: 'Success Rate', value: pipelineRuns.length > 0 ? `${Math.round(stats.successRate)}%` : '—', sub: `${stats.success} completed`, icon: <CheckCircle size={16} />, status: 'healthy' as const, sparkline: [90, 92, 95, 94, 96, stats.successRate || 95] },
          { label: 'Failed', value: stats.failed.toString(), sub: `${alerts.length} active alerts`, icon: <AlertTriangle size={16} />, status: stats.failed > 0 ? 'warning' as const : 'healthy' as const, sparkline: [3, 2, 4, 1, 2, stats.failed || 2] },
        ].map((m) => (
          <div key={m.label} className="relative overflow-hidden rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-4 transition-all hover:border-[var(--color-border-hover)]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{m.label}</span>
              <span className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${m.status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span className={`text-[10px] font-medium ${m.status === 'healthy' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>{m.status}</span>
              </span>
            </div>
            <div className="mt-2 flex items-end justify-between">
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-2xl font-bold tracking-tight text-[var(--color-text)]">{m.value}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[var(--color-text-muted)]">{m.icon}</span>
              </div>
            </div>
            <div className="mt-2">
              <span className="text-[11px] text-[var(--color-text-muted)]">{m.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Live Executions ──────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Live Executions</h2>
            <p className="text-xs text-gray-500">
              {pipelineRuns.filter((r) => r.status === 'running').length > 0
                ? `${pipelineRuns.filter((r) => r.status === 'running').length} running`
                : 'No active executions'}
              {' · '}
              {pipelineRuns.length} total in view
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {pipelineRuns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500 dark:text-purple-400">
                <Radio size={20} />
              </div>
              <p className="mt-3 text-sm font-medium text-gray-500">Waiting for pipeline executions...</p>
              <p className="text-xs text-gray-400 mt-1">Run a pipeline from the Pipelines page to see live task-by-task progress here.</p>
              <Link to="/pipelines" className="btn-primary mt-4 text-sm">Go to Pipelines</Link>
            </div>
          ) : (
            pipelineRuns.map((run) => {
              const stageKeys = Object.keys(STAGE_LABELS);
              const currentStageIdx = stageKeys.indexOf(run.stage);

              return (
                <div
                  key={`${run.executionId}`}
                  className={`rounded-xl border p-4 transition-all ${
                    run.status === 'running'
                      ? 'border-purple-200 bg-purple-50/50'
                      : run.status === 'success'
                        ? 'border-green-200 bg-green-50/50'
                        : run.status === 'failed'
                          ? 'border-red-200 bg-red-50/50'
                          : 'border-gray-100 bg-gray-50'
                  }`}
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${
                        run.status === 'running' ? 'text-purple-700' :
                        run.status === 'success' ? 'text-green-700' :
                        run.status === 'failed' ? 'text-red-700' : 'text-gray-600'
                      }`}>
                        {run.name}
                      </span>
                      {run.stage && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-600 shadow-sm">
                          {STAGE_LABELS[run.stage] || run.stage}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      {run.records > 0 && <span>{run.records.toLocaleString()} records</span>}
                      {run.duration > 0 && <span>{run.duration}s</span>}
                      {run.status === 'running' && (
                        <span className="flex items-center gap-1 text-purple-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                          {run.progress}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        run.status === 'failed' ? 'bg-red-500' :
                        run.status === 'success' ? 'bg-green-500' :
                        'bg-gradient-to-r from-purple-500 to-cyan-500'
                      }`}
                      style={{ width: `${Math.max(run.progress, run.status === 'success' ? 100 : run.status === 'failed' ? 100 : 5)}%` }}
                    />
                  </div>

                  {/* Task-level detail */}
                  {run.tasks.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {run.tasks.slice(-8).map((task, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            task.status === 'success' ? 'bg-green-500' :
                            task.status === 'running' ? 'bg-purple-500 animate-pulse' :
                            task.status === 'warning' ? 'bg-yellow-500' :
                            task.status === 'skipped' ? 'bg-gray-400' :
                            'bg-red-500'
                          }`} />
                          <span className="font-medium text-gray-500 w-[80px] shrink-0 truncate">{task.task}</span>
                          <span className="truncate text-gray-400">{task.detail}</span>
                          <span className={`ml-auto text-[10px] ${
                            task.status === 'success' ? 'text-green-600' :
                            task.status === 'running' ? 'text-purple-600' :
                            task.status === 'warning' ? 'text-yellow-600' : 'text-red-600'
                          }`}>{task.status}</span>
                        </div>
                      ))}
                      {run.tasks.length > 8 && (
                        <p className="text-[10px] text-gray-400">+{run.tasks.length - 8} more tasks</p>
                      )}
                    </div>
                  )}

                  {/* Stage step indicators */}
                  <div className="mt-3 flex items-center gap-1">
                    {stageKeys.map((s, i) => {
                      const isActive = run.stage === s;
                      const isDone = currentStageIdx > i || run.status === 'success' || (run.status === 'failed' && currentStageIdx >= i);
                      return (
                        <div key={s} className="flex items-center gap-1 flex-1">
                          <div className={`flex items-center justify-center h-5 text-[9px] font-semibold rounded-full px-2 transition-all ${
                            isDone ? 'bg-green-100 text-green-700' :
                            isActive ? 'bg-purple-100 text-purple-700 animate-pulse' :
                            'bg-gray-100 text-gray-400'
                          }`}>
                            {isDone ? '✓' : isActive ? '▶' : i + 1}
                          </div>
                          {i < stageKeys.length - 1 && (
                            <div className={`h-0.5 flex-1 rounded-full ${isDone ? 'bg-green-300' : 'bg-gray-200'}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Two Column: Pipeline List + Alerts ─────────── */}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Pipeline Health Summary */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">Recent Pipelines</h2>
              <p className="text-xs text-gray-500">
                <span className="text-green-600 font-semibold">{stats.success} completed</span>
                {' · '}
                <span className="text-purple-600 font-semibold">{stats.running} running</span>
                {' · '}
                <span className="text-red-600 font-semibold">{stats.failed} failed</span>
              </p>
            </div>
            <Link to="/pipelines" className="text-xs font-semibold text-purple-600 hover:text-purple-700">
              Manage →
            </Link>
          </div>

          <div className="divide-y divide-gray-50">
            {pipelineRuns.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">No pipeline runs yet</div>
            ) : (
              pipelineRuns.slice(0, 10).map((run) => (
                <div key={run.executionId} className="px-5 py-3.5 transition-colors hover:bg-gray-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        run.status === 'running' ? 'bg-purple-500' :
                        run.status === 'success' ? 'bg-green-500' :
                        'bg-red-500'
                      }`} />
                      <span className="text-sm font-semibold text-gray-900">{run.name}</span>
                      <span className="text-xs text-gray-400">#{run.pipelineId}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{run.progress}%</span>
                      {run.duration > 0 && <span>{run.duration}s</span>}
                      {run.records > 0 && <span>{run.records.toLocaleString()} rec</span>}
                    </div>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-gray-100">
                    <div className={`h-full rounded-full ${
                      run.status === 'success' ? 'bg-green-400' :
                      run.status === 'failed' ? 'bg-red-400' : 'bg-purple-400'
                    }`} style={{ width: `${run.progress}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Alerts Panel */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">Alerts</h2>
              <p className="text-xs text-gray-500">{alerts.filter((a) => a.severity === 'error').length} errors</p>
            </div>
            <span className={`badge ${alerts.filter((a) => a.severity === 'error').length > 0 ? 'badge-error' : 'badge-gray'} animate-pulse-dot`}>
              {alerts.filter((a) => a.severity === 'error').length} active
            </span>
          </div>

          <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
            {alerts.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-gray-400">No alerts yet</p>
                <p className="text-xs text-gray-300 mt-1">Alerts appear when a pipeline fails.</p>
              </div>
            ) : (
              alerts.map((alert) => {
                const cfg = alertConfig[alert.severity] || alertConfig.info;
                return (
                  <div key={alert.id} className={`flex gap-3 border-b border-gray-50 p-4 transition-colors hover:bg-gray-50/50 last:border-b-0`}>
                    <div className={`mt-0.5 shrink-0 ${alert.severity === 'error' ? 'text-red-500' : alert.severity === 'warning' ? 'text-yellow-500' : 'text-blue-500'}`}>
                      {alert.severity === 'error' ? (
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 leading-relaxed">{alert.message}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${cfg.label}`}>
                          {alert.severity}
                        </span>
                        <span className="text-[10px] text-gray-400">{alert.pipeline}</span>
                        <span className="ml-auto text-[10px] text-gray-400">{alert.time}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonitoringPage;
