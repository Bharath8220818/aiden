import React from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { useIntegrations } from '@/features/intelligence/hooks/useIntegrations';
import { McpServerCard } from '@/features/intelligence/components/McpServerCard';
import { cn } from '@/lib/utils';
import { Plug, ShieldCheck, Zap } from 'lucide-react';

export const IntegrationsPage: React.FC = () => {
  const { servers, stats, pendingId, changeStatus, isLoading } = useIntegrations();

  return (
    <PageContainer
      title="MCP Integrations"
      description="Model Context Protocol servers exposing governed tools to every AIDEN agent"
      fullWidth
      breadcrumbs={[{ label: 'AIDEN' }, { label: 'Intelligence' }, { label: 'MCP Integrations' }]}
      actions={
        <div className="flex items-center gap-2">
          <Badge variant="ai" size="sm" dot>
            {stats.tools} tools registered
          </Badge>
          <Badge variant={stats.disconnected === 0 ? 'success' : 'warning'} size="sm" dot pulse={stats.disconnected > 0}>
            {stats.connected}/{stats.total} connected
          </Badge>
        </div>
      }
    >
      {/* Hub stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Servers', value: String(stats.total), color: 'text-text-primary' },
          { label: 'Connected', value: String(stats.connected), color: 'text-emerald-600' },
          { label: 'Degraded', value: String(stats.degraded), color: 'text-amber-600' },
          { label: 'Tools', value: String(stats.tools), color: 'text-indigo-600' },
          { label: 'Calls / 24h', value: stats.calls24h.toLocaleString(), color: 'text-cyan-600' },
        ].map((s) => (
          <div key={s.label} className="p-3 rounded-lg bg-card border border-border text-center">
            <div className={cn('text-lg font-bold font-mono', s.color)}>{s.value}</div>
            <div className="text-[9px] uppercase text-text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Governance note */}
      <div className="p-3 rounded-lg bg-card border border-border flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
        <p className="text-[11px] text-text-secondary leading-snug">
          Every tool call passes through the permission registry — agents only see servers granted to their role,
          scopes are enforced per invocation, and all arguments are written to the immutable audit trail.
        </p>
      </div>

      {/* Server grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading
          ? [0, 1, 2].map((i) => (
              <div key={i} className="h-64 rounded-lg bg-card border border-border animate-pulse" />
            ))
          : servers.map((server) => (
              <McpServerCard
                key={server.id}
                server={server}
                isPending={pendingId === server.id}
                onChangeStatus={changeStatus}
              />
            ))}
      </div>

      {!isLoading && servers.length === 0 && (
        <div className="p-8 rounded-lg border border-dashed border-border text-center">
          <Plug className="w-6 h-6 text-text-muted mx-auto mb-2" />
          <p className="text-xs text-text-muted">No MCP servers registered yet.</p>
        </div>
      )}

      <p className="text-[10px] text-text-muted font-mono flex items-center gap-1.5 justify-end">
        <Zap className="w-3 h-3" />
        registry refreshes every 30s
      </p>
    </PageContainer>
  );
};

export default IntegrationsPage;
