export interface AnalyticsKPI {
  totalRuns: number;
  totalPipelines: number;
  totalCost: number;
  dataProcessed: string;
  avgSuccessRate: number;
  trend: {
    runs: number;
    cost: number;
    successRate: number;
    dataVolume: number;
  };
}

export interface PerformancePoint {
  date: string;
  runs: number;
  success: number;
  failed: number;
  avgDuration: number;
}

export interface CostCategory {
  category: string;
  amount: number;
  percentage: number;
  trend: 'up' | 'down';
  trendValue: string;
}

export interface PipelinePerformance {
  id: number;
  name: string;
  runs: number;
  avgDuration: number;
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

export type Period = '7D' | '30D' | '90D' | '1Y';
