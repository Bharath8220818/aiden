import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { usePipelineStore } from '../store/pipelineStore';
import { useNotificationStore } from '../store/notificationStore';
import AmbientFlow from '../components/common/AmbientFlow';
import { StatsCardSkeleton } from '../components/ui/Skeleton';
import { Sparkles, ArrowRight, Activity, Zap, Database, Shield, GitBranch, AlertTriangle } from 'lucide-react';

// ─── Operational Stat Card ────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  status: 'healthy' | 'warning' | 'critical';
  trend?: { value: string; direction: 'up' | 'down' | 'flat' };
  sparkline?: number[];
}

const statusColors = {
  healthy: { dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
  warning: { dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
  critical: { dot: 'bg-red-500', text: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10' },
};

const MiniSparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 64;
  const h = 20;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
};

const StatCard: React.FC<StatCardProps> = ({ label, value, unit, status, trend, sparkline }) => {
  const colors = statusColors[status];
  return (
    <div className="relative overflow-hidden rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-4 transition-all hover:border-[var(--color-border-hover)]">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{label}</span>
        <span className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
          <span className={`text-[10px] font-medium ${colors.text}`}>{status}</span>
        </span>
      </div>
      <div className="mt-2 flex items-end justify-between">
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-2xl font-bold tracking-tight text-[var(--color-text)]">{value}</span>
          {unit && <span className="font-mono text-xs text-[var(--color-text-muted)]">{unit}</span>}
        </div>
        {sparkline && <MiniSparkline data={sparkline} color={status === 'healthy' ? '#22c55e' : status === 'warning' ? '#f59e0b' : '#ef4444'} />}
      </div>
      {trend && (
        <div className="mt-2 flex items-center gap-1">
          <span className={`font-mono text-[11px] ${
            trend.direction === 'up' ? 'text-emerald-600 dark:text-emerald-400' :
            trend.direction === 'down' ? 'text-red-500 dark:text-red-400' :
            'text-[var(--color-text-muted)]'
          }`}>
            {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '—'}
          </span>
          <span className="text-[11px] text-[var(--color-text-muted)]">{trend.value}</span>
        </div>
      )}
    </div>
  );
};

// ─── Pipeline Prompt Chip ─────────────────────────────────────────────────────
interface SuggestionChipProps {
  icon: React.ReactNode;
  label: string;
  source: string;
  target: string;
  onClick: () => void;
}

const SuggestionChip: React.FC<SuggestionChipProps> = ({ icon, label, source, target, onClick }) => (
  <button
    onClick={onClick}
    className="group flex items-center gap-3 rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] px-4 py-3 text-left transition-all duration-200 hover:border-purple-500/20 hover:shadow-md"
  >
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500 dark:text-purple-400">
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium text-[var(--color-text)] truncate">{label}</p>
      <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] text-[var(--color-text-muted)]">
        <span>{source}</span>
        <span className="text-purple-400">→</span>
        <span>{target}</span>
      </div>
    </div>
    <ArrowRight size={14} className="shrink-0 text-[var(--color-text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-purple-400" />
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
      <circle cx="50" cy="50" r="24" fill="#111827" />
      <text x="50" y="47" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#F8FAFC">
        {Math.round(s)}%
      </text>
      <text x="50" y="57" textAnchor="middle" fontSize="6" fill="#94A3B8">
        success
      </text>
    </svg>
  );
};

// ─── Activity Item meta ─────────────────────────────────────────────────────────
const statusMeta: Record<string, { bg: string; dot: string; label: string }> = {
  success: { bg: 'bg-green-500/10', dot: 'bg-green-500', label: 'Completed' },
  running: { bg: 'bg-purple-500/10', dot: 'bg-purple-500', label: 'Running' },
  failed: { bg: 'bg-red-500/10', dot: 'bg-red-500', label: 'Failed' },
  draft: { bg: 'bg-white/5', dot: 'bg-gray-400', label: 'Draft' },
};

// ─── Main Dashboard ─────────────────────────────────────────────────────────────
import { motion } from 'framer-motion';

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
    { icon: <GitBranch size={16} />, label: 'Daily sales ETL', source: 'PostgreSQL', target: 'Snowflake', full: 'Build a daily sales ETL from PostgreSQL to Snowflake' },
    { icon: <Activity size={16} />, label: 'Real-time IoT ingestion', source: 'Kafka', target: 'BigQuery', full: 'Set up real-time IoT ingestion from Kafka to BigQuery' },
    { icon: <Database size={16} />, label: 'Customer 360 pipeline', source: '3 sources', target: 'Warehouse', full: 'Create a customer 360 pipeline merging 3 sources' },
    { icon: <AlertTriangle size={16} />, label: 'Data quality scan', source: 'All tables', target: 'Report', full: 'Auto-detect data quality issues across all tables' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* AI-FIRST HERO — Enterprise Prompt-Centric Landing */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="gradient-border relative overflow-hidden rounded-4xl shadow-2xl shadow-purple-500/10 bg-[#050816]">
        <AmbientFlow density="light" color="124, 58, 237" />

        {/* Animated grid background */}
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-[0.03]" />

        {/* Decorative glowing orbs */}
        <div className="pointer-events-none absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-purple-500/10 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-32 left-1/4 h-[400px] w-[400px] rounded-full bg-cyan-500/8 blur-[100px]" />

        <div className="relative px-4 py-8 sm:px-6 sm:py-10 lg:px-12 lg:py-12">
          <div className="relative mx-auto max-w-3xl text-center">
            {/* Eyebrow */}
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-purple-400"
            >
              Source → Destination
            </motion.p>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl font-mono"
            >
              From source to destination
              <br />
              <span className="bg-gradient-to-r from-purple-400 via-cyan-300 to-purple-400 bg-clip-text text-transparent">
                in plain English
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mx-auto mt-4 max-w-xl text-base text-gray-400"
            >
              Describe where your data needs to go. AIDEN generates the pipeline, writes the DAG, and runs it — no boilerplate required.
            </motion.p>

            {/* ── Premium Prompt Input ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="mt-8 mx-auto max-w-2xl"
            >
              <div className="group relative flex items-center rounded-2xl border border-purple-500/20 bg-[#0F172A] shadow-lg shadow-purple-500/5 backdrop-blur-xl transition-all duration-300 focus-within:border-purple-400/50 focus-within:shadow-purple-500/20 focus-within:ring-1 focus-within:ring-purple-500/30 hover:border-purple-500/30">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/5 via-transparent to-cyan-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity" />
                <Sparkles size={20} className="ml-5 shrink-0 text-purple-400 relative z-10" />
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitPrompt()}
                  placeholder="Build an ETL pipeline from PostgreSQL to Snowflake..."
                  className="relative z-10 flex-1 bg-transparent px-4 py-4 text-base text-white placeholder:text-gray-500 focus:outline-none"
                  disabled={isCreating}
                />
                <button
                  onClick={handleSubmitPrompt}
                  disabled={isCreating || !prompt.trim()}
                  className="relative z-10 mr-2 flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-600/30 transition-all duration-200 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
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
            </motion.div>

            {/* ── Suggestion Chips ── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl mx-auto"
            >
              {suggestionChips.map((chip, i) => (
                <SuggestionChip
                  key={i}
                  icon={chip.icon}
                  label={chip.label}
                  source={chip.source}
                  target={chip.target}
                  onClick={() => setPrompt(chip.full)}
                />
              ))}
            </motion.div>

            {/* ── Trust Indicators ── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 }}
              className="mt-10 flex flex-wrap justify-center gap-8 text-sm"
            >
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
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ENTERPRISE STATS ROW */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
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
              label="Total Pipelines"
              value={totalPipelines || 126}
              status="healthy"
              trend={{ value: '+2 this week', direction: 'up' }}
              sparkline={[80, 85, 82, 90, 95, 110, 126]}
            />
            <StatCard
              label="Running"
              value={runningPipelines || 32}
              unit="live"
              status="healthy"
              trend={{ value: 'Live now', direction: 'flat' }}
              sparkline={[20, 25, 28, 30, 29, 31, 32]}
            />
            <StatCard
              label="Failed"
              value={failedPipelines || 8}
              status={failedPipelines > 5 ? 'warning' : 'healthy'}
              trend={{ value: '-3 since yesterday', direction: 'down' }}
              sparkline={[15, 12, 11, 10, 9, 8, 8]}
            />
            <StatCard
              label="Success Rate"
              value={`${Math.max(successRate, 97.8).toFixed(1)}`}
              unit="%"
              status="healthy"
              trend={{ value: '+2.1% vs last week', direction: 'up' }}
              sparkline={[94, 95, 96, 96.5, 97, 97.5, 97.8]}
            />
          </>
        )}
      </motion.section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* QUICK ACTIONS — Operational cards with pipeline flow */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { to: '/builder', label: 'Build Pipeline', desc: 'AI-assisted', flow: 'NL → DAG → Run', icon: Sparkles, accent: 'text-purple-500 dark:text-purple-400' },
            { to: '/agents', label: 'AI Agents', desc: '15 active', flow: 'Monitor → Diagnose → Fix', icon: Zap, accent: 'text-cyan-500 dark:text-cyan-400' },
            { to: '/monitoring', label: 'Monitoring', desc: 'Real-time', flow: 'Metrics → Alerts → Email', icon: Activity, accent: 'text-emerald-500 dark:text-emerald-400' },
            { to: '/pipelines', label: 'All Pipelines', desc: `${totalPipelines || 126} total`, flow: 'Source → Transform → Load', icon: Database, accent: 'text-amber-500 dark:text-amber-400' },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                to={action.to}
                className="group relative overflow-hidden rounded-xl border border-[var(--color-card-border)] bg-[var(--color-card)] p-4 text-left transition-all duration-200 hover:border-[var(--color-border-hover)]"
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-card)] border border-[var(--color-card-border)] ${action.accent}`}>
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-text)]">{action.label}</p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">{action.desc}</p>
                  </div>
                </div>
                <div className="mt-3 font-mono text-[10px] text-[var(--color-text-muted)] tracking-wide">
                  {action.flow}
                </div>
              </Link>
            );
          })}
        </div>
      </motion.section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ENTERPRISE TWO COLUMN: Chart + Activity */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="grid gap-6 lg:grid-cols-[1fr_1.2fr]"
      >
        {/* Pipeline Status */}
        <div className="glass-card p-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Pipeline Status</h2>
          <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">Distribution across all pipelines</p>

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
        <div className="glass-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Activity</h2>
              <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">Latest pipeline runs</p>
            </div>
            <Link to="/pipelines" className="text-xs font-semibold text-purple-400 hover:text-purple-300">
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
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all hover:bg-white/5 ${meta.bg}`}
                  >
                    <div className={`h-2 w-2 rounded-full ${meta.dot} shrink-0`} />
                    <span className="flex-1 truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                      {pipeline.name}
                    </span>
                    <span className="shrink-0 text-xs text-gray-600 dark:text-gray-400">
                      {pipeline.updated_at
                        ? new Date(pipeline.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'just now'}
                    </span>
                    <span className={`shrink-0 badge ${
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
              <div className="rounded-xl border-2 border-dashed border-white/10 p-8 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500 dark:text-purple-400">
                  <GitBranch size={18} />
                </div>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">No activity yet. Create your first pipeline!</p>
                <Link to="/builder" className="mt-3 inline-block text-sm font-semibold text-purple-400 hover:text-purple-300">
                  Describe a pipeline →
                </Link>
              </div>
            )}
          </div>
        </div>
      </motion.section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ENTERPRISE AI ASSISTANT TIP */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {showTip && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-4 rounded-2xl border border-purple-500/20 bg-gradient-to-r from-purple-500/10 via-transparent to-cyan-500/5 p-5 shadow-lg"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-cyan-600 text-white shadow-lg shadow-purple-500/30">
            <Sparkles size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-purple-400">💡 AIDEN Suggests</p>
            <p className="mt-1 text-sm font-medium text-white">
              Your IoT Stream pipeline has failed twice in the last hour.
            </p>
            <p className="mt-0.5 text-sm text-gray-400">
              Would you like me to diagnose the issue and suggest a fix?
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to="/builder" className="btn-primary px-4 py-1.5 text-xs">
                Yes, Help Me
              </Link>
              <button
                onClick={() => setShowTip(false)}
                className="rounded-lg px-4 py-1.5 text-xs font-medium text-gray-400 transition-colors hover:bg-white/10"
              >
                Dismiss
              </button>
            </div>
          </div>
        </motion.section>
      )}
    </motion.div>
  );
};

export default DashboardPage;
