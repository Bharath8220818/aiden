import React from 'react';
import {
  MousePointer2, Hand, Plus, Link2, Type, Square, MessageSquare,
  Undo2, Redo2, LayoutGrid, Grid3X3,
  ZoomIn, ZoomOut, Scan
} from 'lucide-react';

type Tool = 'select' | 'pan' | 'add' | 'connect' | 'text' | 'group' | 'comment';

interface ArchitectureToolbarProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  onUndo: () => void;
  onRedo: () => void;
  onAutoLayout: () => void;
  onFitView: () => void;
  onToggleGrid: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;

  showGrid: boolean;
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
}

const tools: { id: Tool; icon: React.ReactNode; label: string; shortcut: string }[] = [
  { id: 'select', icon: <MousePointer2 size={14} />, label: 'Select', shortcut: 'V' },
  { id: 'pan', icon: <Hand size={14} />, label: 'Pan', shortcut: 'H' },
  { id: 'add', icon: <Plus size={14} />, label: 'Add Node', shortcut: 'N' },
  { id: 'connect', icon: <Link2 size={14} />, label: 'Connect', shortcut: 'C' },
  { id: 'text', icon: <Type size={14} />, label: 'Text', shortcut: 'T' },
  { id: 'group', icon: <Square size={14} />, label: 'Group', shortcut: 'G' },
  { id: 'comment', icon: <MessageSquare size={14} />, label: 'Comment', shortcut: 'M' },
];

const ArchitectureToolbar: React.FC<ArchitectureToolbarProps> = ({
  activeTool,
  onToolChange,
  onUndo,
  onRedo,
  onAutoLayout,
  onFitView,
  onToggleGrid,
  onZoomIn,
  onZoomOut,
  showGrid,
  zoom,
  canUndo,
  canRedo,
}) => {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
      <div className="flex items-center gap-1 rounded-xl border border-[#1F2937] bg-[#0E131D]/95 backdrop-blur-md shadow-xl shadow-black/30 px-2 py-1.5">
        {/* Drawing tools */}
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            title={`${tool.label} (${tool.shortcut})`}
            className={`relative flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
              activeTool === tool.id
                ? 'bg-purple-500/20 text-purple-400 shadow-sm shadow-purple-500/10'
                : 'text-[var(--color-text-muted)] hover:bg-white/5 hover:text-[var(--color-text-secondary)]'
            }`}
          >
            {tool.icon}
            {activeTool === tool.id && (
              <div className="absolute inset-0 rounded-lg border border-purple-500/30" />
            )}
          </button>
        ))}

        {/* Divider */}
        <div className="w-px h-5 bg-[#1F2937] mx-1" />

        {/* Undo / Redo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-white/5 hover:text-[var(--color-text-secondary)] disabled:opacity-30 transition"
        >
          <Undo2 size={14} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-white/5 hover:text-[var(--color-text-secondary)] disabled:opacity-30 transition"
        >
          <Redo2 size={14} />
        </button>

        <div className="w-px h-5 bg-[#1F2937] mx-1" />

        {/* Auto Layout */}
        <button
          onClick={onAutoLayout}
          title="Auto Layout (L)"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-white/5 hover:text-[var(--color-text-secondary)] transition"
        >
          <LayoutGrid size={14} />
        </button>

        {/* Grid */}
        <button
          onClick={onToggleGrid}
          title="Toggle Grid (G)"
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
            showGrid
              ? 'bg-purple-500/20 text-purple-400'
              : 'text-[var(--color-text-muted)] hover:bg-white/5 hover:text-[var(--color-text-secondary)]'
          }`}
        >
          <Grid3X3 size={14} />
        </button>

        {/* Fit View */}
        <button
          onClick={onFitView}
          title="Fit View (F)"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-white/5 hover:text-[var(--color-text-secondary)] transition"
        >
          <Scan size={14} />
        </button>

        <div className="w-px h-5 bg-[#1F2937] mx-1" />

        {/* Zoom */}
        <button
          onClick={onZoomOut}
          title="Zoom Out"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-white/5 hover:text-[var(--color-text-secondary)] transition"
        >
          <ZoomOut size={12} />
        </button>
        <span className="w-10 text-center text-[10px] font-mono text-[var(--color-text-muted)] select-none">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={onZoomIn}
          title="Zoom In"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-white/5 hover:text-[var(--color-text-secondary)] transition"
        >
          <ZoomIn size={12} />
        </button>
      </div>
    </div>
  );
};

export default ArchitectureToolbar;
