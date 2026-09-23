import React from 'react';
import { QualityCheck } from '../types';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import { ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react';

export interface QualityChecksPanelProps {
  checks: QualityCheck[];
  isLoading: boolean;
}

const STATUS_META = {
  passing: { icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />, badge: 'success' as const },
  failing: { icon: <ShieldAlert className="w-3.5 h-3.5 text-red-600" />, badge: 'error' as const },
  flaky: { icon: <ShieldQuestion className="w-3.5 h-3.5 text-amber-600" />, badge: 'warning' as const },
};

export const QualityChecksPanel: React.FC<QualityChecksPanelProps> = ({ checks, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {checks.map((check) => {
        const meta = STATUS_META[check.status];
        return (
          <div
            key={check.id}
            className={cn(
              'p-3 rounded-lg bg-card border transition-all',
              check.status === 'failing' ? 'border-red-500/40' : 'border-border'
            )}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 min-w-0">
                {meta.icon}
                <span className="text-[11px] font-mono font-semibold text-text-primary truncate">{check.dataset}</span>
                <Badge variant="neutral" size="sm" className="font-mono">{check.pipeline}</Badge>
              </div>
              <Badge variant={meta.badge} size="sm" dot pulse={check.status === 'failing'}>
                {check.status}
              </Badge>
            </div>
            <p className="text-[10px] text-text-secondary font-mono truncate mb-1.5">{check.assertion}</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-card border border-border-subtle overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full',
                    check.passRate >= 99 ? 'bg-emerald-500' : check.passRate >= 90 ? 'bg-amber-500' : 'bg-red-500'
                  )}
                  style={{ width: `${check.passRate}%` }}
                />
              </div>
              <span
                className={cn(
                  'text-[10px] font-mono font-bold',
                  check.passRate >= 99 ? 'text-emerald-600' : check.passRate >= 90 ? 'text-amber-600' : 'text-red-600'
                )}
              >
                {check.passRate}%
              </span>
              <Badge variant={check.severity === 'error' ? 'error' : 'warning'} size="sm">{check.severity}</Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
};
