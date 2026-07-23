import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  TrendingUp, DollarSign, Database, Download,
  FileText, Sparkles, ArrowUpRight, ArrowDownRight,
  Activity, Clock,
} from 'lucide-react';
import {
  PieChart, Pie, Cell,
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAnalyticsStore } from '../store/analyticsStore';
import { MetricsKpiCard, AIInsightCard } from '../components/analytics';
import type { Period } from '../store/analyticsStore';

// ─── Chart tooltip theme ──────────────────────────────────────────────
const chartTooltipStyle = {
  contentStyle: {
    background: '#111827',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    fontSize: '13px',
    color: '#F8FAFC',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  },
  labelStyle: { color: '#94A3B8', fontSize: '11px' },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={chartTooltipStyle.contentStyle} className="p-3">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

// ─── Cost Donut ─────────────────────────────────────────────────────────
const DONUT_COLORS = ['#7C3AED', '#06B6D4', '#F59E0B', '#22C55E', '#EF4444', '#64748B'];

const CostDonutChart: React.FC<{ data: any[] }> = ({ data }) => {
  const total = data.reduce((s: number, c: any) => s + c.amount, 0);
  return (
    <div className="flex items-center gap-6">
      <div className="h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={2}
              dataKey="amount"
            >
              {data.map((_: any, i: number) => (
                <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip {...chartTooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-2 flex-1 min-w-0">
        {data.slice(0, 5).map((item: any, i: number) => (
          <div key={item.category} className="flex items-center gap-2.5 text-sm">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: DONUT_COLORS[i] }} />
            <span className="text-gray-400 truncate">{item.category}</span>
            <span className="ml-auto font-semibold text-white shrink-0">
              ${item.amount.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main Page ──────────────────────────────────────────────────────────
const AnalyticsPage: React.FC = () => {
  const {
    period, trendData, costBreakdown, pipelineMetrics, aiInsights,
    setPeriod, exportCsv, exportPdf,
  } = useAnalyticsStore();

  const handleInsightAction = (action: string) => {
    if (action === 'view-costs') {
      document.getElementById('cost-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Compute summary stats
  const totalRuns = pipelineMetrics.reduce((s, p) => s + p.runs, 0);
  const totalCost = pipelineMetrics.reduce((s, p) => s + parseFloat(p.cost.replace('$', '')), 0);
  const avgSuccessRate = Math.round(pipelineMetrics.reduce((s, p) => s + p.successRate, 0) / pipelineMetrics.length);
  const totalVolume = pipelineMetrics.reduce((s, p) => s + parseFloat(p.dataVolume.replace(' GB', '').replace(' MB', '')), 0);

  // Aggregate trend data for the chart
  const chartData = trendData.slice(-14).map((d) => ({
    date: d.date,
    Runs: d.runs,
    Success: d.success,
    Failed: d.failed,
  }));

  const kpis = [
    { title: 'Pipeline Runs', value: totalRuns, icon: <Activity size={20} />, sub: `This ${period}`, trend: { direction: 'up' as const, value: '+16.2%' }, variant: 'purple' as const },
    { title: 'Total Cost', value: `$${totalCost.toFixed(0)}`, icon: <DollarSign size={20} />, sub: `This ${period}`, trend: { direction: 'up' as const, value: '+8.3%' }, variant: 'amber' as const },
    { title: 'Data Processed', value: `${totalVolume.toFixed(1)} GB`, icon: <Database size={20} />, sub: `This ${period}`, trend: { direction: 'up' as const, value: '+12.5%' }, variant: 'cyan' as const },
    { title: 'Avg Success Rate', value: `${avgSuccessRate}%`, icon: <TrendingUp size={20} />, sub: 'Across all pipelines', trend: { direction: 'down' as const, value: '-1.2%' }, variant: 'green' as const },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-8">
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-purple-400">Insights & Intelligence</p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">Analytics</h1>
          <p className="mt-1 text-sm text-gray-400">Pipeline performance, costs, and data volume metrics.</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex rounded-xl border border-[#1E293B] bg-[#111827] p-1 shadow-sm">
            {(['7D', '30D', '90D', '1Y'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                  period === p
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Export buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={exportCsv}
              className="flex items-center gap-1.5 rounded-xl border border-[#1E293B] bg-[#111827] px-3 py-2 text-sm font-medium text-gray-300 shadow-sm transition-all hover:bg-white/5 hover:text-white"
            >
              <Download size={14} />
              <span className="hidden sm:inline">CSV</span>
            </button>
            <button
              onClick={exportPdf}
              className="flex items-center gap-1.5 rounded-xl border border-[#1E293B] bg-[#111827] px-3 py-2 text-sm font-medium text-gray-300 shadow-sm transition-all hover:bg-white/5 hover:text-white"
            >
              <FileText size={14} />
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* EXECUTIVE KPI ROW */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi, i) => (
          <MetricsKpiCard
            key={kpi.title}
            title={kpi.title}
            value={kpi.value}
            icon={kpi.icon}
            sub={kpi.sub}
            trend={kpi.trend}
            variant={kpi.variant}
            delay={i * 0.08}
          />
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* AI-GENERATED INSIGHTS */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={16} className="text-purple-400" />
          <h2 className="text-base font-bold text-white">AI-Generated Insights</h2>
        </div>
        <div className="grid gap-3">
          {aiInsights.map((insight, i) => (
            <AIInsightCard
              key={insight.id}
              insight={insight}
              onAction={handleInsightAction}
              delay={i * 0.1}
            />
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TWO COLUMN: Performance Trend + Cost Donut */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Performance Trend — Area Chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-white">Pipeline Performance Trend</h2>
              <p className="text-xs text-gray-400">Daily pipeline runs — last {period}</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-purple-500" />Runs
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-500" />Success
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500" />Failed
              </span>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="runsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="successGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="Runs"
                  stroke="#7C3AED"
                  strokeWidth={2}
                  fill="url(#runsGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#7C3AED', stroke: '#1E293B', strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="Success"
                  stroke="#22C55E"
                  strokeWidth={2}
                  fill="url(#successGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#22C55E', stroke: '#1E293B', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 flex items-center gap-4 rounded-xl bg-purple-500/5 border border-purple-500/10 p-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-cyan-600 text-white shadow-lg">
              <TrendingUp size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">16.2% increase vs last period</p>
              <p className="text-xs text-gray-400">Pipeline activity is trending upward across all stages</p>
            </div>
          </div>
        </motion.div>

        {/* Cost Breakdown — Donut */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
          id="cost-section"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white">Cost Breakdown</h2>
              <p className="text-xs text-gray-400">
                Total: ${costBreakdown.reduce((s, c) => s + c.amount, 0).toLocaleString()} this {period}
              </p>
            </div>
            <DollarSign size={18} className="text-amber-400" />
          </div>

          <CostDonutChart data={costBreakdown} />

          <div className="mt-4 pt-4 border-t border-[#1E293B] space-y-2">
            {costBreakdown.map((item) => (
              <div key={item.category} className="flex items-center justify-between text-xs">
                <span className="text-gray-400">{item.category}</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[#1E293B]">
                    <div
                      className="h-full rounded-full bg-purple-500 transition-all"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <span className="flex items-center gap-0.5 font-semibold text-gray-300">
                    {item.trend === 'up' ? <ArrowUpRight size={10} className="text-red-400" /> : <ArrowDownRight size={10} className="text-green-400" />}
                    {item.trendValue}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* DURATION BAR CHART */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="glass-card p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-white">Pipeline Duration</h2>
            <p className="text-xs text-gray-400">Average execution time per pipeline (minutes)</p>
          </div>
          <Clock size={18} className="text-cyan-400" />
        </div>

        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={pipelineMetrics}
              margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: '#94A3B8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={140}
              />
              <Tooltip
                contentStyle={chartTooltipStyle.contentStyle}
                labelStyle={{ color: '#94A3B8' }}
              />
              <Bar dataKey="avgDuration" name="Avg Duration" radius={[0, 6, 6, 0]} barSize={20}>
                {pipelineMetrics.map((_, i) => (
                  <Cell key={i} fill={i === 2 ? '#EF4444' : i === 0 ? '#7C3AED' : '#06B6D4'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* PIPELINE COMPARISON TABLE */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-[#1E293B] px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-white">Pipeline Comparison</h2>
            <p className="text-xs text-gray-400">Detailed metrics per pipeline</p>
          </div>
          <Link to="/pipelines" className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors">
            View All →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-[#1E293B]">
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Pipeline</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Runs</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Avg Duration</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Data Volume</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Cost</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Success Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]/50">
              {pipelineMetrics.map((p, i) => (
                <motion.tr
                  key={p.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.45 + i * 0.05 }}
                  className="transition-colors hover:bg-white/[0.02]"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-cyan-500/20 text-xs font-bold text-purple-300">
                        {p.name.charAt(0)}
                      </div>
                      <span className="text-sm font-semibold text-white">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-300">{p.runs.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Clock size={12} className="text-gray-500" />
                      <span className="text-sm text-gray-400">{p.avgDuration}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">{p.dataVolume}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-300">{p.cost}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#1E293B]">
                        <div
                          className={`h-full rounded-full transition-all ${
                            p.successRate >= 95 ? 'bg-green-500' : p.successRate >= 80 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${p.successRate}%` }}
                        />
                      </div>
                      <span className={`text-xs font-semibold ${
                        p.successRate >= 95 ? 'text-green-400' : p.successRate >= 80 ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {p.successRate}%
                      </span>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AnalyticsPage;
