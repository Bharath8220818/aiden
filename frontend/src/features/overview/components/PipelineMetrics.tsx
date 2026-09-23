import React from 'react';
import { MetricCard } from './MetricCard';
import { PipelineMetricItem } from '../types';
import { Layers } from 'lucide-react';

export interface PipelineMetricsProps {
  metrics: PipelineMetricItem[];
}

export const PipelineMetrics: React.FC<PipelineMetricsProps> = ({ metrics }) => {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
            Pipeline Metrics
          </h2>
        </div>
        <span className="text-[11px] text-text-muted">
          Last 24 hours execution window
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>
    </section>
  );
};
