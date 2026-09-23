import React from 'react';
import { Card } from '@/components/ui/Card';
import { PipelineMetricItem } from '../types';
import * as LucideIcons from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MetricCardProps {
  metric: PipelineMetricItem;
}

export const MetricCard: React.FC<MetricCardProps> = ({ metric }) => {
  const IconComponent =
    (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[metric.iconName] ||
    LucideIcons.Activity;

  const statusColors = {
    running: 'text-cyan-600 bg-cyan-500/10 border-cyan-500/20',
    successful: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
    failed: 'text-red-600 bg-red-500/10 border-red-500/20',
    queued: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
  };

  const isTrendUp = metric.trend.startsWith('+');

  return (
    <Card
      hoverable
      className="p-5 flex flex-col justify-between bg-card border-border hover:border-border-highlight transition-all duration-200"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          {metric.label}
        </span>
        <div
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center border',
            statusColors[metric.statusType]
          )}
        >
          <IconComponent className="w-4 h-4" />
        </div>
      </div>

      <div className="my-3">
        <div className="text-3xl font-extrabold text-text-primary font-mono tracking-tight">
          {metric.value}
        </div>
      </div>

      <div className="pt-2 border-t border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-1">
          {isTrendUp ? (
            <TrendingUp className={cn('w-3.5 h-3.5', metric.statusType === 'failed' ? 'text-red-600' : 'text-emerald-600')} />
          ) : (
            <TrendingDown className={cn('w-3.5 h-3.5', metric.statusType === 'failed' ? 'text-emerald-600' : 'text-red-600')} />
          )}
          <span
            className={cn(
              'text-xs font-semibold',
              metric.statusType === 'failed'
                ? metric.trend.startsWith('-')
                  ? 'text-emerald-600' // Decreasing failure is good!
                  : 'text-red-600'
                : 'text-emerald-600'
            )}
          >
            {metric.trend}
          </span>
        </div>
        <span className="text-[11px] text-text-muted truncate max-w-[120px]">
          {metric.description}
        </span>
      </div>
    </Card>
  );
};
