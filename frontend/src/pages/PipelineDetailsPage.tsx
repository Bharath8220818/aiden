import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { usePipelineStore } from '../store/pipelineStore';
import { useNotificationStore } from '../store/notificationStore';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { BadgeAlert, BadgeCheck, BadgeInfo, BadgeX, Clock, Play, RotateCw, Eye, ArrowLeft, Zap, Database, Calendar, BarChart3, GitBranch } from 'lucide-react';

const STATUS_META: Record<string, { label: string; badge: string; dot: string; icon: React.ReactNode }> = {
  draft:   { label: 'Draft',   badge: 'badge-gray',    dot: 'bg-gray-400',    icon: <BadgeInfo size={12} /> },
  pending: { label: 'Pending', badge: 'badge-warning',  dot: 'bg-yellow-500',  icon: <Clock size={12} /> },
  running: { label: 'Running', badge: 'badge-info',     dot: 'bg-purple-500',  icon: <RotateCw size={12} className="animate-spin" /> },
  success: { label: 'Success', badge: 'badge-success',  dot: 'bg-green-500',   icon: <BadgeCheck size={12} /> },
  failed:  { label: 'Failed',  badge: 'badge-error',    dot: 'bg-red-500',     icon: <BadgeX size={12} /> },
  paused:  { label: 'Paused',  badge: 'badge-gray',     dot: 'bg-gray-400',    icon: <BadgeAlert size={12} /> },
};

const PipelineDetailsPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentPipeline, executions, isLoading, fetchPipeline, fetchExecutions, runPipeline } = usePipelineStore();
  const { addNotification } = useNotificationStore();
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'code' | 'executions'>('overview');

  const pipelineId = Number(id);

  const loadData = useCallback(() => {
    if (id) {
      fetchPipeline(pipelineId);
      fetchExecutions(pipelineId);
    }
  }, [id, pipelineId, fetchPipeline, fetchExecutions]);

  useEffect(() => { loadData(); }, [loadData]);

  // Poll for updates while running
  useEffect(() => {
    if (!currentPipeline || currentPipeline.status !== 'running' && currentPipeline.status !== 'pending') return;
    const interval = setInterval(() => {
      fetchPipeline(pipelineId);
      fetchExecutions(pipelineId);
    }, 2000);
    return () => clearInterval(interval);
  }, [currentPipeline?.status, pipelineId, fetchPipeline, fetchExecutions]);

  const handleRun = async () => {
    if (!currentPipeline) return;
    setIsRunning(true);
    try {
      await runPipeline(pipelineId);
      addNotification({ type: 'success', message: `Pipeline "${currentPipeline.name}" started!` });
      setTimeout(() => {
        fetchPipeline(pipelineId);
        fetchExecutions(pipelineId);
      }, 1000);
    } catch (error: any) {
      addNotification({
        type: 'error',
        message: error.response?.data?.detail || error.message || 'Failed to run pipeline',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleReuse = (execution: any) => {
    if (!currentPipeline) return;
    navigate('/builder', {
      state: {
        reusedPipeline: {
          name: currentPipeline.name,
          source_type: currentPipeline.source_type,
          destination_type: currentPipeline.destination_type,
          schedule: currentPipeline.schedule,
          config: currentPipeline.config,
          description: currentPipeline.description,
          executionId: execution.id,
        },
      },
    });
  };

  if (isLoading && !currentPipeline) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!currentPipeline) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-4xl mb-4">🔍</div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Pipeline not found</h2>
        <p className="text-sm text-gray-500 mt-1">The pipeline you're looking for doesn't exist.</p>
        <Link to="/pipelines" className="btn-primary mt-4">Back to Pipelines</Link>
      </div>
    );
  }

  const p = currentPipeline;
  const statusMeta = STATUS_META[p.status] || STATUS_META.draft;
  const latestExecution = executions[0];
  const isActiveRun = p.status === 'running' || p.status === 'pending';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Back Link ── */}
      <Link
        to="/pipelines"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Pipelines
      </Link>

      {/* ── Pipeline Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
              {p.name}
            </h1>
            <span className={`inline-flex items-center gap-1.5 ${statusMeta.badge}`}>
              {statusMeta.icon}
              {statusMeta.label}
            </span>
          </div>

          {p.description && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
              {p.description}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <Database size={14} />
              <span className="font-medium text-gray-700 dark:text-gray-300">{p.source_type || 'N/A'}</span>
              <span>→</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">{p.destination_type || 'N/A'}</span>
            </span>
            {p.schedule && (
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />
                {p.schedule}
              </span>
            )}
            {p.last_run_at && (
              <span className="flex items-center gap-1.5">
                <Clock size={14} />
                Last run: {new Date(p.last_run_at).toLocaleString()}
              </span>
            )}
            {latestExecution?.duration_seconds && (
              <span className="flex items-center gap-1.5">
                <BarChart3 size={14} />
                Latest: {latestExecution.duration_seconds}s
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleReuse(executions[0] || {})}
            disabled={!executions.length}
            className="inline-flex items-center gap-2 rounded-xl border border-purple-200 px-4 py-3 text-sm font-semibold text-purple-700 shadow-sm transition-all hover:bg-purple-50 hover:shadow-md active:scale-[0.98] dark:border-purple-800 dark:text-purple-300 dark:hover:bg-purple-950/30 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Open this pipeline's config in the Builder to modify or branch"
          >
            <GitBranch size={16} />
            Reuse
          </button>
          <button
            onClick={handleRun}
            disabled={isRunning || isActiveRun}
            className={`inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold shadow-sm transition-all ${
              isActiveRun
                ? 'bg-amber-100 text-amber-700 cursor-not-allowed dark:bg-amber-950/30 dark:text-amber-400'
                : 'bg-purple-600 text-white hover:bg-purple-700 hover:shadow-md active:scale-[0.98]'
            }`}
          >
            {isActiveRun ? (
              <>
                <RotateCw size={16} className="animate-spin" />
                Running...
              </>
            ) : isRunning ? (
              <>
                <RotateCw size={16} className="animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play size={16} />
                Run Pipeline
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Progress Bar (when running) ── */}
      {isActiveRun && latestExecution && (
        <div className="rounded-2xl border border-purple-100 bg-purple-50 p-4 dark:border-purple-900/30 dark:bg-purple-950/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <RotateCw size={16} className="animate-spin text-purple-600" />
              <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">Pipeline Running</span>
            </div>
            <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
              {latestExecution.records_processed ? `${latestExecution.records_processed.toLocaleString()} records` : 'Processing...'}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-purple-200 dark:bg-purple-900/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all duration-500"
              style={{ width: `${Math.min((executions.length > 0 ? 1 : 0) * 100, 95)}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 border-b border-gray-100 dark:border-gray-800">
        {(['overview', 'executions', 'code'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px capitalize ${
              activeTab === tab
                ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Tab: Overview ── */}
      {activeTab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card dark:bg-gray-900/60">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Configuration</h2>
            <div className="space-y-3">
              <DetailRow label="Source" value={p.source_type || 'N/A'} />
              <DetailRow label="Destination" value={p.destination_type || 'N/A'} />
              <DetailRow label="Schedule" value={p.schedule || 'Manual only'} />
              <DetailRow label="Status" value={p.status || 'draft'} />
              <DetailRow label="Created" value={p.created_at ? new Date(p.created_at).toLocaleString() : 'N/A'} />
              {p.updated_at && <DetailRow label="Updated" value={new Date(p.updated_at).toLocaleString()} />}
              {p.last_run_at && <DetailRow label="Last Run" value={new Date(p.last_run_at).toLocaleString()} />}
            </div>

            {p.tests && Array.isArray(p.tests) && p.tests.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Data Quality Tests</h3>
                <div className="space-y-1">
                  {p.tests.map((test: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                      {typeof test === 'string' ? test : (test.name || test.description || test.type || JSON.stringify(test))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="card dark:bg-gray-900/60">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Transformations</h2>
            {p.config?.transformations && p.config.transformations.length > 0 ? (
              <div className="space-y-2">
                {p.config.transformations.map((t: string, i: number) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
                      <Zap size={14} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                        {t.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-gray-500">Step {i + 1}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 p-8 text-center dark:border-gray-700">
                <Zap size={24} className="text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No transformations configured</p>
                <p className="text-xs text-gray-400 mt-1">Data will pass through without modification.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Executions ── */}
      {activeTab === 'executions' && (
        <div className="card p-0 dark:bg-gray-900/60">
          {executions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="text-4xl mb-3">🕐</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No executions yet</h3>
              <p className="text-sm text-gray-500 mt-1">Run this pipeline to see execution history.</p>
              <button onClick={handleRun} disabled={isRunning || isActiveRun} className="btn-primary mt-4">
                Run Pipeline
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50/70 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Started</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Duration</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Records</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Trigger</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Error</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {executions.map((exec) => {
                    const execStatus = STATUS_META[exec.status] || STATUS_META.draft;
                    return (
                      <tr key={exec.id} className="transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 ${execStatus.badge}`}>
                            {execStatus.icon}
                            {execStatus.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {exec.started_at ? new Date(exec.started_at).toLocaleString() : '-'}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-500">
                          {exec.duration_seconds ? `${exec.duration_seconds}s` : '-'}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">
                          {exec.records_processed ? exec.records_processed.toLocaleString() : '-'}
                        </td>
                        <td className="px-5 py-4 text-xs text-gray-500 capitalize">{exec.triggered_by || 'manual'}</td>
                        <td className="px-5 py-4 text-xs text-red-500 max-w-[150px] truncate">
                          {exec.error_message || '-'}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1">
                            <button
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                              title="View logs"
                              onClick={() => {
                                if (exec.logs) {
                                  const logsText = Array.isArray(exec.logs)
                                    ? exec.logs.slice(0, 3).join(' | ')
                                    : Object.keys(exec.logs).slice(0, 3).join(' | ');
                                  if (logsText) {
                                    addNotification({ type: 'info', message: logsText });
                                  }
                                }
                              }}
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-950/30"
                              title="Reuse this pipeline config in the Builder"
                              onClick={() => handleReuse(exec)}
                            >
                              <GitBranch size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Code ── */}
      {activeTab === 'code' && (
        <div className="space-y-6">
          {p.code ? (
            <div className="card dark:bg-gray-900/60">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-900 dark:text-white">Airflow DAG</h2>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(p.code || '');
                    addNotification({ type: 'success', message: 'DAG copied to clipboard!' });
                  }}
                  className="text-xs font-medium text-purple-600 hover:text-purple-700"
                >
                  Copy DAG
                </button>
              </div>
              <pre className="overflow-x-auto rounded-xl bg-gray-950 p-4 text-xs leading-relaxed text-gray-100">
                <code>{p.code}</code>
              </pre>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 p-12 text-center dark:border-gray-700">
              <div className="text-4xl mb-3">📝</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No code generated</h3>
              <p className="text-sm text-gray-500 mt-1">Code will be generated when the pipeline is run.</p>
            </div>
          )}

          {p.dbt_code && (
            <div className="card dark:bg-gray-900/60">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-900 dark:text-white">dbt Model</h2>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(p.dbt_code || '');
                    addNotification({ type: 'success', message: 'dbt model copied!' });
                  }}
                  className="text-xs font-medium text-purple-600 hover:text-purple-700"
                >
                  Copy
                </button>
              </div>
              <pre className="overflow-x-auto rounded-xl bg-gray-950 p-4 text-xs leading-relaxed text-gray-100">
                <code>{p.dbt_code}</code>
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between py-1.5">
    <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
    <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">{value}</span>
  </div>
);

export default PipelineDetailsPage;
