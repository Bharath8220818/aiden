import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Play, Save, Download, Undo, Redo,
  Maximize2, Minimize2, Grid, ZoomIn, ZoomOut,
  MousePointer, Hand, Sparkles
} from 'lucide-react';

const nodeTypes = [
  { type: 'source', label: 'Source', items: ['PostgreSQL', 'MySQL', 'Kafka', 'S3', 'API', 'Snowflake'] },
  { type: 'transform', label: 'Transform', items: ['Filter', 'Aggregate', 'Join', 'Map', 'Clean', 'Validate'] },
  { type: 'destination', label: 'Destination', items: ['Snowflake', 'BigQuery', 'Redshift', 'S3', 'Kafka'] },
];

interface PipelineNode {
  id: string;
  name: string;
  type: string;
  category: string;
  x: number;
  y: number;
}

export default function PipelineStudioPage() {
  const [nodes, setNodes] = useState<PipelineNode[]>([
    { id: '1', name: 'PostgreSQL', type: 'source', category: 'source', x: 100, y: 200 },
    { id: '2', name: 'Filter', type: 'transform', category: 'transform', x: 400, y: 150 },
    { id: '3', name: 'Aggregate', type: 'transform', category: 'transform', x: 400, y: 280 },
    { id: '4', name: 'Snowflake', type: 'destination', category: 'destination', x: 700, y: 200 },
  ]);
  const [fullscreen, setFullscreen] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);

  const typeColors: Record<string, { bg: string; border: string; icon: string; text: string }> = {
    source: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: '🟦', text: 'text-blue-400' },
    transform: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: '🟨', text: 'text-amber-400' },
    destination: { bg: 'bg-green-500/10', border: 'border-green-500/30', icon: '🟩', text: 'text-green-400' },
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setNodes(prev => prev.map(n =>
      n.id === dragging ? { ...n, x: e.clientX - 80, y: e.clientY - 20 } : n
    ));
  }, [dragging]);

  const handleMouseUp = useCallback(() => setDragging(null), []);

  return (
    <div className={`space-y-4 ${fullscreen ? 'fixed inset-0 z-50 bg-[var(--color-background)] p-4' : ''}`}>
      {/* Toolbar */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card flex items-center justify-between p-2">
        <div className="flex items-center gap-1">
          <button className="btn-icon btn-sm"><MousePointer className="h-4 w-4" /></button>
          <button className="btn-icon btn-sm"><Hand className="h-4 w-4" /></button>
          <div className="mx-2 h-6 w-px bg-[var(--color-border)]" />
          <button className="btn-icon btn-sm"><ZoomIn className="h-4 w-4" /></button>
          <button className="btn-icon btn-sm"><ZoomOut className="h-4 w-4" /></button>
          <span className="px-2 text-xs text-[var(--color-text-muted)]">100%</span>
          <div className="mx-2 h-6 w-px bg-[var(--color-border)]" />
          <button className="btn-icon btn-sm"><Undo className="h-4 w-4" /></button>
          <button className="btn-icon btn-sm"><Redo className="h-4 w-4" /></button>
          <button className="btn-icon btn-sm"><Grid className="h-4 w-4" /></button>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary btn-sm"><Save className="h-4 w-4" /> Save</button>
          <button className="btn-primary btn-sm"><Play className="h-4 w-4" /> Run</button>
          <button className="btn-icon btn-sm"><Download className="h-4 w-4" /></button>
          <button className="btn-icon btn-sm" onClick={() => setFullscreen(!fullscreen)}>
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </motion.div>

      <div className="flex gap-4" style={{ height: fullscreen ? 'calc(100vh - 120px)' : '520px' }}>
        {/* Node Palette */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
          className="w-52 shrink-0 space-y-4 overflow-y-auto">
          {nodeTypes.map((section) => (
            <div key={section.type}>
              <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                {typeColors[section.type].icon} {section.label}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <button key={item}
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-left text-xs font-medium text-[var(--color-text-secondary)] transition-all hover:border-purple-500/30 hover:bg-purple-500/5 hover:text-[var(--color-text)]">
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button className="btn-primary w-full mt-4"><Plus className="h-4 w-4" /> Custom Node</button>
        </motion.div>

        {/* Canvas */}
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
          className="relative flex-1 overflow-hidden rounded-2xl border border-[var(--color-border)]"
          onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
          
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'linear-gradient(rgba(124,58,237,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.3) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }} />

          {/* Nodes */}
          {nodes.map((node) => {
            const colors = typeColors[node.category];
            return (
              <div key={node.id}
                className={`absolute flex items-center gap-3 rounded-xl border-2 ${colors.border} ${colors.bg} px-4 py-3 cursor-grab active:cursor-grabbing transition-shadow hover:shadow-lg hover:shadow-purple-500/20`}
                style={{ left: node.x, top: node.y }}
                onMouseDown={() => setDragging(node.id)}>
                <span className="text-lg">{colors.icon}</span>
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">{node.name}</p>
                  <p className={`text-[10px] font-medium ${colors.text}`}>{node.category}</p>
                </div>
              </div>
            );
          })}

          {/* Connection Lines */}
          <svg className="absolute inset-0 pointer-events-none">
            {nodes.slice(0, -1).map((node, i) => {
              const next = nodes[i + 1];
              return (
                <g key={i}>
                  <line x1={node.x + 80} y1={node.y + 28}
                    x2={next.x} y2={next.y + 28}
                    stroke="rgba(124, 58, 237, 0.25)"
                    strokeWidth="2" strokeDasharray="6 4" />
                  <circle cx={node.x + 80} cy={node.y + 28} r="3" fill="rgba(124, 58, 237, 0.4)" />
                  <circle cx={next.x} cy={next.y + 28} r="3" fill="rgba(6, 182, 212, 0.4)" />
                </g>
              );
            })}
          </svg>

          {/* AI Assistant */}
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <div className="glass-card flex items-center gap-3 p-2 px-4">
              <Sparkles className="h-4 w-4 text-purple-400 shrink-0" />
              <input type="text" placeholder="Describe your pipeline... e.g., 'Extract from PostgreSQL, filter by date, load to Snowflake'"
                className="flex-1 border-0 bg-transparent px-0 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:ring-0" />
              <button className="btn-primary btn-sm"><Sparkles className="h-4 w-4" /> Build</button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
