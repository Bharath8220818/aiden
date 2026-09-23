import React from 'react';
import { ArchitectureFlowNode } from '../types';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { Trash2, Settings2, X } from 'lucide-react';

export interface NodeInspectorProps {
  node: ArchitectureFlowNode | null;
  onUpdateNode: (nodeId: string, patch: Partial<ArchitectureFlowNode['data']>) => void;
  onDeleteNode: () => void;
  onClose: () => void;
}

export const NodeInspector: React.FC<NodeInspectorProps> = ({
  node,
  onUpdateNode,
  onDeleteNode,
  onClose,
}) => {
  if (!node) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 pt-4 pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">Inspector</h3>
        </div>
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center space-y-2">
            <div className="mx-auto w-10 h-10 rounded-xl bg-card-hover border border-border flex items-center justify-center text-text-muted">
              <Settings2 className="w-5 h-5" />
            </div>
            <p className="text-xs text-text-secondary">Select a node on the canvas to inspect and edit its properties.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">Node Inspector</h3>
          <button onClick={onClose} className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-card-active transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Label */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Label</label>
          <Input
            value={node.data.label}
            onChange={(e) => onUpdateNode(node.id, { label: e.target.value })}
            className="text-xs"
          />
        </div>

        {/* Technology */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Technology</label>
          <Input
            value={node.data.technology}
            onChange={(e) => onUpdateNode(node.id, { technology: e.target.value })}
            className="text-xs font-mono"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Description</label>
          <textarea
            value={node.data.description}
            onChange={(e) => onUpdateNode(node.id, { description: e.target.value })}
            rows={3}
            className="w-full bg-card text-text-primary text-xs rounded-md border border-border px-3 py-2 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/80 resize-none"
          />
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Health Status</label>
          <div className="grid grid-cols-4 gap-1.5">
            {(['healthy', 'warning', 'error', 'idle'] as const).map((status) => (
              <button
                key={status}
                onClick={() => onUpdateNode(node.id, { status })}
                className={cn(
                  'text-[10px] py-1.5 rounded-md border capitalize transition-all font-medium',
                  node.data.status === status
                    ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-600'
                    : 'bg-card border-border text-text-secondary hover:border-border-highlight'
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Contract binding */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Data Contract Binding</label>
          {node.data.contract ? (
            <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/25 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-indigo-600 truncate">{node.data.contract.contractId}</span>
                <Badge variant="ai" size="sm">v{node.data.contract.version}</Badge>
              </div>
              <div className="flex items-center justify-between text-[10px] text-text-secondary">
                <span className="font-mono">{node.data.contract.rowsPerDay}</span>
                <span>{node.data.contract.schemaFields} fields</span>
              </div>
              <button
                onClick={() => onUpdateNode(node.id, { contract: undefined })}
                className="text-[10px] text-red-600 hover:text-red-600 transition-colors"
              >
                Unbind contract
              </button>
            </div>
          ) : (
            <button
              onClick={() =>
                onUpdateNode(node.id, {
                  contract: {
                    contractId: 'ANALYTICS_PROD.MART_ORDERS',
                    version: '1.2.0',
                    rowsPerDay: '2.4M/day',
                    schemaFields: 8,
                  },
                })
              }
              className="w-full py-2 text-[11px] rounded-md border border-dashed border-border-highlight text-text-secondary hover:border-indigo-500/50 hover:text-indigo-600 transition-all"
            >
              + Bind ODCS contract
            </button>
          )}
        </div>

        {/* Metrics */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Metrics</label>
          <div className="space-y-1.5">
            {node.data.metrics.map((metric, idx) => (
              <div key={idx} className="grid grid-cols-2 gap-1.5">
                <Input
                  value={metric.label}
                  onChange={(e) => {
                    const metrics = [...node.data.metrics];
                    metrics[idx] = { ...metric, label: e.target.value };
                    onUpdateNode(node.id, { metrics });
                  }}
                  className="text-[11px]"
                  placeholder="Label"
                />
                <Input
                  value={metric.value}
                  onChange={(e) => {
                    const metrics = [...node.data.metrics];
                    metrics[idx] = { ...metric, value: e.target.value };
                    onUpdateNode(node.id, { metrics });
                  }}
                  className="text-[11px]"
                  placeholder="Value"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="p-4 border-t border-border">
        <Button variant="danger" size="sm" onClick={onDeleteNode} leftIcon={<Trash2 className="w-3.5 h-3.5" />} className="w-full text-xs">
          Delete node
        </Button>
      </div>
    </div>
  );
};
