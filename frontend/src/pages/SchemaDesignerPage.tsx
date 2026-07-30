import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Database, Plus, Sparkles,
  Download, Share2, Columns, Key,
  Link2
} from 'lucide-react';

interface Column {
  name: string;
  type: string;
  primaryKey: boolean;
  foreignKey?: string;
  nullable: boolean;
}

interface Table {
  id: string;
  name: string;
  type: 'fact' | 'dimension';
  color: string;
  x: number;
  y: number;
  columns: Column[];
}

const initialTables: Table[] = [
  {
    id: '1', name: 'fact_sales', type: 'fact', color: 'purple', x: 100, y: 120,
    columns: [
      { name: 'sale_id', type: 'BIGINT', primaryKey: true, nullable: false },
      { name: 'customer_id', type: 'BIGINT', primaryKey: false, foreignKey: 'dim_customers.customer_id', nullable: false },
      { name: 'product_id', type: 'BIGINT', primaryKey: false, foreignKey: 'dim_products.product_id', nullable: false },
      { name: 'date_id', type: 'DATE', primaryKey: false, foreignKey: 'dim_dates.date_id', nullable: false },
      { name: 'revenue', type: 'DECIMAL(10,2)', primaryKey: false, nullable: false },
      { name: 'quantity', type: 'INTEGER', primaryKey: false, nullable: false },
    ],
  },
  {
    id: '2', name: 'dim_customers', type: 'dimension', color: 'cyan', x: 500, y: 60,
    columns: [
      { name: 'customer_id', type: 'BIGINT', primaryKey: true, nullable: false },
      { name: 'name', type: 'VARCHAR(255)', primaryKey: false, nullable: false },
      { name: 'email', type: 'VARCHAR(255)', primaryKey: false, nullable: false },
      { name: 'segment', type: 'VARCHAR(100)', primaryKey: false, nullable: true },
    ],
  },
  {
    id: '3', name: 'dim_products', type: 'dimension', color: 'emerald', x: 500, y: 230,
    columns: [
      { name: 'product_id', type: 'BIGINT', primaryKey: true, nullable: false },
      { name: 'product_name', type: 'VARCHAR(255)', primaryKey: false, nullable: false },
      { name: 'category', type: 'VARCHAR(100)', primaryKey: false, nullable: false },
      { name: 'price', type: 'DECIMAL(10,2)', primaryKey: false, nullable: false },
    ],
  },
];

const typeColors: Record<string, { border: string; header: string; text: string; line: string }> = {
  fact: { border: 'border-purple-500/30', header: 'bg-purple-500/20', text: 'text-purple-400', line: 'rgba(124,58,237,0.3)' },
  dimension: { border: 'border-cyan-500/30', header: 'bg-cyan-500/20', text: 'text-cyan-400', line: 'rgba(6,182,212,0.3)' },
};

export default function SchemaDesignerPage() {
  const [tables, setTables] = useState<Table[]>(initialTables);
  const [aiPrompt, setAiPrompt] = useState('');
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    const table = tables.find(t => t.id === id);
    if (!table) return;
    setDragging(id);
    const rect = (e.target as HTMLElement).closest('[data-table-id]')?.getBoundingClientRect();
    setDragOffset({ x: e.clientX - (rect?.left || table.x), y: e.clientY - (rect?.top || table.y) });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setTables(prev => prev.map(t =>
      t.id === dragging ? { ...t, x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y } : t
    ));
  };

  const handleMouseUp = () => setDragging(null);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-[var(--color-text)]">🗄️ Schema Designer</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Design database schemas visually — define tables, columns, relationships, and let AI generate the DDL
        </p>
      </motion.div>

      {/* Toolbar */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button className="btn-secondary btn-sm"><Plus className="h-4 w-4" /> Add Table</button>
          <button className="btn-secondary btn-sm"><Link2 className="h-4 w-4" /> Add Relationship</button>
          <button className="btn-secondary btn-sm"><Download className="h-4 w-4" /> Generate DDL</button>
          <button className="btn-secondary btn-sm"><Share2 className="h-4 w-4" /> Normalize</button>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-400">Star Schema</span>
          <span className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400">✓ Validated</span>
          <button className="btn-primary btn-sm"><Sparkles className="h-4 w-4" /> Validate Schema</button>
        </div>
      </motion.div>

      {/* Canvas */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-2xl border border-[var(--color-border)]"
        style={{ height: '520px' }}
        onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
      >
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(124,58,237,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.3) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />

        {/* Table Cards */}
        {tables.map((table) => {
          const colors = typeColors[table.type];
          return (
            <div
              key={table.id}
              data-table-id={table.id}
              className={`absolute w-72 rounded-xl border-2 ${colors.border} cursor-grab active:cursor-grabbing overflow-hidden transition-shadow hover:shadow-xl hover:shadow-purple-500/10`}
              style={{ left: table.x, top: table.y }}
              onMouseDown={(e) => handleMouseDown(e, table.id)}
            >
              {/* Header */}
              <div className={`${colors.header} px-4 py-3`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className={`h-4 w-4 ${colors.text}`} />
                    <span className="font-mono text-sm font-bold text-[var(--color-text)]">{table.name}</span>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${colors.text} bg-[var(--color-card)] border ${colors.border}`}>
                    {table.type}
                  </span>
                </div>
              </div>

              {/* Columns */}
              <div className="divide-y divide-[var(--color-border)] bg-[var(--color-card)]">
                {table.columns.map((col) => (
                  <div key={col.name} className="flex items-center gap-2 px-4 py-2 text-xs">
                    {col.primaryKey ? (
                      <Key className="h-3 w-3 shrink-0 text-amber-400" />
                    ) : col.foreignKey ? (
                      <Link2 className="h-3 w-3 shrink-0 text-cyan-400" />
                    ) : (
                      <Columns className="h-3 w-3 shrink-0 text-[var(--color-text-muted)]" />
                    )}
                    <span className="font-mono font-medium text-[var(--color-text)]">{col.name}</span>
                    <span className="font-mono text-[10px] text-[var(--color-text-muted)]">{col.type}</span>
                    {col.primaryKey && <span className="ml-auto text-[10px] font-semibold text-amber-400">PK</span>}
                    {col.foreignKey && <span className="ml-auto text-[10px] text-cyan-400">FK</span>}
                    {col.nullable && <span className="text-[10px] text-[var(--color-text-muted)]">NULL</span>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Relationship Lines */}
        <svg className="absolute inset-0 pointer-events-none">
          {tables[0].columns.filter(c => c.foreignKey).map((col, i) => {
            const targetTable = tables.find(t => col.foreignKey?.startsWith(t.name));
            if (!targetTable) return null;
            const fromY = 120 + 100 + i * 28;
            return (
              <g key={i}>
                <line x1={340} y1={fromY} x2={488} y2={targetTable.y + 50 + i * 28}
                  stroke={typeColors[targetTable.type].line} strokeWidth="1.5" strokeDasharray="5 3" />
                <circle cx={340} cy={fromY} r="3" fill="rgba(124,58,237,0.5)" />
                <circle cx={488} cy={targetTable.y + 50 + i * 28} r="3" fill="rgba(6,182,212,0.5)" />
              </g>
            );
          })}
        </svg>
      </motion.div>

      {/* AI Prompt */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20">
            <Sparkles className="h-5 w-5 text-purple-400" />
          </div>
          <input type="text" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Describe your schema... e.g., 'Design a Star Schema for an e-commerce sales system'"
            className="input flex-1 border-0 bg-transparent px-0 text-sm placeholder:text-[var(--color-text-muted)] focus:ring-0" />
          <button className="btn-primary btn-sm"><Sparkles className="h-4 w-4" /> Generate Schema</button>
        </div>
      </motion.div>
    </div>
  );
}
