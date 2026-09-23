import React from 'react';
import { InfraService } from '../types';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import { CheckCircle2, TriangleAlert, XCircle, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export interface ServiceGridProps {
  services: InfraService[];
  isLoading: boolean;
}

const STATUS_META = {
  healthy: { icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />, label: 'Healthy', border: 'border-emerald-500/30' },
  degraded: { icon: <TriangleAlert className="w-4 h-4 text-amber-600" />, label: 'Degraded', border: 'border-amber-500/40' },
  down: { icon: <XCircle className="w-4 h-4 text-red-600" />, label: 'Down', border: 'border-red-500/50' },
};

const KIND_LABEL: Record<string, string> = {
  airflow: 'Orchestrator',
  postgres: 'OLTP Database',
  kafka: 'Event Streaming',
  spark: 'Compute',
  snowflake: 'Warehouse',
  redis: 'Feature Store',
};

function Trend({ percent, goodDirection }: { percent: number; goodDirection: 'up' | 'down' }) {
  if (percent === 0) return <span className="text-text-muted inline-flex items-center gap-0.5"><Minus className="w-3 h-3" />0%</span>;
  const isUp = percent > 0;
  const isGood = goodDirection === 'up' ? isUp : !isUp;
  return (
    <span className={cn('inline-flex items-center gap-0.5', isGood ? 'text-emerald-600' : 'text-red-600')}>
      {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(percent).toFixed(1)}%
    </span>
  );
}

export const ServiceGrid: React.FC<ServiceGridProps> = ({ services, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {services.map((svc) => {
        const meta = STATUS_META[svc.status];
        return (
          <div key={svc.id} className={cn('p-3.5 rounded-lg bg-card border space-y-2.5', meta.border)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {meta.icon}
                <span className="text-xs font-bold text-text-primary">{svc.name}</span>
                <span className="text-[9px] font-mono text-text-muted">v{svc.version}</span>
              </div>
              <Badge
                variant={svc.status === 'healthy' ? 'success' : svc.status === 'degraded' ? 'warning' : 'error'}
                size="sm"
                dot
                pulse={svc.status !== 'healthy'}
              >
                {meta.label}
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-[9px] font-mono text-text-muted">
              <span>{KIND_LABEL[svc.kind]}</span>
              <span>•</span>
              <span>{svc.region}</span>
              <span className="ml-auto text-emerald-600">{svc.uptimePercent}% uptime</span>
            </div>

            <div className="space-y-1">
              {svc.metrics.map((m) => (
                <div key={m.label} className="flex items-center justify-between text-[10px] p-1.5 rounded bg-card border border-border-subtle">
                  <span className="text-text-secondary">{m.label}</span>
                  <span className="flex items-center gap-1.5 font-mono font-semibold text-text-primary">
                    {m.value}
                    <Trend percent={m.trendPercent} goodDirection={m.goodDirection} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
