import React from 'react';
import { KafkaTopic } from '../types';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import { Radio, Users } from 'lucide-react';

export interface KafkaLagPanelProps {
  topics: KafkaTopic[];
  isLoading: boolean;
}

export const KafkaLagPanel: React.FC<KafkaLagPanelProps> = ({ topics, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {topics.map((topic) => {
        return (
          <div key={topic.id} className="p-3.5 rounded-lg bg-card border border-border space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Radio className={cn('w-3.5 h-3.5 shrink-0', topic.status === 'degraded' ? 'text-amber-600' : 'text-emerald-600')} />
                <span className="text-xs font-bold font-mono text-text-primary truncate">{topic.name}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge variant="neutral" size="sm" className="font-mono">{topic.partitions} partitions</Badge>
                <Badge variant={topic.status === 'degraded' ? 'warning' : 'success'} size="sm" dot pulse={topic.status === 'degraded'}>
                  {topic.status}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-4 text-[10px] font-mono text-text-secondary">
              <span>
                in <span className="text-emerald-600 font-bold">{topic.inRate.toLocaleString()}</span> msg/s
              </span>
              <span>
                out <span className="text-cyan-600 font-bold">{topic.outRate.toLocaleString()}</span> msg/s
              </span>
              <span className="hidden sm:inline">retention {Math.round(topic.retentionHours / 24)}d</span>
            </div>

            {topic.consumerGroups.map((cg) => {
              const pct = Math.min(100, Math.round((cg.lag / cg.lagThreshold) * 100));
              const danger = pct >= 80;
              return (
                <div key={cg.id} className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-1.5 font-mono text-text-secondary">
                      <Users className="w-3 h-3" />
                      {cg.group} ({cg.members} members)
                    </span>
                    <span className={cn('font-mono font-bold', danger ? 'text-red-600' : pct >= 50 ? 'text-amber-600' : 'text-emerald-600')}>
                      lag {cg.lag.toLocaleString()} / {cg.lagThreshold.toLocaleString()} ({pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-card border border-border-subtle overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', danger ? 'bg-red-500' : pct >= 50 ? 'bg-amber-500' : 'bg-emerald-500')}
                      style={{ width: `${Math.max(3, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
