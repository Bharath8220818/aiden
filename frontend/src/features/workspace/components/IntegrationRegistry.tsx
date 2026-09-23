import React, { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Mail, MessageCircle, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  fetchChannelStatus,
  fetchConnectionSummaries,
  fetchWorkspaceTools,
  type ChannelStatus,
  type ConnectionSummary,
  type ToolSpecOut,
} from '../services/workspace.service';

/**
 * Integration Registry (spec §13): one glance — which warehouses are
 * connected, which communication channels are live, and which governed
 * tools this role can invoke through the Tool Registry.
 */
export const IntegrationRegistry: React.FC<{ className?: string }> = ({ className }) => {
  const [connections, setConnections] = useState<ConnectionSummary[]>([]);
  const [channels, setChannels] = useState<Record<string, ChannelStatus>>({});
  const [tools, setTools] = useState<ToolSpecOut[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [conns, chans, toolList] = await Promise.allSettled([
        fetchConnectionSummaries(),
        fetchChannelStatus(),
        fetchWorkspaceTools(),
      ]);
      if (cancelled) return;
      if (conns.status === 'fulfilled') setConnections(conns.value);
      if (chans.status === 'fulfilled') setChannels(chans.value);
      if (toolList.status === 'fulfilled') setTools(toolList.value);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const StatusDot: React.FC<{ ok: boolean; label: string }> = ({ ok, label }) => (
    <span className={cn('inline-flex items-center gap-1.5 text-xs', ok ? 'text-emerald-600' : 'text-text-muted')}>
      {ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3 h-3" />}
      {label}
    </span>
  );

  return (
    <div data-testid="integration-registry" className={cn('rounded-xl border border-border bg-card p-4 space-y-4', className)}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
        <Database className="w-3 h-3" /> Integrations
      </p>

      {/* Warehouses */}
      <div className="space-y-1.5">
        {connections.slice(0, 5).map((c) => (
          <div key={c.id} className="flex items-center justify-between">
            <span className="text-xs text-text-primary truncate">{c.providerName}</span>
            <StatusDot ok={c.status === 'connected'} label={c.status === 'connected' ? 'Connected' : c.status} />
          </div>
        ))}
        {loaded && connections.length === 0 && (
          <p className="text-[11px] text-text-muted">No warehouses connected yet.</p>
        )}
      </div>

      {/* Communication channels */}
      <div className="border-t border-border/60 pt-3 space-y-1.5">
        {[
          { key: 'email', label: 'Email (SMTP)', icon: <Mail className="w-3.5 h-3.5 text-text-secondary" /> },
          { key: 'slack', label: 'Slack', icon: <MessageCircle className="w-3.5 h-3.5 text-text-secondary" /> },
          { key: 'teams', label: 'Teams', icon: <MessageCircle className="w-3.5 h-3.5 text-text-secondary" /> },
        ].map(({ key, label, icon }) => {
          const status = channels[key];
          return (
            <div key={key} className="flex items-center justify-between">
              <span className="text-xs text-text-primary inline-flex items-center gap-1.5">{icon}{label}</span>
              <StatusDot ok={Boolean(status?.enabled)} label={status?.enabled ? 'Live' : 'Not configured'} />
            </div>
          );
        })}
      </div>

      {/* Governed tools available to this role */}
      <div className="border-t border-border/60 pt-3">
        <p className="text-[10px] text-text-muted uppercase mb-1.5">Your governed tools</p>
        <div className="flex flex-wrap gap-1.5">
          {tools.map((t) => (
            <span
              key={t.name}
              title={`${t.description} — risk: ${t.risk}, permission: ${t.permission}`}
              className={cn(
                'px-2 py-0.5 rounded-md text-[10px] font-mono border',
                t.risk === 'low'
                  ? 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10'
                  : 'border-amber-500/30 text-amber-600 bg-amber-500/10'
              )}
            >
              {t.name}
            </span>
          ))}
          {loaded && tools.length === 0 && (
            <span className="text-[11px] text-text-muted">No tools granted for this role.</span>
          )}
        </div>
      </div>
    </div>
  );
};
