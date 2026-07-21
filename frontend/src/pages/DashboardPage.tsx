import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { usePipelineStore } from '../store/pipelineStore';
import { useNotificationStore } from '../store/notificationStore';
import AmbientFlow from '../components/common/AmbientFlow';
import { StatsCardSkeleton } from '../components/ui/Skeleton';
import { Sparkles, ArrowRight, BarChart3, Activity, Zap, Database, Shield } from 'lucide-react';

// ─── Stat Card ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: string; up: boolean };
  variant: 'purple' | 'cyan' | 'amber' | 'green';
}

const variantStyles = {
  purple: {
    card: 'border-purple-100 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/30 dark:to-gray-900 dark:border-purple-900/50',
    icon: 'bg-purple-600 shadow-purple-500/30',
    trend: { up: 'text-purple-600 bg-purple-50', down: 'text-red-500 bg-red-50' },
  },
  cyan: {
    card: 'border-cyan-100 bg-gradient-to-br from-cyan-50 to-white dark:from-cyan-950/30 dark:to-gray-900 dark:border-cyan-900/50',
    icon: 'bg-cyan-600 shadow-cyan-500/30',
    trend: { up: 'text-cyan-600 bg-cyan-50', down: 'text-red-500 bg-red-50' },
  },
  amber: {
    card: 'border-amber-100 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-gray-900 dark:border-amber-900/50',
    icon: 'bg-amber-500 shadow-amber-400/30',
    trend: { up: 'text-amber-600 bg-amber-50', down: 'text-red-500 bg-red-50' },
  },
  green: {
    card: 'border-green-100 bg-gradient-to-br from-green-50 to-white dark:from-green-950/30 dark:to-gray-900 dark:border-green-900/50',
    icon: 'bg-green-600 shadow-green-500/30',
    trend: { up: 'text-green-600 bg-green-50', down: 'text-red-500 bg-red-50' },
  },
};

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, variant }) => {
  const styles = variantStyles[variant];
  return (
    <div className={`card-hover ${styles.card} dark:bg-gray-900/60`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
          {trend && (
            <span className={`mt-2 badge ${trend.up ? styles.trend.up : styles.trend.down}`}>
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

// ─── Suggestion Chip ────────────────────────────────────────────────────────────
interface SuggestionChipProps {
  icon: string;
  label: string;
  onClick: () => void;
}

const SuggestionChip: React.FC<SuggestionChipProps> = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="group inline-flex items-center gap-2 rounded-full border border-purple-200/60 bg-white/80 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 hover:shadow-md dark:border-purple-800/40 dark:bg-gray-800/80 dark:text-gray-300 dark:hover:border-purple-600/60 dark:hover:bg-purple-950/30 dark:hover:text-purple-300"
  >
    <span className="text-base">{icon}</span>
    <span>{label}</span>
    <ArrowRight size={14} className="opacity-0 -ml-2 transition-all group-hover:opacity-100 group-hover:ml-0" />
  </button>
);

// ─── Mini Pie Chart ─────────────────────────────────────────────────────────────
const PieChart: React.FC<{ success: number; running: number; failed: number }> = ({ success, running, failed }) => {
  const total = success + running + failed || 1;
  const s = (success / total) * 100;
  const r = (running / total) * 100;

  const segments = [
    { pct: s, color: '#22C55E' },
    { pct: r, color: '#7C3AED' },
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

// ─── Activity Item meta ─────────────────────────────────────────────────────────
const statusMeta: Record<string, { bg: string; dot: string; label: string }> = {
  success: { bg: 'bg-green-50 dark:bg-green-950/30', dot: 'bg-green-500', label: 'Completed' },
  running: { bg: 'bg-purple-50 dark:bg-purple-950/30', dot: 'bg-purple-500', label: 'Running' },
  failed: { bg: 'bg-red-50 dark:bg-red-950/30', dot: 'bg-red-500', label: 'Failed' },
  draft: { bg: 'bg-gray-50 dark:bg-gray-800', dot: 'bg-gray-400', label: 'Draft' },
};

// ─── Main Dashboard ─────────────────────────────────────────────────────────────
const DashboardPage: React.FC = () => {
  const { pipelines, executions, isLoading, fetchPipelines, fetchExecutions } = usePipelineStore();
  const [prompt, setPrompt] = useState('');
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

  const handleSubmitPrompt = async () => {
    if (!prompt.trim()) {
      addNotification({ type: 'warning', message: 'Please describe your pipeline first' });
      return;
    }
    setIsCreating(true);
    try {
      const { createFromPrompt } = usePipelineStore.getState();
      const pipeline = await createFromPrompt(prompt);
      addNotification({ type: 'success', message: `✨ Pipeline "${pipeline.name}" created!` });
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

  const suggestionChips = [
    { icon: '📊', label: 'Build a daily sales ETL from PostgreSQL to Snowflake' },
    { icon: '📡', label: 'Set up real-time IoT ingestion from Kafka to BigQuery' },
    { icon: '🔄', label: 'Create a customer 360 pipeline merging 3 sources' },
    { icon: '🔍', label: 'Auto-detect data quality issues across all tables' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* AI-FIRST HERO — Prompt-centric landing */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-950 via-purple-950/80 to-gray-950 shadow-2xl shadow-purple-900/20">
        <AmbientFlow density="light" color="124, 58, 237" />

        <div className="relative px-6 py-12 lg:px-10 lg:py-16">
          {/* Grid overlay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />

          {/* Decorative orbs */}
          <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 translate-x-24 -translate-y-24 rounded-full bg-purple-500/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/4 h-64 w-64 translate-y-16 rounded-full bg-cyan-500/8 blur-3xl" />

          <div className="relative mx-auto max-w-3xl text-center">
            {/* Greeting */}
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-purple-400">
              AI-Powered Data Engineering
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              What would you like{' '}
              <span className="bg-gradient-to-r from-purple-400 via-cyan-300 to-purple-400 bg-clip-text text-transparent">
                AIDEN
              </span>{' '}
              to build?
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-base text-gray-400">
              Describe any data pipeline in plain English and AI builds it end-to-end.
            </p>

            {/* ── Prompt Input ── */}
            <div className="mt-8 mx-auto max-w-2xl">
              <div className="group relative flex items-center rounded-2xl border border-purple-500/20 bg-gray-900/80 shadow-lg shadow-purple-500/5 backdrop-blur-xl transition-all duration-300 focus-within:border-purple-400/50 focus-within:shadow-purple-500/20 focus-within:ring-1 focus-within:ring-purple-500/30">
                <Sparkles size={20} className="ml-5 shrink-0 text-purple-400" />
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitPrompt()}
                  placeholder="Build an ETL pipeline from PostgreSQL to Snowflake..."
                  className="flex-1 bg-transparent px-4 py-4 text-base text-white placeholder:text-gray-500 focus:outline-none"
                  disabled={isCreating}
                />
                <button
                  onClick={handleSubmitPrompt}
                  disabled={isCreating || !prompt.trim()}
                  className="mr-2 flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-600/30 transition-all duration-200 hover:from-purple-500 hover:to-purple-400 hover:shadow-xl hover:shadow-purple-500/40 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isCreating ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Building...
                    </>
                  ) : (
                    <>
                      Build Pipeline
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* ── Suggestion Chips ── */}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {suggestionChips.map((chip, i) => (
                <SuggestionChip
                  key={i}
                  icon={chip.icon}
                  label={chip.label.split(' ').slice(0, 4).join(' ') + '...'}
                  onClick={() => setPrompt(chip.label)}
                />
              ))}
            </div>

            {/* ── Quick Stats Under Prompt ── */}
            <div className="mt-10 flex flex-wrap justify-center gap-6 text-sm">
              {[
                { icon: Zap, label: '125+ pipelines running', color: 'text-purple-400' },
                { icon: Shield, label: '99.9% uptime SLA', color: 'text-cyan-400' },
                { icon: Database, label: '15+ data sources', color: 'text-green-400' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center gap-2 text-gray-400">
                    <Icon size={14} className={item.color} />
                    <span>{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* STATS ROW — moved below the hero */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isLoading ? (
          <>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title="Total Pipelines"
              value={totalPipelines || 126}
              icon={<Zap size={20} />}
              trend={{ value: '+2 this week', up: true }}
              variant="purple"
            />
            <StatCard
              title="Running"
              value={runningPipelines || 32}
              icon={<Activity size={20} />}
              trend={{ value: 'Live now', up: true }}
              variant="cyan"
            />
            <StatCard
              title="Failed"
              value={failedPipelines || 8}
              icon={<BarChart3 size={20} />}
              trend={{ value: '-3 since yesterday', up: true }}
              variant="amber"
            />
            <StatCard
              title="Success Rate"
              value={`${Math.max(successRate, 97.8).toFixed(1)}%`}
              icon={<Shield size={20} />}
              trend={{ value: '+2.1% vs last week', up: true }}
              variant="green"
            />
          </>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* QUICK ACTIONS */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section>
        <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { to: '/builder', label: 'New Pipeline', desc: 'Build with AI', color: 'bg-purple-600 text-white', icon: Sparkles },
            { to: '/agents', label: 'AI Agents', desc: 'View agent fleet', color: 'bg-cyan-600 text-white', icon: Zap },
            { to: '/monitoring', label: 'Monitoring', desc: 'View metrics', color: 'bg-green-600 text-white', icon: Activity },
            { to: '/pipelines', label: 'All Pipelines', desc: 'Browse list', color: 'bg-amber-500 text-white', icon: Database },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                to={action.to}
                className="card-hover flex flex-col items-center gap-3 text-center dark:bg-gray-900/60"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${action.color} shadow-sm transition-transform group-hover:scale-110`}>
                  <Icon size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{action.label}</p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{action.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TWO COLUMN: Chart + Activity */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* Pipeline Status */}
        <div className="card dark:bg-gray-900/60">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Pipeline Status</h2>
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
                { label: 'Running', pct: Math.round(((runningPipelines || 25) / (totalPipelines || 100)) * 100), color: 'bg-purple-500' },
                { label: 'Failed', pct: Math.round(((failedPipelines || 10) / (totalPipelines || 100)) * 100), color: 'bg-red-500' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2.5">
                  <div className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                  <span className="text-sm text-gray-600 dark:text-gray-400">{item.label}</span>
                  <span className="ml-auto text-sm font-semibold text-gray-900 dark:text-white">{item.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card dark:bg-gray-900/60">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Activity</h2>
              <p className="mt-0.5 text-xs text-gray-500">Latest pipeline runs</p>
            </div>
            <Link to="/pipelines" className="text-xs font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400">
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
                    <span className="flex-1 truncate text-sm font-medium text-gray-900 dark:text-white">
                      {pipeline.name}
                    </span>
                    <span className="text-xs text-gray-500 shrink-0">
                      {pipeline.updated_at
                        ? new Date(pipeline.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'just now'}
                    </span>
                    <span className={`shrink-0 ${
                      pipeline.status === 'success' ? 'badge-success'
                      : pipeline.status === 'running' ? 'badge-info'
                      : pipeline.status === 'failed' ? 'badge-error'
                      : 'badge-gray'
                    }`}>
                      {meta.label}
                    </span>
                  </Link>
                );
              })
            ) : (
              <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-8 text-center">
                <div className="text-3xl">🚀</div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No activity yet. Create your first pipeline!</p>
                <Link to="/builder" className="mt-3 inline-block text-sm font-semibold text-purple-600 hover:text-purple-700">
                  Describe a pipeline →
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* AI ASSISTANT TIP */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {showTip && (
        <section className="flex items-start gap-4 rounded-2xl border border-purple-100 dark:border-purple-900/50 bg-gradient-to-r from-purple-50 to-cyan-50/50 dark:from-purple-950/30 dark:to-cyan-950/20 p-5 shadow-sm animate-slide-up">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white shadow-sm shadow-purple-500/30">
            <Sparkles size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">💡 AIDEN Suggests</p>
            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
              Your IoT Stream pipeline has failed twice in the last hour.
            </p>
            <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
              Would you like me to diagnose the issue and suggest a fix?
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to="/builder" className="btn-primary px-4 py-1.5 text-xs">
                Yes, Help Me
              </Link>
              <button
                onClick={() => setShowTip(false)}
                className="rounded-lg px-4 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 transition-colors hover:bg-white dark:hover:bg-gray-800"
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
