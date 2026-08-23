import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';

export type NodeStatus = 'healthy' | 'warning' | 'error' | 'critical' | 'disconnected' | 'unknown' | 'monitoring';

export interface ArchitectureNodeData {
  label: string;
  category: string;
  service: string;
  icon: string;
  status: NodeStatus;
  description?: string;
  metrics?: Record<string, string>;
  config?: Record<string, unknown>;
  [key: string]: unknown;
}

const statusConfig: Record<NodeStatus, { color: string; bg: string; border: string; label: string; pulse: string }> = {
  healthy:      { color: 'text-emerald-400', bg: 'bg-emerald-500', border: 'border-emerald-500/40', label: 'HEALTHY', pulse: '' },
  warning:      { color: 'text-amber-400',   bg: 'bg-amber-500',   border: 'border-amber-500/40',   label: 'WARNING', pulse: 'animate-pulse' },
  error:        { color: 'text-red-400',     bg: 'bg-red-500',     border: 'border-red-500/40',     label: 'ERROR',   pulse: 'animate-pulse' },
  critical:     { color: 'text-red-400',     bg: 'bg-red-500',     border: 'border-red-500/60',     label: 'CRITICAL', pulse: 'animate-pulse' },
  disconnected: { color: 'text-gray-400',    bg: 'bg-gray-500',    border: 'border-gray-500/30',    label: 'OFFLINE', pulse: '' },
  unknown:      { color: 'text-gray-400',    bg: 'bg-gray-500',    border: 'border-gray-500/30',    label: 'UNKNOWN', pulse: '' },
  monitoring:   { color: 'text-blue-400',    bg: 'bg-blue-500',    border: 'border-blue-500/40',    label: 'SYNCING', pulse: 'animate-pulse' },
};

const categoryColors: Record<string, { border: string; bg: string; accent: string }> = {
  databases:     { border: 'border-blue-500/30',    bg: 'bg-blue-500/5',    accent: 'text-blue-400' },
  streaming:     { border: 'border-cyan-500/30',    bg: 'bg-cyan-500/5',    accent: 'text-cyan-400' },
  processing:    { border: 'border-amber-500/30',   bg: 'bg-amber-500/5',   accent: 'text-amber-400' },
  storage:       { border: 'border-emerald-500/30', bg: 'bg-emerald-500/5', accent: 'text-emerald-400' },
  analytics:     { border: 'border-purple-500/30',  bg: 'bg-purple-500/5',  accent: 'text-purple-400' },
  cloud:         { border: 'border-orange-500/30',  bg: 'bg-orange-500/5',  accent: 'text-orange-400' },
  orchestration: { border: 'border-violet-500/30',  bg: 'bg-violet-500/5',  accent: 'text-violet-400' },
  ai:            { border: 'border-fuchsia-500/30', bg: 'bg-fuchsia-500/5', accent: 'text-fuchsia-400' },
  monitoring:    { border: 'border-indigo-500/30',  bg: 'bg-indigo-500/5',  accent: 'text-indigo-400' },
  security:      { border: 'border-rose-500/30',    bg: 'bg-rose-500/5',    accent: 'text-rose-400' },
  devops:        { border: 'border-teal-500/30',    bg: 'bg-teal-500/5',    accent: 'text-teal-400' },
  quality:       { border: 'border-lime-500/30',    bg: 'bg-lime-500/5',    accent: 'text-lime-400' },
  containers:    { border: 'border-sky-500/30',     bg: 'bg-sky-500/5',     accent: 'text-sky-400' },
  default:       { border: 'border-gray-500/30',    bg: 'bg-gray-500/5',    accent: 'text-gray-400' },
};

const ArchitectureNode: React.FC<NodeProps<ArchitectureNodeData>> = memo(({ data, selected }) => {
  const status = statusConfig[data.status || 'unknown'];
  const cat = categoryColors[data.category?.toLowerCase()] || categoryColors.default;

  return (
    <div
      className={`
        group relative min-w-[180px] max-w-[240px] rounded-xl border transition-all duration-200
        ${selected ? `${cat.border} ring-2 ring-purple-500/50 shadow-lg shadow-purple-500/10` : 'border-[#1F2937] hover:border-[#374155]'}
        ${cat.bg} bg-[#111827] backdrop-blur-sm
      `}
    >
      {/* Connection handles - visible on hover */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-[#1F2937] !border-2 !border-[#374155] !rounded-full opacity-0 group-hover:opacity-100 transition-opacity !-left-1.5"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-[#1F2937] !border-2 !border-[#374155] !rounded-full opacity-0 group-hover:opacity-100 transition-opacity !-right-1.5"
      />
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-[#1F2937] !border-2 !border-[#374155] !rounded-full opacity-0 group-hover:opacity-100 transition-opacity !-top-1.5"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-[#1F2937] !border-2 !border-[#374155] !rounded-full opacity-0 group-hover:opacity-100 transition-opacity !-bottom-1.5"
      />

      {/* Status indicator bar */}
      <div className={`absolute top-0 left-3 right-3 h-0.5 rounded-b ${status.bg} ${status.pulse}`} />

      <div className="p-3">
        {/* Status + Category */}
        <div className="flex items-center justify-between mb-2">
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${status.color}`}>
            {status.label}
          </span>
          <span className={`text-[10px] font-medium ${cat.accent}`}>
            {data.category}
          </span>
        </div>

        {/* Icon + Name */}
        <div className="flex items-center gap-2.5 mb-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${cat.bg} text-base`}>
            {data.icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--color-text)] truncate">{data.label}</p>
            <p className="text-[10px] text-[var(--color-text-muted)] truncate">{data.service}</p>
          </div>
        </div>

        {/* Metrics */}
        {data.metrics && Object.keys(data.metrics).length > 0 && (
          <div className="mt-2 pt-2 border-t border-[#1F2937] space-y-1">
            {Object.entries(data.metrics).slice(0, 3).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between text-[10px]">
                <span className="text-[var(--color-text-muted)] font-mono">{key}</span>
                <span className="text-[var(--color-text-secondary)] font-mono font-medium">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

ArchitectureNode.displayName = 'ArchitectureNode';

export default ArchitectureNode;
export { statusConfig, categoryColors };
