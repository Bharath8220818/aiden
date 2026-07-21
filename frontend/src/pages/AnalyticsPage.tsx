import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, TrendingUp, DollarSign, Database, Download, ArrowUpRight, ArrowDownRight } from 'lucide-react';

type Period = '7D' | '30D' | '90D' | '1Y';

interface TrendPoint {
  label: string;
  value: number;
  baseline: number;
}

interface CostBreakdown {
  category: string;
  amount: number;
  percentage: number;
  trend: 'up' | 'down';
  trendValue: string;
}

interface PipelineMetric {
  name: string;
  runs: number;
  avgDuration: string;
  dataVolume: string;
  cost: string;
  successRate: number;
}

const TREND_DATA: TrendPoint[] = [
  { label: 'Mon', value: 142, baseline: 120 },
  { label: 'Tue', value: 168, baseline: 125 },
  { label: 'Wed', value: 135, baseline: 130 },
  { label: 'Thu', value: 189, baseline: 128 },
  { label: 'Fri', value: 210, baseline: 135 },
  { label: 'Sat', value: 98, baseline: 90 },
  { label: 'Sun', value: 76, baseline: 85 },
];

const COST_BREAKDOWN: CostBreakdown[] = [
  { category: 'Compute', amount: 1280, percentage: 42, trend: 'up', trendValue: '+8.2%' },
  { category: 'Storage', amount: 580, percentage: 19, trend: 'up', trendValue: '+3.1%' },
  { category: 'Data Transfer', amount: 420, percentage: 14, trend: 'down', trendValue: '-2.4%' },
  { category: 'API Calls', amount: 350, percentage: 11, trend: 'up', trendValue: '+5.7%' },
  { category: 'AI Inference', amount: 280, percentage: 9, trend: 'down', trendValue: '-1.8%' },
  { category: 'Other', amount: 150, percentage: 5, trend: 'up', trendValue: '+0.9%' },
];

const PIPELINE_METRICS: PipelineMetric[] = [
  { name: 'Daily Sales ETL', runs: 142, avgDuration: '4.2 min', dataVolume: '2.1 GB', cost: '$12.40', successRate: 98 },
  { name: 'Customer Analytics', runs: 89, avgDuration: '2.8 min', dataVolume: '890 MB', cost: '$8.20', successRate: 100 },
  { name: 'IoT Stream Pipeline', runs: 340, avgDuration: '0.5 min', dataVolume: '15.2 GB', cost: '$45.80', successRate: 62 },
  { name: 'Product Inventory', runs: 28, avgDuration: '8.1 min', dataVolume: '450 MB', cost: '$6.50', successRate: 87 },
  { name: 'Marketing Attribution', runs: 56, avgDuration: '3.5 min', dataVolume: '1.8 GB', cost: '$9.30', successRate: 95 },
];

const AnalyticsPage: React.FC = () => {
  const [period, setPeriod] = useState<Period>('30D');

  const maxTrendValue = Math.max(...TREND_DATA.map((d) => Math.max(d.value, d.baseline)));
  const totalCost = COST_BREAKDOWN.reduce((s, c) => s + c.amount, 0);
  const totalDataVolume = '~20.4';
  const totalPipelineRuns = PIPELINE_METRICS.reduce((s, p) => s + p.runs, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-purple-600 dark:text-purple-400">
            Insights
          </p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
            Analytics
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Pipeline performance, costs, and data volume metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex rounded-xl border border-gray-100 bg-white p-1 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            {(['7D', '30D', '90D', '1Y'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                  period === p
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800">
            <Download size={14} />
            Export
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Pipeline Runs', value: totalPipelineRuns.toLocaleString(), icon: BarChart3, sub: `This ${period}`, color: 'bg-purple-600', cardColor: 'from-purple-50 to-white border-purple-100' },
          { label: 'Total Cost', value: `$${totalCost.toLocaleString()}`, icon: DollarSign, sub: `This ${period}`, color: 'bg-green-600', cardColor: 'from-green-50 to-white border-green-100' },
          { label: 'Data Processed', value: `${totalDataVolume} GB`, icon: Database, sub: `This ${period}`, color: 'bg-cyan-600', cardColor: 'from-cyan-50 to-white border-cyan-100' },
          { label: 'Avg Success Rate', value: '88.4%', icon: TrendingUp, sub: 'Across all pipelines', color: 'bg-amber-500', cardColor: 'from-amber-50 to-white border-amber-100' },
        ].map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.label}
              className={`rounded-2xl border bg-gradient-to-br p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 dark:bg-gray-900/60 ${m.cardColor} dark:border-gray-700`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{m.label}</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{m.value}</p>
                  <p className="mt-1 text-xs text-gray-400">{m.sub}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm ${m.color}`}>
                  <Icon size={20} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Two Column: Trend Chart + Cost Breakdown ── */}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Performance Trend */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900/60">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Pipeline Performance Trend</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Daily pipeline runs — last {period}</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-purple-600" />Runs</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-600" />Baseline</span>
            </div>
          </div>

          <div className="mt-6 flex items-end gap-3 overflow-x-auto pb-2">
            {TREND_DATA.map((point) => (
              <div key={point.label} className="flex shrink-0 flex-col items-center gap-1.5" style={{ minWidth: '48px' }}>
                {/* Stacked bars */}
                <div className="relative flex w-10 flex-col items-center">
                  {/* Value bar */}
                  <div
                    className="w-full rounded-t-md bg-purple-500 transition-all hover:opacity-80"
                    style={{ height: `${(point.value / maxTrendValue) * 140}px` }}
                    title={`${point.value} runs`}
                  />
                  {/* Baseline line */}
                  <div
                    className="absolute w-full border-t-2 border-dashed border-gray-400 dark:border-gray-500"
                    style={{ bottom: `${(point.baseline / maxTrendValue) * 140}px`, transform: 'translateY(1px)' }}
                  />
                </div>
                <p className="text-[10px] font-medium text-gray-400">{point.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-4 rounded-xl bg-purple-50 p-3 dark:bg-purple-950/30">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600 text-white">
              <TrendingUp size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">16.2% increase vs last period</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Pipeline activity is trending upward</p>
            </div>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900/60">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Cost Breakdown</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Total: ${totalCost.toLocaleString()} this {period}</p>

          <div className="mt-6 space-y-4">
            {COST_BREAKDOWN.map((item) => (
              <div key={item.category}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300">{item.category}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-white">${item.amount.toLocaleString()}</span>
                    <span className={`flex items-center gap-0.5 text-xs font-medium ${
                      item.trend === 'up' ? 'text-red-500' : 'text-green-500'
                    }`}>
                      {item.trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      {item.trendValue}
                    </span>
                  </div>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className="h-full rounded-full bg-purple-500 transition-all"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Pipeline Metrics Table ── */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900/60">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-700">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Pipeline Performance</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Detailed metrics per pipeline</p>
          </div>
          <Link to="/pipelines" className="text-xs font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400">
            View All →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50/70 dark:bg-gray-800/50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Pipeline</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Runs</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Avg Duration</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Data Volume</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Cost</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Success Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {PIPELINE_METRICS.map((p) => (
                <tr key={p.name} className="transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{p.name}</p>
                  </td>
                  <td className="px-5 py-4 text-sm font-medium text-gray-700 dark:text-gray-300">{p.runs.toLocaleString()}</td>
                  <td className="px-5 py-4 text-sm text-gray-500">{p.avgDuration}</td>
                  <td className="px-5 py-4 text-sm text-gray-500">{p.dataVolume}</td>
                  <td className="px-5 py-4 text-sm font-medium text-gray-700 dark:text-gray-300">{p.cost}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className={`h-full rounded-full transition-all ${
                            p.successRate >= 95 ? 'bg-green-500' : p.successRate >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${p.successRate}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{p.successRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
