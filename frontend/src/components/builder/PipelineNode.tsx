import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

const nodeStyles: Record<string, string> = {
  source: 'bg-blue-50 border-blue-400 text-blue-800',
  transform: 'bg-purple-50 border-purple-400 text-purple-800',
  destination: 'bg-green-50 border-green-400 text-green-800',
  default: 'bg-gray-50 border-gray-400 text-gray-800',
};

const statusColors: Record<string, string> = {
  idle: 'bg-gray-300',
  running: 'bg-yellow-400 animate-pulse',
  success: 'bg-green-500',
  error: 'bg-red-500',
};

const typeIcons: Record<string, string> = {
  source: '🗄️',
  transform: '⚙️',
  destination: '📥',
  default: '📦',
};

interface PipelineNodeData {
  label: string;
  type?: 'source' | 'transform' | 'destination' | 'default';
  description?: string;
  status?: 'idle' | 'running' | 'success' | 'error';
  records?: number;
  duration?: number;
  config?: Record<string, any>;
}

interface PipelineNodeProps {
  data: PipelineNodeData;
  selected?: boolean;
}

const PipelineNode: React.FC<PipelineNodeProps> = memo(({ data, selected }) => {
  const {
    label,
    type = 'default',
    description,
    status = 'idle',
    records,
    duration,
  } = data;

  return (
    <div
      className={`
        relative min-w-[150px] max-w-[220px] rounded-xl border-2 p-3
        transition-all duration-200
        ${nodeStyles[type] || nodeStyles.default}
        ${selected ? 'ring-2 ring-blue-500 shadow-lg scale-105' : 'shadow-md hover:shadow-lg'}
      `}
    >
      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white !rounded-full"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white !rounded-full"
      />

      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-base leading-none">{typeIcons[type]}</span>
          <span className="font-semibold text-sm truncate">{label}</span>
        </div>
        <span
          className={`shrink-0 w-2.5 h-2.5 rounded-full ${statusColors[status]}`}
          title={status}
        />
      </div>

      {/* Description */}
      {description && (
        <p className="text-[11px] text-gray-500 mt-1.5 truncate">{description}</p>
      )}

      {/* Metrics row */}
      {(records !== undefined || duration !== undefined) && (
        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-200/60">
          {records !== undefined && (
            <span className="text-[11px] text-gray-500">
              📊 {records >= 1000 ? `${(records / 1000).toFixed(1)}k` : records.toLocaleString()}
            </span>
          )}
          {duration !== undefined && (
            <span className="text-[11px] text-gray-500">
              ⏱ {duration}s
            </span>
          )}
        </div>
      )}

      {/* Status badge tag */}
      {status === 'error' && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow">
          !
        </div>
      )}
      {status === 'running' && (
        <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow animate-pulse">
          ▶
        </div>
      )}
    </div>
  );
});

PipelineNode.displayName = 'PipelineNode';

export default PipelineNode;
export type { PipelineNodeData };
