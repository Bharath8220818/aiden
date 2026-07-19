import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { usePipelineStore } from '../store/pipelineStore';
import { useNotificationStore } from '../store/notificationStore';

// ─── Stat Card ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: string; up: boolean };
  variant: 'blue' | 'green' | 'red' | 'purple';
}

const variantStyles = {
  blue: {
    card: 'border-blue-100 bg-gradient-to-br from-blue-50 to-white',
    icon: 'bg-blue-600 shadow-blue-500/30',
    trend: { up: 'text-blue-600 bg-blue-50', down: 'text-red-500 bg-red-50' },
  },
  green: {
    card: 'border-green-100 bg-gradient-to-br from-green-50 to-white',
    icon: 'bg-green-600 shadow-green-500/30',
    trend: { up: 'text-green-600 bg-green-50', down: 'text-red-500 bg-red-50' },
  },
  red: {
    card: 'border-red-100 bg-gradient-to-br from-red-50 to-white',
    icon: 'bg-red-500 shadow-red-400/30',
    trend: { up: 'text-green-600 bg-green-50', down: 'text-red-500 bg-red-50' },
  },
  purple: {
    card: 'border-purple-100 bg-gradient-to-br from-purple-50 to-white',
    icon: 'bg-purple-600 shadow-purple-500/30',
    trend: { up: 'text-purple-600 bg-purple-50', down: 'text-red-500 bg-red-50' },
  },
};

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, variant }) => {
  const styles = variantStyles[variant];
  return (
    <div className={`rounded-2xl border p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${styles.card}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {trend && (
            <span className={`mt-2 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${trend.up ? styles.trend.up : styles.trend.down}`}>
              {trend.up ? '↑' : '↓'} {trend.value}
            </span>
          )}
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg ${styles.icon}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

// ─── Quick Action ───────────────────────────────────────────────────────────────
interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  desc: string;
  to?: string;
  onClick?: () => void;
  color: string;
}

const QuickAction: React.FC<QuickActionProps> = ({ icon, label, desc, to, onClick, color }) => {
  const content = (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-sm transition-all duration-200 hover:border-blue-200 hover:shadow-md hover:-translate-y-1 cursor-pointer group">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color} shadow-sm transition-transform group-hover:scale-110`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <p className="mt-0.5 text-xs text-gray-500">{desc}</p>
      </div>
    </div>
  );
  if (to) return <Link to={to}>{content}</Link>;
  return <button onClick={onClick} className="w-full text-left">{content}</button>;
};

// ─── Mini Pie Chart ─────────────────────────────────────────────────────────────
const PieChart: React.FC<{ success: number; running: number; failed: number }> = ({ success, running, failed }) => {
  const total = success + running + failed || 1;
  const s = (success / total) * 100;
  const r = (running / total) * 100;

  const segments = [
    { pct: s, color: '#22C55E' },
    { pct: r, color: '#3B82F6' },
    { pct: 100 - s - r, color: '#EF4444' },
  ];

  let cumulative = 0;
  const paths = segments.map((seg) => {
    const start = cumulative;
    cumulative += seg.pct;
    const startRad = (start / 100) * Math.PI * 2 - Math.PI / 2;
    const endRad = (cumulative / 100) * Math.PI * 2 - Math.PI / 2;
    const largeArc = seg.pct > 50 ? 1 : 0;
    const x1 = 50 + 40 * Math.cos(startRad);
    const y1 = 50 + 40 * Math.sin(startRad);
    const x2 = 50 + 40 * Math.cos(endRad);
    const y2 = 50 + 40 * Math.sin(endRad);
    return { d: `M50,50 L${x1},${y1} A40,40 0 ${largeArc},1 ${x2},${y2} Z`, color: seg.color };
  });

  return (
    <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-sm">
      {paths.map((p, i) => (
        <path key={i} d={p.d} fill={p.color} className="transition-all duration-300" />
      ))}
      <circle cx="50" cy="50" r="24" fill="white" />
      <text x="50" y="47" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#111827">
        {Math.round(s)}%
      </text>
      <text x="50" y="57" textAnchor="middle" fontSize="6" fill="#6B7280">
        success
      </text>
    </svg>
  );
};

// ─── Activity Item ──────────────────────────────────────────────────────────────
const statusMeta: Record<string, { bg: string; dot: string; label: string }> = {
  success: { bg: 'bg-green-50', dot: 'bg-green-500', label: 'Completed' },
  running: { bg: 'bg-blue-50', dot: 'bg-blue-500', label: 'Running' },
  failed: { bg: 'bg-red-50', dot: 'bg-red-500', label: 'Failed' },
  draft: { bg: 'bg-gray-50', dot: 'bg-gray-400', label: 'Draft' },
};

// ─── Main Dashboard ─────────────────────────────────────────────────────────────
const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const { pipelines, executions, fetchPipelines, fetchExecutions } = usePipelineStore();
  const [prompt, setPrompt] = useState('Build a daily sales pipeline from PostgreSQL to Snowflake');
  const [selectedTemplate, setSelectedTemplate] = useState('Sales');
  const [isCreating, setIsCreating] = useState(false);
  const [showTip, setShowTip] = useState(true);
  const navigate = useNavigate();
  const { addNotification } = useNotificationStore();

  useEffect(() => {
    fetchPipelines();
    fetchExecutions(0);
  }, []);

  const totalPipelines = pipelines.length;
  const runningPipelines = pipelines.filter((p) => p.status === 'running').length;
  const failedPipelines = pipelines.filter((p) => p.status === 'failed').length;
  const successPipelines = pipelines.filter((p) => p.status === 'success').length;
  const successRate =
    executions.length > 0
      ? (executions.filter((e) => e.status === 'success').length / executions.length) * 100
      : 0;

  const recentActivity = useMemo(() => pipelines.slice(0, 5), [pipelines]);

  const handleUsePrompt = async () => {
    if (!prompt.trim()) {
      addNotification({ type: 'warning', message: 'Please enter a prompt first' });
      return;
    }
    setIsCreating(true);
    try {
      const { createFromPrompt } = usePipelineStore.getState();
      const pipeline = await createFromPrompt(prompt);
      addNotification({ type: 'success', message: `Pipeline "${pipeline.name}" created!` });
      navigate('/pipelines');
    } catch (error: any) {
      addNotification({
        type: 'error',
        message: error.response?.data?.detail || 'Failed to create pipeline from prompt',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const templates: Record<string, string> = {
    Sales: 'Build a daily sales pipeline from PostgreSQL to Snowflake with customer data enrichment and revenue aggregation',
    IoT: 'Create a real-time IoT data pipeline ingesting sensor data from Kafka into BigQuery with anomaly detection',
    'Customer 360': 'Build a customer 360 pipeline merging data from PostgreSQL, MongoDB, and Salesforce into a unified view in Snowflake',
    'Data Quality': 'Set up a data quality monitoring pipeline that validates nulls, duplicates, and range constraints across PostgreSQL tables',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Welcome Hero ─────────────────────────────── */}
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 shadow-lg shadow-blue-500/20">
        <div className="relative p-6 lg:p-8">
          {/* Decorative blobs */}
          <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 translate-x-16 -translate-y-8 rounded-full bg-white/5 blur-2xl" />
          <div className="pointer-events-none absolute bottom-0 right-32 h-40 w-40 translate-y-8 rounded-full bg-indigo-400/20 blur-xl" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-200">
                Project Dashboard
              </p>
              <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
                👋 Welcome back, {user?.full_name?.split(' ')[0] || 'there'}!
              </h1>
              <p className="mt-2 max-w-lg text-sm text-blue-100/80">
                Here's what's happening with your data pipelines today.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/builder"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition-all hover:bg-blue-50 hover:shadow-md"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Pipeline
              </Link>
              <Link
                to="/monitoring"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/20"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Monitoring
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Row ─────────────────────────────────── */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Total Pipelines"
          value={totalPipelines}
          icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
          trend={{ value: '+2 this week', up: true }}
          variant="blue"
        />
        <StatCard
          title="Running"
          value={runningPipelines}
          icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
          trend={{ value: 'Live now', up: true }}
          variant="green"
        />
        <StatCard
          title="Failed"
          value={failedPipelines}
          icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          trend={{ value: 'Needs attention', up: false }}
          variant="red"
        />
        <StatCard
          title="Success Rate"
          value={`${successRate.toFixed(1)}%`}
          icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          trend={{ value: '+3% vs last week', up: true }}
          variant="purple"
        />
      </section>

      {/* ── Quick Actions ──────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-lg font-bold text-gray-900">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <QuickAction
            to="/builder"
            label="New Pipeline"
            desc="Build with AI"
            color="bg-blue-600 text-white"
            icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
          />
          <QuickAction
            to="/monitoring"
            label="Monitoring"
            desc="View metrics"
            color="bg-green-600 text-white"
            icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
          />
          <QuickAction
            label="Add Connection"
            desc="Connect data sources"
            color="bg-indigo-600 text-white"
            icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>}
          />
          <QuickAction
            to="/pipelines"
            label="View Reports"
            desc="All pipelines"
            color="bg-purple-600 text-white"
            icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
          />
        </div>
      </section>

      {/* ── Two Column: Chart + Activity ──────────────── */}
      <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* Pipeline Status */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Pipeline Status</h2>
          <p className="mt-0.5 text-xs text-gray-500">Distribution across all pipelines</p>

          <div className="mt-6 flex items-center gap-6">
            <div className="h-40 w-40 shrink-0">
              <PieChart
                success={successPipelines || 65}
                running={runningPipelines || 25}
                failed={failedPipelines || 10}
              />
            </div>
            <div className="space-y-3">
              {[
                { label: 'Success', pct: Math.round(((successPipelines || 65) / (totalPipelines || 100)) * 100), color: 'bg-green-500' },
                { label: 'Running', pct: Math.round(((runningPipelines || 25) / (totalPipelines || 100)) * 100), color: 'bg-blue-500' },
                { label: 'Failed', pct: Math.round(((failedPipelines || 10) / (totalPipelines || 100)) * 100), color: 'bg-red-500' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2.5">
                  <div className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                  <span className="text-sm text-gray-600">{item.label}</span>
                  <span className="ml-auto text-sm font-semibold text-gray-900">{item.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
              <p className="mt-0.5 text-xs text-gray-500">Latest pipeline runs</p>
            </div>
            <Link to="/pipelines" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
              View all →
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {recentActivity.length > 0 ? (
              recentActivity.map((pipeline) => {
                const meta = statusMeta[pipeline.status] || statusMeta.draft;
                return (
                  <Link
                    key={pipeline.id}
                    to={`/pipelines/${pipeline.id}`}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all hover:shadow-sm ${meta.bg}`}
                  >
                    <div className={`h-2 w-2 rounded-full ${meta.dot} shrink-0`} />
                    <span className="flex-1 truncate text-sm font-medium text-gray-900">
                      {pipeline.name}
                    </span>
                    <span className="text-xs text-gray-500 shrink-0">
                      {pipeline.updated_at
                        ? new Date(pipeline.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'just now'}
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      pipeline.status === 'success' ? 'bg-green-100 text-green-700'
                      : pipeline.status === 'running' ? 'bg-blue-100 text-blue-700'
                      : pipeline.status === 'failed' ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-600'
                    }`}>
                      {meta.label}
                    </span>
                  </Link>
                );
              })
            ) : (
              <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
                <div className="text-3xl">📭</div>
                <p className="mt-2 text-sm text-gray-500">No activity yet. Create your first pipeline!</p>
                <Link to="/builder" className="mt-3 inline-block text-sm font-semibold text-blue-600 hover:text-blue-700">
                  Get started →
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Prompt Builder ────────────────────────────── */}
      <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-indigo-50/50 to-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">AI Pipeline Generator</p>
            <h2 className="mt-1 text-lg font-bold text-gray-900">Describe your pipeline</h2>
            <p className="mt-0.5 text-sm text-gray-500">Tell AIDEN what you need and it will build it for you.</p>
          </div>
          <button
            onClick={handleUsePrompt}
            disabled={isCreating}
            className="btn-primary shrink-0"
          >
            {isCreating ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Use Prompt
              </>
            )}
          </button>
        </div>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          className="mt-4 w-full rounded-xl border border-blue-200 bg-white/80 px-4 py-3 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 disabled:opacity-50"
          placeholder="Describe your pipeline..."
          disabled={isCreating}
        />

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-xs font-medium text-gray-500 self-center">Templates:</span>
          {Object.keys(templates).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => { setSelectedTemplate(key); setPrompt(templates[key]); }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                selectedTemplate === key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'border border-blue-200 bg-white text-gray-700 hover:bg-blue-50'
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      </section>

      {/* ── AI Assistant Tip ──────────────────────────── */}
      {showTip && (
        <section className="flex items-start gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50/50 p-5 shadow-sm animate-slide-up">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-500/30">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">💡 AIDEN Suggests</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              Your IoT Stream pipeline has failed twice in the last hour.
            </p>
            <p className="mt-0.5 text-sm text-gray-600">
              Would you like me to diagnose the issue and suggest a fix?
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to="/builder" className="btn-primary px-4 py-1.5 text-xs">
                Yes, Help Me
              </Link>
              <button
                onClick={() => setShowTip(false)}
                className="rounded-lg px-4 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-white"
              >
                Dismiss
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default DashboardPage;
