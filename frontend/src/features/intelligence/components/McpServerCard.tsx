import React from 'react';
import { McpServer, McpServerStatus, McpTool } from '../types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { Plug, PlugZap, Wrench, Loader2, Zap } from 'lucide-react';

export interface McpServerCardProps {
  server: McpServer;
  isPending: boolean;
  onChangeStatus: (server: McpServer, status: McpServerStatus) => void;
}

const TOOL_SCOPES: Record<string, string> = {
  read: 'text-blue-600 bg-blue-500/10 border-blue-500/30',
  write: 'text-amber-600 bg-amber-500/10 border-amber-500/30',
  admin: 'text-red-600 bg-red-500/10 border-red-500/30',
};

function ToolRow({ tool }: { tool: McpTool }) {
  return (
    <div className="flex items-center justify-between gap-2 p-2 rounded-md bg-background border border-border-subtle">
      <div className="flex items-center gap-2 min-w-0">
        <Wrench className="w-3 h-3 text-text-muted shrink-0" />
        <div className="min-w-0">
          <div className="text-[10px] font-mono font-semibold text-text-primary truncate">{tool.name}</div>
          <div className="text-[9px] text-text-muted truncate">{tool.description}</div>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {tool.scopes.map((s) => (
          <span key={s} className={cn('text-[8px] px-1 py-0.5 rounded border font-bold uppercase', TOOL_SCOPES[s])}>
            {s}
          </span>
        ))}
        <span className="text-[9px] font-mono text-text-muted w-16 text-right">
          {tool.calls24h}× / {tool.avgLatencyMs}ms
        </span>
      </div>
    </div>
  );
}

export const McpServerCard: React.FC<McpServerCardProps> = ({ server, isPending, onChangeStatus }) => {
  const totalCalls = server.tools.reduce((s, t) => s + t.calls24h, 0);

  return (
    <div
      className={cn(
        'p-4 rounded-lg bg-card border space-y-3',
        server.status === 'connected'
          ? 'border-emerald-500/30'
          : server.status === 'degraded'
          ? 'border-amber-500/40'
          : 'border-border opacity-75'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              'p-2 rounded-lg border shrink-0',
              server.status === 'connected'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
                : server.status === 'degraded'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-600'
                : 'bg-card border-border text-text-muted'
            )}
          >
            <Plug className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-text-primary truncate">{server.name}</h3>
            <p className="text-[9px] font-mono text-text-muted truncate">{server.endpoint}</p>
          </div>
        </div>
        <Badge
          variant={server.status === 'connected' ? 'success' : server.status === 'degraded' ? 'warning' : 'neutral'}
          size="sm"
          dot
          pulse={server.status === 'degraded'}
        >
          {server.status}
        </Badge>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap text-[9px]">
        <Badge variant="neutral" size="sm" className="font-mono">{server.transport.toUpperCase()}</Badge>
        <Badge variant="neutral" size="sm" className="font-mono">{server.authMode.replace('_', ' ')}</Badge>
        <Badge variant="ai" size="sm">{server.tools.length} tools</Badge>
        <span className="text-text-muted font-mono ml-auto flex items-center gap-1">
          <Zap className="w-3 h-3" />
          {totalCalls.toLocaleString()} calls/24h
        </span>
      </div>

      <div className="space-y-1">
        {server.tools.map((tool) => (
          <ToolRow key={tool.name} tool={tool} />
        ))}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-border-subtle">
        <span className="text-[9px] text-text-muted font-mono">
          synced {new Date(server.lastSyncAt).toLocaleTimeString()} · agents: {server.toolsAllowedFor.slice(0, 3).join(', ')}
          {server.toolsAllowedFor.length > 3 ? ` +${server.toolsAllowedFor.length - 3}` : ''}
        </span>
        <Button
          variant={server.status === 'disconnected' ? 'primary' : 'danger'}
          size="sm"
          onClick={() => onChangeStatus(server, server.status === 'disconnected' ? 'connected' : 'disconnected')}
          isLoading={isPending}
          leftIcon={server.status === 'disconnected' ? <PlugZap className="w-3.5 h-3.5" /> : <Loader2 className="w-3.5 h-3.5" />}
          className="text-[10px] h-6"
        >
          {server.status === 'disconnected' ? 'Connect' : 'Disconnect'}
        </Button>
      </div>
    </div>
  );
};
