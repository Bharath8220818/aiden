import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';
import { ArchitectureNodeData } from '../types';
import { Database, Cpu, Layers, HardDrive, Download, ShieldCheck, Clock } from 'lucide-react';

const KIND_STYLES: Record<string, { border: string; icon: JSX.Element; badge: string; glow: string }> = {
  source: {
    border: 'border-emerald-500/50',
    icon: <Database className="w-3.5 h-3.5" />,
    badge: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
    glow: 'shadow-[0_0_18px_-6px_rgba(16,185,129,0.5)]',
  },
  ingestion: {
    border: 'border-cyan-500/50',
    icon: <Download className="w-3.5 h-3.5" />,
    badge: 'bg-cyan-500/15 text-cyan-600 border-cyan-500/30',
    glow: 'shadow-[0_0_18px_-6px_rgba(6,182,212,0.5)]',
  },
  processing: {
    border: 'border-indigo-500/50',
    icon: <Cpu className="w-3.5 h-3.5" />,
    badge: 'bg-indigo-500/15 text-indigo-600 border-indigo-500/30',
    glow: 'shadow-[0_0_18px_-6px_rgba(99,102,241,0.5)]',
  },
  storage: {
    border: 'border-amber-500/50',
    icon: <HardDrive className="w-3.5 h-3.5" />,
    badge: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
    glow: 'shadow-[0_0_18px_-6px_rgba(245,158,11,0.5)]',
  },
  quality: {
    border: 'border-violet-500/50',
    icon: <ShieldCheck className="w-3.5 h-3.5" />,
    badge: 'bg-violet-500/15 text-violet-600 border-violet-500/30',
    glow: 'shadow-[0_0_18px_-6px_rgba(139,92,246,0.5)]',
  },
  sink: {
    border: 'border-blue-500/50',
    icon: <Layers className="w-3.5 h-3.5" />,
    badge: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
    glow: 'shadow-[0_0_18px_-6px_rgba(59,130,246,0.5)]',
  },
  orchestration: {
    border: 'border-fuchsia-500/50',
    icon: <Clock className="w-3.5 h-3.5" />,
    badge: 'bg-fuchsia-500/15 text-fuchsia-600 border-fuchsia-500/30',
    glow: 'shadow-[0_0_18px_-6px_rgba(217,70,239,0.5)]',
  },
};

const STATUS_DOT: Record<string, string> = {
  healthy: 'bg-emerald-400',
  warning: 'bg-amber-400',
  error: 'bg-red-400',
  idle: 'bg-gray-500',
};

const ArchitectureNodeInner: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as ArchitectureNodeData;
  const style = KIND_STYLES[nodeData.kind] ?? KIND_STYLES.processing;

  return (
    <div
      className={cn(
        'w-[220px] rounded-lg border bg-card transition-all duration-150',
        style.border,
        style.glow,
        selected ? 'ring-2 ring-indigo-500/80' : 'hover:border-border-highlight'
      )}
    >
      {/* Inbound handle — sources only emit */}
      {nodeData.kind !== 'source' && (
        <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-border-highlight !border-2 !border-border-subtle" />
      )}
      {/* Outbound handle — sinks only receive */}
      {nodeData.kind !== 'sink' && (
        <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-indigo-400 !border-2 !border-border-subtle" />
      )}

      {/* Header row */}
      <div className="flex items-center justify-between gap-2 px-3 pt-2.5 pb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={cn('inline-flex items-center justify-center w-6 h-6 rounded-md border shrink-0', style.badge)}>
            {style.icon}
          </span>
          <span className="text-xs font-bold text-text-primary truncate">{nodeData.label}</span>
        </div>
        <span className={cn('w-2 h-2 rounded-full shrink-0 animate-pulse-subtle', STATUS_DOT[nodeData.status] ?? STATUS_DOT.idle)} />
      </div>

      {/* Technology line */}
      <div className="px-3 pb-1.5">
        <span className="text-[10px] font-mono text-text-secondary truncate block">{nodeData.technology}</span>
      </div>

      {/* Key metrics */}
      <div className="px-3 pb-2.5 flex flex-wrap gap-1">
        {nodeData.metrics.slice(0, 3).map((m) => (
          <span key={m.label} className="text-[9px] px-1.5 py-0.5 rounded bg-card border border-border text-text-secondary font-mono">
            {m.label}: {m.value}
          </span>
        ))}
      </div>

      {/* Attached contract summary */}
      {nodeData.contract && (
        <div className="mx-3 mb-2.5 rounded-md bg-indigo-500/10 border border-indigo-500/25 px-2 py-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono text-indigo-600 truncate">{nodeData.contract.contractId}</span>
            <span className="text-[9px] font-bold text-indigo-200/90 shrink-0">v{nodeData.contract.version}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[9px] text-text-secondary font-mono">{nodeData.contract.rowsPerDay}</span>
            <span className="text-[9px] text-text-muted">•</span>
            <span className="text-[9px] text-text-secondary">{nodeData.contract.schemaFields} fields</span>
          </div>
        </div>
      )}
    </div>
  );
};

export const ArchitectureNode = memo(ArchitectureNodeInner);
