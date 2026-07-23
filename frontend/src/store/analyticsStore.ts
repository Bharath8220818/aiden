import { create } from 'zustand';
import { subDays, format } from 'date-fns';
import { analyticsApi } from '../api/analytics';
import type { AnalyticsKPI, PerformancePoint, CostCategory, PipelinePerformance, AiInsight, Period } from '../types/analytics';

// ─── Mock Data Generators (fallback when backend is unavailable) ────────
function generateTrendData(days: number): PerformancePoint[] {
  const data: PerformancePoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = format(subDays(new Date(), i), 'MMM dd');
    const base = 120 + Math.round(Math.random() * 80);
    data.push({
      date,
      runs: base,
      success: Math.round(base * (0.85 + Math.random() * 0.12)),
      failed: Math.round(base * (0.02 + Math.random() * 0.05)),
      avgDuration: Math.round((3 + Math.random() * 6) * 10) / 10,
    });
  }
  return data;
}

const MOCK_KPIS: AnalyticsKPI = {
  totalRuns: 65432,
  totalPipelines: 126,
  totalCost: 12400,
  dataProcessed: '2.4 TB',
  avgSuccessRate: 97.8,
  trend: { runs: 16.2, cost: 8.3, successRate: -1.2, dataVolume: 12.5 },
};

const MOCK_COSTS: CostCategory[] = [
  { category: 'Compute', amount: 1280, percentage: 42, trend: 'up', trendValue: '+8.2%' },
  { category: 'Storage', amount: 580, percentage: 19, trend: 'up', trendValue: '+3.1%' },
  { category: 'Data Transfer', amount: 420, percentage: 14, trend: 'down', trendValue: '-2.4%' },
  { category: 'API Calls', amount: 350, percentage: 11, trend: 'up', trendValue: '+5.7%' },
  { category: 'AI Inference', amount: 280, percentage: 9, trend: 'down', trendValue: '-1.8%' },
  { category: 'Other', amount: 150, percentage: 5, trend: 'up', trendValue: '+0.9%' },
];

const MOCK_PIPELINES: PipelinePerformance[] = [
  { id: 1, name: 'Daily Sales ETL', runs: 142, avgDuration: 4.2, dataVolume: '2.1 GB', cost: '$12.40', successRate: 98 },
  { id: 2, name: 'Customer Analytics', runs: 89, avgDuration: 2.8, dataVolume: '890 MB', cost: '$8.20', successRate: 100 },
  { id: 3, name: 'IoT Stream Pipeline', runs: 340, avgDuration: 0.5, dataVolume: '15.2 GB', cost: '$45.80', successRate: 62 },
  { id: 4, name: 'Product Inventory', runs: 28, avgDuration: 8.1, dataVolume: '450 MB', cost: '$6.50', successRate: 87 },
  { id: 5, name: 'Marketing Attribution', runs: 56, avgDuration: 3.5, dataVolume: '1.8 GB', cost: '$9.30', successRate: 95 },
];

function computeInsights(pipelines: PipelinePerformance[]): AiInsight[] {
  if (pipelines.length === 0) return [];
  const worstPipeline = pipelines.reduce((w, p) => (p.successRate < w.successRate ? p : w), pipelines[0]);
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
      description: `Your top 3 pipelines account for ${Math.round(
        (parseFloat(MOCK_PIPELINES[0].cost.replace('$', '')) +
          parseFloat(MOCK_PIPELINES[1].cost.replace('$', '')) +
          parseFloat(MOCK_PIPELINES[2].cost.replace('$', ''))) /
          totalCost *
        100
      )}% of total cost. Consider reviewing compute resources.`,
      metric: `$${totalCost.toFixed(0)} total`,
      action: 'view-costs',
      actionLabel: 'View Cost Breakdown',
    },
    {
      id: '3',
      type: 'achievement',
      title: `${bestPipeline.name} is performing excellently`,
      description: `${bestPipeline.successRate}% success rate over ${bestPipeline.runs} runs. This pipeline is a model candidate for your CI/CD templates.`,
      metric: `${bestPipeline.successRate}% success`,
      action: 'promote-template',
      actionLabel: 'Use as Template',
    },
  ];
}

// ─── Store ──────────────────────────────────────────────────────────────
interface AnalyticsState {
  period: Period;
  kpis: AnalyticsKPI | null;
  performance: PerformancePoint[];
  costs: CostCategory[];
  pipelines: PipelinePerformance[];
  aiInsights: AiInsight[];
  isLoading: boolean;
  error: string | null;
  useMockData: boolean;

  setPeriod: (period: Period) => Promise<void>;
  fetchDashboard: () => Promise<void>;
  exportReport: (format: 'csv' | 'pdf') => Promise<void>;
  clearError: () => void;
}

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  period: '30D',
  kpis: MOCK_KPIS,
  performance: generateTrendData(30),
  costs: MOCK_COSTS,
  pipelines: MOCK_PIPELINES,
  aiInsights: computeInsights(MOCK_PIPELINES),
  isLoading: false,
  error: null,
  useMockData: true,

  setPeriod: async (period) => {
    set({ period });
    await get().fetchDashboard();
  },

  fetchDashboard: async () => {
    set({ isLoading: true, error: null });
    try {
      const { period } = get();
      const data = await analyticsApi.getDashboard(period);
      set({
        kpis: data.kpis,
        performance: data.performance,
        costs: data.costs,
        pipelines: data.pipelines,
        aiInsights: computeInsights(data.pipelines),
        useMockData: false,
      });
    } catch (error: any) {
      // Fall back to mock data when backend is unavailable
      const { period } = get();
      const days = period === '7D' ? 7 : period === '30D' ? 30 : period === '90D' ? 90 : 365;
      set({
        kpis: MOCK_KPIS,
        performance: generateTrendData(days),
        costs: MOCK_COSTS,
        pipelines: MOCK_PIPELINES,
        aiInsights: computeInsights(MOCK_PIPELINES),
        useMockData: true,
        error: null, // Don't show error for mock fallback
      });
    } finally {
      set({ isLoading: false });
    }
  },

  exportReport: async (format) => {
    set({ isLoading: true, error: null });
    try {
      const { period, useMockData } = get();

      if (!useMockData) {
        const blob = await analyticsApi.exportReport(format, period);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aiden-analytics-${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'pdf'}`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
    } catch {
      // Fall through to mock export
    }

    // Mock export
    const { pipelines } = get();
    const headers = 'Pipeline,Runs,Avg Duration,Data Volume,Cost,Success Rate\n';
    const rows = pipelines
      .map((p) => `${p.name},${p.runs},${p.avgDuration} min,${p.dataVolume},${p.cost},${p.successRate}%`)
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aiden-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    set({ isLoading: false });
  },

  clearError: () => set({ error: null }),
}));
