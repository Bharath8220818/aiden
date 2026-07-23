import { create } from 'zustand';
import { subDays, format } from 'date-fns';

export type Period = '7D' | '30D' | '90D' | '1Y';

export interface TrendPoint {
  date: string;
  runs: number;
  success: number;
  failed: number;
  duration: number; // avg minutes
}

export interface CostBreakdown {
  category: string;
  amount: number;
  percentage: number;
  trend: 'up' | 'down';
  trendValue: string;
}

export interface PipelineMetric {
  name: string;
  id: number;
  runs: number;
  avgDuration: string;
  dataVolume: string;
  cost: string;
  successRate: number;
}

export interface AiInsight {
  id: string;
  type: 'improvement' | 'warning' | 'achievement';
  title: string;
  description: string;
  metric: string;
  action: string;
  actionLabel: string;
}

// ─── Generate trend data for the last N days ────────────────────────
function generateTrendData(days: number): TrendPoint[] {
  const data: TrendPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = format(subDays(new Date(), i), 'MMM dd');
    const base = 120 + Math.round(Math.random() * 80);
    data.push({
      date,
      runs: base,
      success: Math.round(base * (0.85 + Math.random() * 0.12)),
      failed: Math.round(base * (0.02 + Math.random() * 0.05)),
      duration: Math.round((3 + Math.random() * 6) * 10) / 10,
    });
  }
  return data;
}

const TREND_DATA: TrendPoint[] = generateTrendData(30);

const COST_BREAKDOWN: CostBreakdown[] = [
  { category: 'Compute', amount: 1280, percentage: 42, trend: 'up', trendValue: '+8.2%' },
  { category: 'Storage', amount: 580, percentage: 19, trend: 'up', trendValue: '+3.1%' },
  { category: 'Data Transfer', amount: 420, percentage: 14, trend: 'down', trendValue: '-2.4%' },
  { category: 'API Calls', amount: 350, percentage: 11, trend: 'up', trendValue: '+5.7%' },
  { category: 'AI Inference', amount: 280, percentage: 9, trend: 'down', trendValue: '-1.8%' },
  { category: 'Other', amount: 150, percentage: 5, trend: 'up', trendValue: '+0.9%' },
];

const PIPELINE_METRICS: PipelineMetric[] = [
  { id: 1, name: 'Daily Sales ETL', runs: 142, avgDuration: '4.2 min', dataVolume: '2.1 GB', cost: '$12.40', successRate: 98 },
  { id: 2, name: 'Customer Analytics', runs: 89, avgDuration: '2.8 min', dataVolume: '890 MB', cost: '$8.20', successRate: 100 },
  { id: 3, name: 'IoT Stream Pipeline', runs: 340, avgDuration: '0.5 min', dataVolume: '15.2 GB', cost: '$45.80', successRate: 62 },
  { id: 4, name: 'Product Inventory', runs: 28, avgDuration: '8.1 min', dataVolume: '450 MB', cost: '$6.50', successRate: 87 },
  { id: 5, name: 'Marketing Attribution', runs: 56, avgDuration: '3.5 min', dataVolume: '1.8 GB', cost: '$9.30', successRate: 95 },
];

function computeInsights(pipelines: PipelineMetric[]): AiInsight[] {
  const worstPipeline = pipelines.reduce((w, p) => (p.successRate < w.successRate ? p : w), pipelines[0]);
  const totalRuns = pipelines.reduce((s, p) => s + p.runs, 0);
  const totalCost = pipelines.reduce((s, p) => s + parseFloat(p.cost.replace('$', '')), 0);
  const bestPipeline = pipelines.reduce((b, p) => (p.successRate > b.successRate ? p : b), pipelines[0]);

  return [
    {
      id: '1',
      type: 'warning',
      title: `${worstPipeline.name} has a low success rate`,
      description: `Only ${worstPipeline.successRate}% of runs succeed. This may indicate data quality issues or configuration drift.`,
      metric: `${worstPipeline.successRate}% success`,
      action: 'inspect-broken',
      actionLabel: 'Investigate Pipeline',
    },
    {
      id: '2',
      type: 'improvement',
      title: 'Cost optimization opportunity',
      description: `Your top 3 pipelines account for ${Math.round((parseFloat(PIPELINE_METRICS[0].cost.replace('$','')) + parseFloat(PIPELINE_METRICS[1].cost.replace('$','')) + parseFloat(PIPELINE_METRICS[2].cost.replace('$',''))) / totalCost * 100)}% of total cost. Consider reviewing compute resources.`,
      metric: `$${totalCost.toFixed(0)} total`,
      action: 'view-costs',
      actionLabel: 'View Cost Breakdown',
    },
    {
      id: '3',
      type: 'achievement',
      title: `${bestPipeline.name} is performing excellently`,
      description: `100% success rate over ${bestPipeline.runs} runs. This pipeline is a model candidate for your CI/CD templates.`,
      metric: '100% success',
      action: 'promote-template',
      actionLabel: 'Use as Template',
    },
  ];
}

interface AnalyticsState {
  period: Period;
  trendData: TrendPoint[];
  costBreakdown: CostBreakdown[];
  pipelineMetrics: PipelineMetric[];
  aiInsights: AiInsight[];

  setPeriod: (period: Period) => void;
  exportCsv: () => void;
  exportPdf: () => void;
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  period: '30D',
  trendData: TREND_DATA,
  costBreakdown: COST_BREAKDOWN,
  pipelineMetrics: PIPELINE_METRICS,
  aiInsights: computeInsights(PIPELINE_METRICS),

  setPeriod: (period) => {
    const days = period === '7D' ? 7 : period === '30D' ? 30 : period === '90D' ? 90 : 365;
    set({
      period,
      trendData: generateTrendData(days),
    });
  },

  exportCsv: () => {
    const headers = 'Pipeline,Runs,Avg Duration,Data Volume,Cost,Success Rate\n';
    const rows = PIPELINE_METRICS
      .map((p) => `${p.name},${p.runs},${p.avgDuration},${p.dataVolume},${p.cost},${p.successRate}%`)
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aiden-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  exportPdf: () => {
    // Simulated PDF export (plain text summary)
    const lines = [
      'AIDEN Analytics Report',
      `Generated: ${format(new Date(), 'PPpp')}`,
      '─────────────────────────────',
      '',
      ...PIPELINE_METRICS.map(
        (p) => `${p.name}: ${p.runs} runs, ${p.avgDuration} avg, ${p.dataVolume}, ${p.cost}, ${p.successRate}% success`
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aiden-analytics-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  },
}));
