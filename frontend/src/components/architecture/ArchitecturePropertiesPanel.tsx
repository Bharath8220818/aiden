import React from 'react';
import {
  X, Trash2, Copy, Activity,
  Brain, BarChart3, Terminal
} from 'lucide-react';
import type { ArchitectureNodeData, NodeStatus } from './ArchitectureNode';
import { statusConfig, categoryColors } from './ArchitectureNode';

interface ArchitecturePropertiesPanelProps {
  node: { id: string; data: ArchitectureNodeData } | null;
  onClose: () => void;
  onUpdate: (id: string, data: Partial<ArchitectureNodeData>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

const STATUS_OPTIONS: { value: NodeStatus; label: string }[] = [
  { value: 'healthy', label: 'Healthy' },
  { value: 'warning', label: 'Warning' },
  { value: 'error', label: 'Error' },
  { value: 'critical', label: 'Critical' },
  { value: 'disconnected', label: 'Disconnected' },
  { value: 'unknown', label: 'Unknown' },
  { value: 'monitoring', label: 'Monitoring' },
];

const ArchitecturePropertiesPanel: React.FC<ArchitecturePropertiesPanelProps> = ({
  node,
  onClose,
  onUpdate,
  onDelete,
  onDuplicate,
}) => {
  if (!node) return null;

  const { id, data } = node;
  const cat = categoryColors[data.category?.toLowerCase()] || categoryColors.default;

  return (
    <div className="w-72 bg-[#0E131D] border-l border-[#1F2937] flex flex-col h-full shrink-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1F2937]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">{data.icon}</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--color-text)] truncate">{data.label}</p>
            <p className="text-[10px] text-[var(--color-text-muted)]">{data.service}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-white/5 text-[var(--color-text-muted)]">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Status */}
        <div className="px-4 py-3 border-b border-[#1F2937]/50">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2 block">
            Status
          </label>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map((opt) => {
              const cfg = statusConfig[opt.value];
              const isActive = data.status === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => onUpdate(id, { status: opt.value })}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border transition ${
                    isActive
                      ? `${cfg.border} ${cfg.color} bg-white/5`
                      : 'border-[#1F2937] text-[var(--color-text-muted)] hover:bg-white/5'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.bg}`} />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* General Properties */}
        <div className="px-4 py-3 border-b border-[#1F2937]/50">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2 block">
            General
          </label>
          <div className="space-y-2">
            <div>
              <label className="text-[10px] text-[var(--color-text-muted)] mb-1 block">Name</label>
              <input
                type="text"
                value={data.label}
                onChange={(e) => onUpdate(id, { label: e.target.value })}
                className="w-full rounded-lg border border-[#1F2937] bg-[#111827] px-3 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-purple-500/50"
              />
            </div>
            <div>
              <label className="text-[10px] text-[var(--color-text-muted)] mb-1 block">Service</label>
              <input
                type="text"
                value={data.service}
                onChange={(e) => onUpdate(id, { service: e.target.value })}
                className="w-full rounded-lg border border-[#1F2937] bg-[#111827] px-3 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-purple-500/50"
              />
            </div>
            <div>
              <label className="text-[10px] text-[var(--color-text-muted)] mb-1 block">Category</label>
              <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-medium border ${cat.border} ${cat.accent} ${cat.bg}`}>
                {data.category}
              </span>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="px-4 py-3 border-b border-[#1F2937]/50">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2 block">
            Metrics
          </label>
          {data.metrics && Object.keys(data.metrics).length > 0 ? (
            <div className="space-y-1.5">
              {Object.entries(data.metrics).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between text-[11px]">
                  <span className="text-[var(--color-text-muted)] font-mono">{key}</span>
                  <span className="text-[var(--color-text-secondary)] font-mono">{value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-[var(--color-text-muted)]">No metrics available</p>
          )}
        </div>

        {/* AI Suggestions */}
        <div className="px-4 py-3 border-b border-[#1F2937]/50">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2 flex items-center gap-1.5 block">
            <Brain size={10} className="text-purple-400" />
            AI Suggestions
          </label>
          <div className="space-y-1.5">
            {[
              { icon: <Activity size={10} />, text: 'Check health metrics' },
              { icon: <Terminal size={10} />, text: 'View logs' },
              { icon: <BarChart3 size={10} />, text: 'Analyze performance' },
            ].map((suggestion, i) => (
              <button
                key={i}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[#1F2937] hover:border-purple-500/30 hover:bg-purple-500/5 text-[11px] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition text-left"
              >
                <span className="text-purple-400">{suggestion.icon}</span>
                {suggestion.text}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-[#1F2937] space-y-1.5">
        <button
          onClick={() => onDuplicate(id)}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#1F2937] hover:bg-white/5 text-[11px] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition"
        >
          <Copy size={12} />
          Duplicate
        </button>
        <button
          onClick={() => onDelete(id)}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/5 text-[11px] text-red-400 hover:text-red-300 transition"
        >
          <Trash2 size={12} />
          Delete
        </button>
      </div>
    </div>
  );
};

export default ArchitecturePropertiesPanel;
