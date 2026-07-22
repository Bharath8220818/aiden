import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { usePipelineStore } from '../store/pipelineStore';
import { useNotificationStore } from '../store/notificationStore';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  Play,
  Edit,
  Trash2,
  ChevronLeft,
  Activity,
  Clock,
  CheckCircle2,
  Database,
  ArrowRight,
  RefreshCw,
  Copy,
  Terminal,
  Layers,
  Settings,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type TabType = 'overview' | 'history' | 'logs' | 'dag' | 'config';

const STATUS_META: Record<string, { label: string; badge: string; dot: string }> = {
  draft:   { label: 'Draft',   badge: 'badge-gray',    dot: 'bg-gray-400' },
  pending: { label: 'Pending', badge: 'badge-warning',  dot: 'bg-yellow-500' },
  running: { label: 'Running', badge: 'badge-info',     dot: 'bg-blue-500' },
  success: { label: 'Success', badge: 'badge-success',  dot: 'bg-green-500' },
  failed:  { label: 'Failed',  badge: 'badge-error',    dot: 'bg-red-500' },
  paused:  { label: 'Paused',  badge: 'badge-gray',     dot: 'bg-gray-400' },
};

const PipelineDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentPipeline, fetchPipeline, runPipeline, deletePipeline, isLoading } = usePipelineStore();
  const { addNotification } = useNotificationStore();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isRunning, setIsRunning] = useState(false);
  const [copiedLogs, setCopiedLogs] = useState(false);

  useEffect(() => {
    if (id) {
      fetchPipeline(Number(id));
    }
  }, [id, fetchPipeline]);

  const handleRun = async () => {
    if (!currentPipeline) return;
    setIsRunning(true);
    try {
      await runPipeline(currentPipeline.id);
      addNotification({ type: 'success', message: `Pipeline "${currentPipeline.name}" triggered!` });
    } catch (err: any) {
      addNotification({ type: 'error', message: 'Failed to run pipeline.' });
    } finally {
      setIsRunning(false);
    }
  };

  const handleDelete = async () => {
    if (!currentPipeline) return;
    if (confirm(`Are you sure you want to delete "${currentPipeline.name}"?`)) {
      await deletePipeline(currentPipeline.id);
      addNotification({ type: 'info', message: 'Pipeline deleted.' });
      navigate('/pipelines');
    }
  };

  if (isLoading && !currentPipeline) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!currentPipeline) {
    return (
      <div className="card my-8 p-8 text-center">
        <div className="text-4xl mb-3">🔍</div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Pipeline Not Found</h2>
        <p className="mt-1 text-sm text-gray-500">The pipeline you are looking for does not exist or was deleted.</p>
        <Link to="/pipelines" className="btn-primary mt-4 inline-flex items-center gap-2">
          <ChevronLeft className="h-4 w-4" />
          Back to Pipelines
        </Link>
      </div>
    );
  }

  const meta = STATUS_META[currentPipeline.status || 'draft'] || STATUS_META.draft;

  // Mock execution history
  const executions = [
    { id: 'exec-101', status: 'success', duration: '2m 14s', records: '14,250', triggeredBy: 'Schedule (Cron)', timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
    { id: 'exec-100', status: 'success', duration: '2m 08s', records: '14,180', triggeredBy: 'Schedule (Cron)', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
    { id: 'exec-099', status: 'failed', duration: '0m 45s', records: '1,200', triggeredBy: 'Manual Run', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString() },
    { id: 'exec-098', status: 'success', duration: '2m 21s', records: '13,990', triggeredBy: 'Schedule (Cron)', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString() },
  ];

  // Mock logs output
  const sampleLogs = [
    `[INFO] ${new Date().toISOString()} - Initializing pipeline execution context for ID #${currentPipeline.id}`,
    `[INFO] ${new Date().toISOString()} - Connecting to source: ${currentPipeline.source_type || 'PostgreSQL'}`,
    `[INFO] ${new Date().toISOString()} - Successfully connected. Extracting schema definitions...`,
    `[INFO] ${new Date().toISOString()} - Extracted 14,250 records from source tables.`,
    `[INFO] ${new Date().toISOString()} - Applying transformation: Customer deduplication & currency normalization`,
    `[INFO] ${new Date().toISOString()} - Connecting to destination: ${currentPipeline.destination_type || 'Snowflake'}`,
    `[INFO] ${new Date().toISOString()} - Batch inserting records into target table...`,
    `[SUCCESS] ${new Date().toISOString()} - Execution completed in 2m 14s. 14,250 records processed. 0 errors.`,
  ];

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(sampleLogs.join('\n'));
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ── Breadcrumb & Top Bar ────────────────────────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
            <Link to="/pipelines" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Pipelines
            </Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-gray-200 font-medium">#{currentPipeline.id}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl tracking-tight">
              {currentPipeline.name}
            </h1>
            <span className={`badge ${meta.badge} gap-1.5`}>
              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
              {meta.label}
            </span>
          </div>
          {currentPipeline.description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
              {currentPipeline.description}
            </p>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="btn-primary px-4 py-2 text-sm flex items-center gap-2"
          >
            {isRunning ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4 fill-current" />
            )}
            <span>Run Now</span>
          </button>
          <Link
            to={`/builder?pipelineId=${currentPipeline.id}`}
            className="btn-secondary px-3.5 py-2 text-sm flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            <span>Edit in Builder</span>
          </Link>
          <button
            onClick={handleDelete}
            className="btn-icon h-9 w-9 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-all dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-400"
            title="Delete Pipeline"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Key Specs Banner ────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
        <div className="card p-4 dark:bg-gray-800 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Data Route</p>
          <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-gray-900 dark:text-white truncate">
            <span className="truncate">{currentPipeline.source_type || 'PostgreSQL'}</span>
            <ArrowRight className="h-3 w-3 shrink-0 text-blue-500" />
            <span className="truncate">{currentPipeline.destination_type || 'Snowflake'}</span>
          </div>
        </div>

        <div className="card p-4 dark:bg-gray-800 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Schedule</p>
          <p className="mt-1 text-xs font-semibold text-gray-900 dark:text-white truncate">
            {currentPipeline.schedule || 'Every 24 Hours'}
          </p>
        </div>

        <div className="card p-4 dark:bg-gray-800 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Last Execution</p>
          <p className="mt-1 text-xs font-semibold text-gray-900 dark:text-white truncate">
            {currentPipeline.last_run_at
              ? formatDistanceToNow(new Date(currentPipeline.last_run_at), { addSuffix: true })
              : '15 minutes ago'}
          </p>
        </div>

        <div className="card p-4 dark:bg-gray-800 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Success Rate</p>
          <p className="mt-1 text-xs font-semibold text-green-600 dark:text-green-400">
            98.5% (142 runs)
          </p>
        </div>
      </div>

      {/* ── Tabs Navigation ────────────────────────────── */}
      <div className="flex overflow-x-auto gap-1 border-b border-gray-200 dark:border-gray-700 pb-px scrollbar-none">
        {[
          { id: 'overview', label: 'Overview', icon: Activity },
          { id: 'history', label: 'Execution History', icon: Clock },
          { id: 'logs', label: 'Logs', icon: Terminal },
          { id: 'dag', label: 'DAG Topology', icon: Layers },
          { id: 'config', label: 'Configuration', icon: Settings },
        ].map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as TabType)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all whitespace-nowrap border-b-2 ${
                active
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-semibold'
                  : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ────────────────────────────── */}

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card p-6 dark:bg-gray-800 dark:border-gray-700 space-y-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Pipeline Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-gray-400">Created At</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {currentPipeline.created_at
                      ? new Date(currentPipeline.created_at).toLocaleDateString()
                      : 'Today'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-gray-400">Average Duration</span>
                  <span className="font-semibold text-gray-900 dark:text-white">2 min 12 sec</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-gray-400">Total Rows Processed</span>
                  <span className="font-semibold text-gray-900 dark:text-white">1,420,890 rows</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500 dark:text-gray-400">Retry Policy</span>
                  <span className="font-semibold text-gray-900 dark:text-white">3 retries (Exponential backoff)</span>
                </div>
              </div>
            </div>

            <div className="card p-6 dark:bg-gray-800 dark:border-gray-700 space-y-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Latest Execution</h3>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-green-900 dark:text-green-300">Last run succeeded</p>
                  <p className="text-xs text-green-700 dark:text-green-400">14,250 records ingested without errors</p>
                </div>
              </div>
              <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
                <p><strong className="text-gray-700 dark:text-gray-300">Run ID:</strong> exec-101</p>
                <p><strong className="text-gray-700 dark:text-gray-300">Duration:</strong> 2m 14s</p>
                <p><strong className="text-gray-700 dark:text-gray-300">Trigger:</strong> Automated schedule</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="card p-0 overflow-hidden dark:bg-gray-800 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="table-header">Execution ID</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Duration</th>
                  <th className="table-header">Records</th>
                  <th className="table-header">Triggered By</th>
                  <th className="table-header">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                {executions.map((exec) => (
                  <tr key={exec.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="table-cell font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                      {exec.id}
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${exec.status === 'success' ? 'badge-success' : 'badge-error'}`}>
                        {exec.status}
                      </span>
                    </td>
                    <td className="table-cell text-xs text-gray-600 dark:text-gray-300">{exec.duration}</td>
                    <td className="table-cell text-xs font-semibold text-gray-900 dark:text-white">{exec.records}</td>
                    <td className="table-cell text-xs text-gray-500 dark:text-gray-400">{exec.triggeredBy}</td>
                    <td className="table-cell text-xs text-gray-400">
                      {formatDistanceToNow(new Date(exec.timestamp), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. LOGS TAB */}
      {activeTab === 'logs' && (
        <div className="card p-4 dark:bg-gray-900 dark:border-gray-800 bg-slate-950 text-slate-100 rounded-2xl">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <Terminal className="h-4 w-4 text-green-400" />
              <span>Live Console Log — ID #exec-101</span>
            </div>
            <button
              onClick={handleCopyLogs}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition"
            >
              <Copy className="h-3.5 w-3.5" />
              {copiedLogs ? 'Copied!' : 'Copy Logs'}
            </button>
          </div>
          <div className="font-mono text-xs space-y-1.5 overflow-x-auto max-h-[400px] p-2 leading-relaxed">
            {sampleLogs.map((log, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <span className="text-slate-600 select-none w-6 text-right shrink-0">{idx + 1}</span>
                <span className={log.includes('[SUCCESS]') ? 'text-green-400 font-semibold' : 'text-slate-300'}>
                  {log}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. DAG TAB */}
      {activeTab === 'dag' && (
        <div className="card p-6 dark:bg-gray-800 dark:border-gray-700 flex flex-col items-center justify-center min-h-[300px]">
          <div className="flex flex-wrap items-center justify-center gap-4 py-8">
            <div className="flex flex-col items-center rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 p-4 shadow-sm min-w-[140px]">
              <Database className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-2" />
              <span className="text-xs font-bold text-gray-900 dark:text-white">Source</span>
              <span className="text-[11px] text-gray-500">{currentPipeline.source_type || 'PostgreSQL'}</span>
            </div>

            <ArrowRight className="h-6 w-6 text-gray-400 shrink-0" />

            <div className="flex flex-col items-center rounded-2xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/40 p-4 shadow-sm min-w-[140px]">
              <Layers className="h-8 w-8 text-indigo-600 dark:text-indigo-400 mb-2" />
              <span className="text-xs font-bold text-gray-900 dark:text-white">Transform</span>
              <span className="text-[11px] text-gray-500">dbt / Aggregation</span>
            </div>

            <ArrowRight className="h-6 w-6 text-gray-400 shrink-0" />

            <div className="flex flex-col items-center rounded-2xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/40 p-4 shadow-sm min-w-[140px]">
              <Database className="h-8 w-8 text-green-600 dark:text-green-400 mb-2" />
              <span className="text-xs font-bold text-gray-900 dark:text-white">Destination</span>
              <span className="text-[11px] text-gray-500">{currentPipeline.destination_type || 'Snowflake'}</span>
            </div>
          </div>
        </div>
      )}

      {/* 5. CONFIG TAB */}
      {activeTab === 'config' && (
        <div className="card p-6 dark:bg-gray-800 dark:border-gray-700 space-y-4">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Pipeline Definition</h3>
          <pre className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4 text-xs font-mono text-gray-800 dark:text-gray-200 overflow-x-auto">
            {JSON.stringify(currentPipeline, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default PipelineDetailsPage;

