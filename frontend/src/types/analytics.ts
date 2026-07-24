export interface AnalyticsKPI {
  totalPipelines: number;
  runningPipelines: number;
  failedPipelines: number;
  successRate: number;
  totalRuns?: number;
  totalCost?: number;
  dataProcessed?: number;
}

export interface PerformancePoint {
  date: string;
  value: number;
  baseline?: number;
}

export interface CostCategory {
  name: string;
  amount: number;
  percentage: number;
  trend: 'up' | 'down' | 'neutral';
  trendValue: string;
}

export interface PipelinePerformance {
  name: string;
  id: number;
  runs: number;
  avgDuration: number;
  dataVolume: number;
  cost: number;
  successRate: number;
}
