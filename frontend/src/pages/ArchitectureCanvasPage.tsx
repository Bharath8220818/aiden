import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Database, Brain, Share2, Download, Zap,
  Monitor, Globe, Activity,
  Plus, Search, Sparkles, Minus, RotateCcw
} from 'lucide-react';

const cloudComponents = [
  { category: 'Sources', items: ['Database', 'API', 'Kafka', 'S3', 'IoT'] },
  { category: 'Compute', items: ['Lambda', 'Fargate', 'EC2', 'K8s'] },
  { category: 'Storage', items: ['S3', 'Snowflake', 'Redshift', 'BigQuery'] },
  { category: 'Streaming', items: ['Kafka', 'Kinesis', 'Pub/Sub', 'Event Hub'] },
  { category: 'AI/ML', items: ['SageMaker', 'Vertex AI', 'Bedrock'] },
];

function BarChart3Icon(props: React.SVGProps<SVGSVGElement>) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="12" width="4" height="8" rx="1"/><rect x="10" y="6" width="4" height="14" rx="1"/><rect x="17" y="2" width="4" height="18" rx="1"/></svg>;
}

export default function ArchitectureCanvasPage() {
  const [zoom, setZoom] = useState(100);
  const [canvasItems, setCanvasItems] = useState([
    { id: '1', name: 'Mobile Apps', type: 'source' as const, x: 60, y: 180 },
    { id: '2', name: 'Event Hub', type: 'streaming' as const, x: 320, y: 180 },
    { id: '3', name: 'Stream Analytics', type: 'processing' as const, x: 580, y: 180 },
    { id: '4', name: 'KQL Database', type: 'storage' as const, x: 840, y: 120 },
    { id: '5', name: 'Lakehouse', type: 'storage' as const, x: 840, y: 240 },
    { id: '6', name: 'Power BI', type: 'analytics' as const, x: 1100, y: 180 },
  ]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    const item = canvasItems.find(i => i.id === id);
    if (!item) return;
    setDragging(id);
    setDragOffset({ x: e.clientX - item.x, y: e.clientY - item.y });
  }, [canvasItems]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setCanvasItems(prev => prev.map(item =>
      item.id === dragging
        ? { ...item, x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y }
        : item
    ));
  }, [dragging, dragOffset]);

  const handleMouseUp = useCallback(() => setDragging(null), []);

  const typeColors: Record<string, string> = {
    source: 'border-purple-500/30 bg-purple-500/10',
    streaming: 'border-cyan-500/30 bg-cyan-500/10',
    processing: 'border-amber-500/30 bg-amber-500/10',
    storage: 'border-green-500/30 bg-green-500/10',
    analytics: 'border-blue-500/30 bg-blue-500/10',
  };

  const typeIcons: Record<string, React.ReactNode> = {
    source: <Monitor className="h-5 w-5 text-purple-400" />,
    streaming: <Activity className="h-5 w-5 text-cyan-400" />,
    processing: <Zap className="h-5 w-5 text-amber-400" />,
    storage: <Database className="h-5 w-5 text-green-400" />,
    analytics: <BarChart3Icon className="h-5 w-5 text-blue-400" />,
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-[var(--color-text)]">🏗️ Architecture Canvas</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Design cloud architectures visually — drag components, connect services, and let AI build the config
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button className="btn-secondary btn-sm"><Plus className="h-4 w-4" /> Add Component</button>
          <button className="btn-secondary btn-sm"><Share2 className="h-4 w-4" /> Connect</button>
          <button className="btn-secondary btn-sm"><Download className="h-4 w-4" /> Export PNG</button>
          <button className="btn-secondary btn-sm"><Globe className="h-4 w-4" /> Terraform</button>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-icon btn-sm" onClick={() => setZoom(z => Math.min(z + 10, 200))}><Plus className="h-4 w-4" /></button>
          <span className="w-12 text-center text-xs font-medium text-[var(--color-text-secondary)]">{zoom}%</span>
          <button className="btn-icon btn-sm" onClick={() => setZoom(z => Math.max(z - 10, 25))}><Minus className="h-4 w-4" /></button>
          <button className="btn-icon btn-sm" onClick={() => setZoom(100)}><RotateCcw className="h-4 w-4" /></button>
          <button className="btn-primary btn-sm"><Brain className="h-4 w-4" /> AI Optimize</button>
        </div>
      </motion.div>

      <div className="flex gap-4">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
          className="w-56 shrink-0 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input type="text" placeholder="Search components..." className="input pl-9 py-2 text-xs" />
          </div>
          {cloudComponents.map((group) => (
            <div key={group.category}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{group.category}</h3>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <button key={item}
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-left text-xs font-medium text-[var(--color-text-secondary)] transition-all hover:border-purple-500/30 hover:bg-purple-500/5 hover:text-[var(--color-text)]">
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
          className="relative flex-1 overflow-hidden rounded-2xl border border-[var(--color-border)]" style={{ height: '600px' }}
          ref={canvasRef} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
          
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'linear-gradient(rgba(124,58,237,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.3) 1px, transparent 1px)',
            backgroundSize: `${32 * zoom / 100}px ${32 * zoom / 100}px`,
          }} />

          <div className="absolute left-4 top-4 z-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]/80 backdrop-blur-sm px-4 py-3">
            <h4 className="mb-2 text-xs font-semibold text-[var(--color-text)]">Design Principles</h4>
            <div className="flex flex-wrap gap-2">
              {['🔒 Secure', '⚡ Performant', '📈 Scalable', '💰 Cost'].map((p) => (
                <span key={p} className="rounded-md bg-purple-500/10 px-2 py-0.5 text-[11px] font-medium text-purple-400">{p}</span>
              ))}
            </div>
          </div>

          <div className="absolute right-4 top-4 z-10 space-y-1.5">
            {[
              { label: 'Bronze (Raw)', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
              { label: 'Silver (Cleaned)', color: 'bg-gray-400/20 text-gray-300 border-gray-400/30' },
              { label: 'Gold (Business)', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
            ].map((layer) => (
              <div key={layer.label} className={`rounded-lg border px-3 py-1.5 text-[11px] font-medium ${layer.color}`}>██ {layer.label}</div>
            ))}
          </div>

          {canvasItems.map((item) => (
            <div key={item.id}
              className={`absolute cursor-grab active:cursor-grabbing rounded-xl border-2 px-4 py-3 transition-shadow hover:shadow-lg hover:shadow-purple-500/20 ${typeColors[item.type]}`}
              style={{ left: item.x, top: item.y, transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}
              onMouseDown={(e) => handleMouseDown(e, item.id)}>
              <div className="flex items-center gap-2">
                {typeIcons[item.type]}
                <span className="whitespace-nowrap text-sm font-medium text-[var(--color-text)]">{item.name}</span>
              </div>
            </div>
          ))}

          <svg className="absolute inset-0 pointer-events-none" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}>
            {canvasItems.slice(0, -1).map((item, i) => {
              const next = canvasItems[i + 1];
              return (<line key={i} x1={item.x + 100} y1={item.y + 24} x2={next.x} y2={next.y + 24} stroke="rgba(124, 58, 237, 0.3)" strokeWidth="2" strokeDasharray="6 4" />);
            })}
          </svg>

          {[
            { label: 'Stream', x: 190, y: 175, color: 'text-cyan-400' },
            { label: 'Stream', x: 450, y: 175, color: 'text-amber-400' },
            { label: 'Batch', x: 710, y: 165, color: 'text-green-400' },
          ].map((flow, i) => (
            <div key={i} className={`absolute z-10 rounded-full bg-[var(--color-card)]/80 px-2.5 py-0.5 text-[10px] font-semibold ${flow.color} border border-[var(--color-border)]`} style={{ left: flow.x, top: flow.y }}>
              {flow.label} →
            </div>
          ))}
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20">
            <Brain className="h-5 w-5 text-purple-400" />
          </div>
          <input type="text" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Describe your architecture... e.g., 'Design a real-time loan fraud monitoring system on Azure'"
            className="input flex-1 border-0 bg-transparent px-0 text-sm placeholder:text-[var(--color-text-muted)] focus:ring-0" />
          <button className="btn-primary btn-sm"><Sparkles className="h-4 w-4" /> Generate</button>
        </div>
      </motion.div>
    </div>
  );
}
