export interface SystemHealthService {
  id: string;
  name: string;
  status: 'healthy' | 'warning' | 'error' | 'active';
  statusLabel: string;
  metric: string;
  metricLabel: string;
  iconName: string;
  latency?: string;
}

export interface PipelineMetricItem {
  id: string;
  label: string;
  value: number;
  trend: string;
  isPositive: boolean;
  description: string;
  statusType: 'running' | 'successful' | 'failed' | 'queued';
  iconName: string;
}

export interface AIInsightItem {
  id: string;
  type: 'drift' | 'optimization' | 'lag' | 'security';
  severity: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  affectedResources: string[];
  actionLabel: string;
  actionRoute?: string;
  timestamp: string;
}

export interface RecentActivityItem {
  id: string;
  time: string;
  pipeline: string;
  event: string;
  status: 'completed' | 'started' | 'warning' | 'auto_healed' | 'schema_updated' | 'failed';
  duration?: string;
  recordsProcessed?: string;
}

export interface EngineeringCycleStep {
  step: number;
  name: string;
  description: string;
  status: 'completed' | 'active' | 'queued';
  iconName: string;
  autonomousAgent: string;
}

export interface OverviewDashboardData {
  healthServices: SystemHealthService[];
  pipelineMetrics: PipelineMetricItem[];
  insights: AIInsightItem[];
  recentActivities: RecentActivityItem[];
  engineeringCycle: EngineeringCycleStep[];
}
