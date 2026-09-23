import React from 'react';
import { DataConnection } from '../types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  Database,
  HardDrive,
  Radio,
  Cpu,
  Cloud,
  Pencil,
  PlugZap,
  Trash2,
  Loader2,
  GitBranch,
  Table2,
  BarChart3,
  AlertTriangle,
} from 'lucide-react';

export interface ConnectionCardProps {
  connection: DataConnection;
  isTesting: boolean;
  onEdit: () => void;
  onTest: () => void;
  onDelete: () => void;
}

const CATEGORY_ICON = {
  warehouse: <HardDrive className="w-4 h-4" />,
  database: <Database className="w-4 h-4" />,
  streaming: <Radio className="w-4 h-4" />,
  compute: <Cpu className="w-4 h-4" />,
  cloud: <Cloud className="w-4 h-4" />,
};

const CATEGORY_ACCENT = {
  warehouse: 'text-cyan-600 bg-cyan-500/10 border-cyan-500/30',
  database: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30',
  streaming: 'text-amber-600 bg-amber-500/10 border-amber-500/30',
  compute: 'text-violet-600 bg-violet-500/10 border-violet-500/30',
  cloud: 'text-blue-600 bg-blue-500/10 border-blue-500/30',
};

const STATUS_VARIANT = {
  connected: { variant: 'success' as const, label: 'Connected' },
  degraded: { variant: 'warning' as const, label: 'Degraded' },
  disconnected: { variant: 'error' as const, label: 'Disconnected' },
  testing: { variant: 'ai' as const, label: 'Testing…' },
};

const ENV_DOT = {
  production: 'bg-red-400',
  staging: 'bg-amber-400',
  development: 'bg-emerald-400',
};

export const ConnectionCard: React.FC<ConnectionCardProps> = ({
  connection,
  isTesting,
  onEdit,
  onTest,
  onDelete,
}) => {
  const status = STATUS_VARIANT[isTesting ? 'testing' : connection.status];

  return (
    <Card className="p-4 bg-card border-border hover:border-border-highlight transition-all">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <span className={cn('p-2 rounded-lg border shrink-0', CATEGORY_ACCENT[connection.category])}>
            {CATEGORY_ICON[connection.category]}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs font-bold text-text-primary truncate">{connection.name}</h3>
              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', ENV_DOT[connection.environment])} title={connection.environment} />
            </div>
            <p className="text-[10px] font-mono text-text-muted truncate mt-0.5">{connection.host}{connection.port ? `:${connection.port}` : ''}</p>
          </div>
        </div>
        <Badge variant={status.variant} size="sm" dot pulse={isTesting}>
          {status.label}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="p-2 rounded-md bg-card border border-border-subtle text-center">
          <div className="flex items-center justify-center gap-1 text-sm font-bold text-text-primary font-mono">
            <GitBranch className="w-3 h-3 text-indigo-600" />
            {connection.stats.pipelinesUsing}
          </div>
          <div className="text-[9px] uppercase text-text-muted">Pipelines</div>
        </div>
        <div className="p-2 rounded-md bg-card border border-border-subtle text-center">
          <div className="flex items-center justify-center gap-1 text-sm font-bold text-text-primary font-mono">
            <Table2 className="w-3 h-3 text-cyan-600" />
            {connection.stats.tablesIntrospected}
          </div>
          <div className="text-[9px] uppercase text-text-muted">Tables</div>
        </div>
        <div className="p-2 rounded-md bg-card border border-border-subtle text-center">
          <div className="flex items-center justify-center gap-1 text-sm font-bold text-text-primary font-mono">
            <BarChart3 className="w-3 h-3 text-emerald-600" />
            {connection.stats.monthlyQueryCount >= 1000
              ? `${Math.round(connection.stats.monthlyQueryCount / 1000)}k`
              : connection.stats.monthlyQueryCount}
          </div>
          <div className="text-[9px] uppercase text-text-muted">Queries/mo</div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[10px] text-text-secondary mb-2">
        <Badge variant="neutral" size="sm" className="font-mono">{connection.providerName}</Badge>
        <Badge variant="neutral" size="sm" className="font-mono">{connection.authType.replace('_', ' ')}</Badge>
        {connection.sslEnabled ? (
          <Badge variant="success" size="sm">SSL</Badge>
        ) : (
          <Badge variant="warning" size="sm">No TLS</Badge>
        )}
        {connection.latencyMs !== null && <span className="font-mono ml-auto">{connection.latencyMs} ms</span>}
      </div>

      {connection.lastError && (
        <div className="flex items-start gap-1.5 p-2 rounded-md bg-amber-500/10 border border-amber-500/30 mb-2">
          <AlertTriangle className="w-3 h-3 text-amber-600 mt-0.5 shrink-0" />
          <span className="text-[10px] text-amber-600 leading-snug">{connection.lastError}</span>
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <span className="text-[9px] text-text-muted font-mono">checked {new Date(connection.lastCheckedAt).toLocaleTimeString()}</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onTest} disabled={isTesting} title="Run health check" className="w-7 h-7">
            {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlugZap className="w-3.5 h-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={onEdit} title="Edit connection" className="w-7 h-7">
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} title="Delete connection" className="w-7 h-7 hover:text-red-600">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
