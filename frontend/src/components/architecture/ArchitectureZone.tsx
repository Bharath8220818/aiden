import React, { memo, useState, useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { ChevronDown, ChevronRight, GripVertical } from 'lucide-react';

export interface ZoneData {
  label: string;
  color: string;       // tailwind border/bg color prefix, e.g. 'blue', 'cyan', 'amber'
  collapsed: boolean;
  nodeCount?: number;
  description?: string;
  [key: string]: unknown;
}

const zoneColorMap: Record<string, { border: string; bg: string; headerBg: string; text: string; handle: string }> = {
  blue:    { border: 'border-blue-500/30',    bg: 'bg-blue-500/5',    headerBg: 'bg-blue-500/10',    text: 'text-blue-400',    handle: 'bg-blue-500' },
  cyan:    { border: 'border-cyan-500/30',    bg: 'bg-cyan-500/5',    headerBg: 'bg-cyan-500/10',    text: 'text-cyan-400',    handle: 'bg-cyan-500' },
  amber:   { border: 'border-amber-500/30',   bg: 'bg-amber-500/5',   headerBg: 'bg-amber-500/10',   text: 'text-amber-400',   handle: 'bg-amber-500' },
  violet:  { border: 'border-violet-500/30',  bg: 'bg-violet-500/5',  headerBg: 'bg-violet-500/10',  text: 'text-violet-400',  handle: 'bg-violet-500' },
  emerald: { border: 'border-emerald-500/30', bg: 'bg-emerald-500/5', headerBg: 'bg-emerald-500/10', text: 'text-emerald-400', handle: 'bg-emerald-500' },
  purple:  { border: 'border-purple-500/30',  bg: 'bg-purple-500/5',  headerBg: 'bg-purple-500/10',  text: 'text-purple-400',  handle: 'bg-purple-500' },
  rose:    { border: 'border-rose-500/30',    bg: 'bg-rose-500/5',    headerBg: 'bg-rose-500/10',    text: 'text-rose-400',    handle: 'bg-rose-500' },
  orange:  { border: 'border-orange-500/30',  bg: 'bg-orange-500/5',  headerBg: 'bg-orange-500/10',  text: 'text-orange-400',  handle: 'bg-orange-500' },
  gray:    { border: 'border-gray-500/30',    bg: 'bg-gray-500/5',    headerBg: 'bg-gray-500/10',    text: 'text-gray-400',    handle: 'bg-gray-500' },
};

const ArchitectureZone: React.FC<NodeProps<ZoneData>> = memo(({ data, selected }) => {
  const colors = zoneColorMap[data.color] || zoneColorMap.gray;
  const [isCollapsed, setIsCollapsed] = useState(data.collapsed ?? false);

  const toggleCollapse = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCollapsed((prev) => !prev);
    // Update node data so ReactFlow persists the collapse state
    data.collapsed = !isCollapsed;
  }, [isCollapsed, data]);

  return (
    <div
      className={`
        relative rounded-xl border-2 border-dashed transition-all duration-200
        ${colors.border} ${colors.bg}
        ${selected ? 'ring-2 ring-purple-500/40 shadow-lg shadow-purple-500/10' : ''}
        ${isCollapsed ? 'min-w-[200px]' : 'min-w-[400px] min-h-[200px]'}
      `}
      style={{ width: isCollapsed ? 200 : undefined, height: isCollapsed ? 'auto' : undefined }}
    >
      {/* Connection handles */}
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-[#1F2937] !border-2 !border-[#374155] !rounded-full opacity-0 group-hover:opacity-100 transition-opacity !-left-1.5" />
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-[#1F2937] !border-2 !border-[#374155] !rounded-full opacity-0 group-hover:opacity-100 transition-opacity !-right-1.5" />

      {/* Zone header */}
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-t-xl ${colors.headerBg} cursor-move select-none`}
        onClick={toggleCollapse}
      >
        <GripVertical size={12} className={`${colors.text} opacity-50`} />
        <span className={`text-xs font-bold uppercase tracking-wider ${colors.text}`}>
          {data.label}
        </span>
        {data.nodeCount !== undefined && (
          <span className={`text-[10px] ${colors.text} opacity-60`}>
            {data.nodeCount} components
          </span>
        )}
        <div className="flex-1" />
        {data.description && (
          <span className="text-[10px] text-[var(--color-text-muted)] max-w-[200px] truncate">
            {data.description}
          </span>
        )}
        <button className={`p-0.5 rounded hover:bg-white/5 ${colors.text}`}>
          {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {/* Zone body - renders child nodes when expanded */}
      {!isCollapsed && (
        <div className="relative p-4 min-h-[160px]">
          {data.nodeCount === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-xs text-[var(--color-text-muted)] opacity-50">Drop components here</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

ArchitectureZone.displayName = 'ArchitectureZone';

export default ArchitectureZone;
export { zoneColorMap };
