import React from 'react';
import { MonitoringAlert, AlertSeverity } from '../types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { AlertOctagon, TriangleAlert, Info, Check, ExternalLink } from 'lucide-react';

export interface AlertsFeedProps {
  alerts: MonitoringAlert[];
  acknowledgingId: string | null;
  onAcknowledge: (id: string) => void;
  isLoading: boolean;
}

const SEVERITY_META: Record<AlertSeverity, { icon: JSX.Element; bg: string; border: string; text: string; badge: 'error' | 'warning' | 'info' }> = {
  critical: {
    icon: <AlertOctagon className="w-4 h-4" />,
    bg: 'bg-red-500/10',
    border: 'border-red-500/40',
    text: 'text-red-600',
    badge: 'error',
  },
  warning: {
    icon: <TriangleAlert className="w-4 h-4" />,
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/40',
    text: 'text-amber-600',
    badge: 'warning',
  },
  info: {
    icon: <Info className="w-4 h-4" />,
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/40',
    text: 'text-blue-600',
    badge: 'info',
  },
};

export const AlertsFeed: React.FC<AlertsFeedProps> = ({ alerts, acknowledgingId, onAcknowledge, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  const sorted = [...alerts].sort((a, b) => {
    const rank = { critical: 0, warning: 1, info: 2 };
    if (a.acknowledged !== b.acknowledged) return a.acknowledged ? 1 : -1;
    return rank[a.severity] - rank[b.severity];
  });

  return (
    <div className="space-y-2">
      {sorted.map((alert) => {
        const meta = SEVERITY_META[alert.severity];
        return (
          <div
            key={alert.id}
            className={cn(
              'p-3 rounded-lg border space-y-1.5 transition-all',
              meta.bg,
              meta.border,
              alert.acknowledged && 'opacity-55'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 min-w-0">
                <span className={cn('mt-0.5 shrink-0', meta.text)}>{meta.icon}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-text-primary">{alert.title}</span>
                    <Badge variant={meta.badge} size="sm">{alert.severity}</Badge>
                  </div>
                  <p className="text-[10px] text-text-secondary leading-snug mt-0.5">{alert.message}</p>
                  <span className="text-[9px] font-mono text-text-muted block mt-1">
                    {alert.source} · {new Date(alert.firedAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5 shrink-0">
                {alert.acknowledged ? (
                  <Badge variant="neutral" size="sm">
                    <Check className="w-3 h-3 mr-0.5" /> Acked
                  </Badge>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAcknowledge(alert.id)}
                    isLoading={acknowledgingId === alert.id}
                    className="text-[10px] h-6"
                  >
                    Acknowledge
                  </Button>
                )}
                {alert.actionPath && (
                  <Link
                    to={alert.actionPath}
                    className="flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-200 transition-colors"
                  >
                    {alert.actionLabel}
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
