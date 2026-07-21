import React, { useState } from 'react';
import { Link } from 'react-router-dom';

type TimeRange = '1H' | '6H' | '24H' | '7D';

interface PipelineHealth {
  id: number;
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  lastRun: string;
  avgDuration: string;
  successRate: number;
  totalRuns: number;
}

interface MetricRun {
  time: string;
  height: number;
  status: 'success' | 'failed' | 'running';
}

interface AlertItem {
  id: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  pipeline: string;
  time: string;
}

// Mock data
const PIPELINE_HEALTH: PipelineHealth[] = [
  { id: 1, name: 'Daily Sales ETL', status: 'healthy', lastRun: '2 min ago', avgDuration: '4.2 min', successRate: 98, totalRuns: 142 },
  { id: 2, name: 'Customer Analytics', status: 'healthy', lastRun: '15 min ago', avgDuration: '2.8 min', successRate: 100, totalRuns: 89 },
  { id: 3, name: 'IoT Stream Pipeline', status: 'critical', lastRun: '1 hour ago', avgDuration: '0.5 min', successRate: 62, totalRuns: 340 },
  { id: 4, name: 'Product Inventory', status: 'warning', lastRun: '3 hours ago', avgDuration: '8.1 min', successRate: 87, totalRuns: 28 },
  { id: 5, name: 'Marketing Attribution', status: 'healthy', lastRun: '30 min ago', avgDuration: '3.5 min', successRate: 95, totalRuns: 56 },
];

const TIMELINE_RUNS: MetricRun[] = [
  { time: '00:00', height: 40, status: 'success' },
  { time: '02:00', height: 60, status: 'success' },
  { time: '04:00', height: 30, status: 'success' },
  { time: '06:00', height: 80, status: 'success' },
  { time: '08:00', height: 65, status: 'success' },
  { time: '10:00', height: 20, status: 'failed' },
  { time: '12:00', height: 75, status: 'success' },
  { time: '14:00', height: 55, status: 'success' },
  { time: '16:00', height: 90, status: 'success' },
  { time: '18:00', height: 45, status: 'failed' },
  { time: '20:00', height: 70, status: 'success' },
  { time: '22:00', height: 85, status: 'running' },
];

const ALERTS: AlertItem[] = [
  { id: 1, severity: 'error', message: 'Pipeline failed after 3 retries. Connection timeout to Kafka broker.', pipeline: 'IoT Stream Pipeline', time: '1 hour ago' },
  { id: 2, severity: 'warning', message: 'Data quality check: 13% of records failed validation (threshold: 10%).', pipeline: 'Product Inventory', time: '3 hours ago' },
  { id: 3, severity: 'error', message: 'IoT Stream: Schema mismatch detected in sensor_readings table.', pipeline: 'IoT Stream Pipeline', time: '4 hours ago' },
  { id: 4, severity: 'info', message: 'Scheduled maintenance window: pipelines will be paused 02:00–03:00 UTC.', pipeline: 'All Pipelines', time: '5 hours ago' },
];

const statusHealthConfig = {
  healthy:  { badge: 'bg-green-100 text-green-700',  dot: 'bg-green-500',  label: 'Healthy' },
  warning:  { badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500', label: 'Warning' },
  critical: { badge: 'bg-red-100 text-red-700',      dot: 'bg-red-500',    label: 'Critical' },
};

const alertConfig = {
  error:   { bg: 'bg-red-50',    border: 'border-red-200',    icon: 'text-red-500',    label: 'bg-red-100 text-red-700' },
  warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'text-yellow-500', label: 'bg-yellow-100 text-yellow-700' },
  info:    { bg: 'bg-blue-50',   border: 'border-blue-200',   icon: 'text-blue-500',   label: 'bg-blue-100 text-blue-700' },
};

const MonitoringPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('24H');
  const [liveRefresh, setLiveRefresh] = useState(true);

  const totalRuns = PIPELINE_HEALTH.reduce((s, p) => s + p.totalRuns, 0);
  const avgSuccess = Math.round(PIPELINE_HEALTH.reduce((s, p) => s + p.successRate, 0) / PIPELINE_HEALTH.length);
  const healthyCount = PIPELINE_HEALTH.filter((p) => p.status === 'healthy').length;
  const criticalCount = PIPELINE_HEALTH.filter((p) => p.status === 'critical' || p.status === 'warning').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Page Header ─────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-purple-600 dark:text-purple-400">Operations</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">Monitoring</h1>
          <p className="mt-1 text-sm text-gray-500">Real-time pipeline health, metrics, and alerts.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Live refresh toggle */}
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

          {/* Time range selector */}
          <div className="flex rounded-xl border border-gray-100 bg-white p-1 shadow-sm">
            {(['1H', '6H', '24H', '7D'] as TimeRange[]).map((r) => (
              <button
                key={r}
                id={`monitoring-range-${r}`}
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
          {
            label: 'Total Runs',
            value: totalRuns.toLocaleString(),
            sub: `Last ${timeRange}`,
            icon: '🔄',
            color: 'from-blue-50 to-white border-blue-100',
            iconBg: 'bg-blue-600',
          },
          {
            label: 'Avg Duration',
            value: '3.9 min',
            sub: 'Across all pipelines',
            icon: '⏱️',
            color: 'from-purple-50 to-white border-purple-100',
            iconBg: 'bg-purple-600',
          },
          {
            label: 'Success Rate',
            value: `${avgSuccess}%`,
            sub: 'Target: 95%',
            icon: '✅',
            color: 'from-green-50 to-white border-green-100',
            iconBg: 'bg-green-600',
          },
          {
            label: 'Data Processed',
            value: '2.4 TB',
            sub: `Last ${timeRange}`,
            icon: '💾',
            color: 'from-yellow-50 to-white border-yellow-100',
            iconBg: 'bg-yellow-500',
          },
        ].map((m) => (
          <div
            key={m.label}
            className={`rounded-2xl border bg-gradient-to-br p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 ${m.color}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{m.label}</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{m.value}</p>
                <p className="mt-1 text-xs text-gray-400">{m.sub}</p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl ${m.iconBg} shadow-sm`}>
                {m.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Execution Timeline ────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Execution Timeline</h2>
            <p className="text-xs text-gray-500">Pipeline run history — last {timeRange}</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-500" />Success</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" />Failed</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500" />Running</span>
          </div>
        </div>

        <div className="mt-6 flex items-end gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
          {TIMELINE_RUNS.map((run) => (
            <div key={run.time} className="flex shrink-0 flex-col items-center gap-1.5">
              <div
                className={`w-8 rounded-t-md transition-all hover:opacity-80 cursor-pointer ${
                  run.status === 'success' ? 'bg-green-400'
                  : run.status === 'failed' ? 'bg-red-400'
                  : 'bg-blue-400'
                }`}
                style={{ height: `${run.height}px` }}
                title={`${run.time} — ${run.status}`}
              />
              <p className="text-[9px] font-medium text-gray-400">{run.time}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Two Column: Health Table + Alerts ─────────── */}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Pipeline Health Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">Pipeline Health</h2>
              <p className="text-xs text-gray-500">
                <span className="text-green-600 font-semibold">{healthyCount} healthy</span>
                {' · '}
                <span className="text-red-600 font-semibold">{criticalCount} need attention</span>
              </p>
            </div>
            <Link to="/pipelines" className="text-xs font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400">
              Manage →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50/70">
                <tr>
                  <th className="table-header">Pipeline</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Last Run</th>
                  <th className="table-header">Success Rate</th>
                  <th className="table-header text-right">Runs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {PIPELINE_HEALTH.map((p) => {
                  const cfg = statusHealthConfig[p.status];
                  return (
                    <tr key={p.id} className="transition-colors hover:bg-gray-50/50">
                      <td className="table-cell">
                        <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.avgDuration} avg</p>
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${cfg.badge} gap-1.5`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="table-cell text-xs text-gray-500">{p.lastRun}</td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className={`h-full rounded-full transition-all ${
                                p.successRate >= 95 ? 'bg-green-500' : p.successRate >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${p.successRate}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-700">{p.successRate}%</span>
                        </div>
                      </td>
                      <td className="table-cell text-right text-sm font-medium text-gray-700">
                        {p.totalRuns.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alerts Panel */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">Alerts & Errors</h2>
              <p className="text-xs text-gray-500">{ALERTS.filter((a) => a.severity === 'error').length} errors, {ALERTS.filter((a) => a.severity === 'warning').length} warnings</p>
            </div>
            <span className="badge badge-error animate-pulse-dot">{ALERTS.filter((a) => a.severity === 'error').length} active</span>
          </div>

          <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
            {ALERTS.map((alert) => {
              const cfg = alertConfig[alert.severity];
              return (
                <div
                  key={alert.id}
                  className={`flex gap-3 border-b border-gray-50 p-4 transition-colors hover:bg-gray-50/50 last:border-b-0`}
                >
                  <div className={`mt-0.5 shrink-0 ${cfg.icon}`}>
                    {alert.severity === 'error' ? (
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    ) : alert.severity === 'warning' ? (
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium text-gray-900 leading-relaxed">{alert.message}</p>
                    </div>
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
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonitoringPage;
