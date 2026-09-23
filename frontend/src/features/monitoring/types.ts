/* ------------------------------------------------------------------ */
/* Infrastructure health                                               */
/* ------------------------------------------------------------------ */

export type InfraStatus = 'healthy' | 'degraded' | 'down';

export interface InfraService {
  id: string;
  name: string;
  kind: 'airflow' | 'postgres' | 'kafka' | 'spark' | 'snowflake' | 'redis';
  status: InfraStatus;
  uptimePercent: number;
  region: string;
  metrics: InfraMetric[];
  version: string;
}

export interface InfraMetric {
  label: string;
  value: string;
  trendPercent: number; // vs last hour; negative = improving for lag-type metrics
  goodDirection: 'up' | 'down';
}

/* ------------------------------------------------------------------ */
/* Time series                                                         */
/* ------------------------------------------------------------------ */

export interface SeriesPoint {
  t: string; // HH:mm label
  value: number;
}

export interface MetricSeries {
  id: string;
  label: string;
  unit: string;
  color: string;
  points: SeriesPoint[];
  threshold?: number;
}

/* ------------------------------------------------------------------ */
/* Kafka                                                               */
/* ------------------------------------------------------------------ */

export interface KafkaTopic {
  id: string;
  name: string;
  partitions: number;
  inRate: number; // msg/s
  outRate: number; // msg/s
  consumerGroups: KafkaConsumerGroup[];
  retentionHours: number;
  status: InfraStatus;
}

export interface KafkaConsumerGroup {
  id: string;
  group: string;
  lag: number;
  lagThreshold: number;
  members: number;
}

/* ------------------------------------------------------------------ */
/* Data quality                                                        */
/* ------------------------------------------------------------------ */

export interface QualityCheck {
  id: string;
  pipeline: string;
  dataset: string;
  assertion: string;
  passRate: number;
  severity: 'error' | 'warning';
  lastRunAt: string;
  status: 'passing' | 'failing' | 'flaky';
}

/* ------------------------------------------------------------------ */
/* Alerts                                                              */
/* ------------------------------------------------------------------ */

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface MonitoringAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  source: string;
  message: string;
  firedAt: string;
  acknowledged: boolean;
  actionLabel?: string;
  actionPath?: string;
}
