import React, { useCallback } from 'react';
import { Database, Settings2, Filter, Merge, RefreshCw, BarChart3, Upload } from 'lucide-react';

export interface PaletteItem {
  type: 'source' | 'transform' | 'destination';
  label: string;
  description: string;
  icon: React.ReactNode;
  defaultConfig: Record<string, any>;
}

const PALETTE_ITEMS: PaletteItem[] = [
  {
    type: 'source',
    label: 'Source',
    description: 'Database, API, or file',
    icon: <Database size={16} />,
    defaultConfig: { table: '', connection: '' },
  },
  {
    type: 'transform',
    label: 'Filter',
    description: 'Filter rows by condition',
    icon: <Filter size={16} />,
    defaultConfig: { condition: '' },
  },
  {
    type: 'transform',
    label: 'Aggregate',
    description: 'Group and summarize data',
    icon: <BarChart3 size={16} />,
    defaultConfig: { group_by: '', metric: 'count' },
  },
  {
    type: 'transform',
    label: 'Join',
    description: 'Merge two datasets',
    icon: <Merge size={16} />,
    defaultConfig: { join_type: 'inner', on: '' },
  },
  {
    type: 'transform',
    label: 'Clean',
    description: 'Remove nulls / duplicates',
    icon: <RefreshCw size={16} />,
    defaultConfig: { remove_nulls: true, deduplicate: false },
  },
  {
    type: 'destination',
    label: 'Destination',
    description: 'Snowflake, Postgres, S3',
    icon: <Upload size={16} />,
    defaultConfig: { schema: '', table: '' },
  },
];

interface NodePaletteProps {}

const NodePalette: React.FC<NodePaletteProps> = () => {
  const handleDragStart = useCallback(
    (e: React.DragEvent, item: PaletteItem) => {
      e.dataTransfer.setData('application/json', JSON.stringify(item));
      e.dataTransfer.effectAllowed = 'copy';
    },
    [],
  );

  const grouped = {
    source: PALETTE_ITEMS.filter((i) => i.type === 'source'),
    transform: PALETTE_ITEMS.filter((i) => i.type === 'transform'),
    destination: PALETTE_ITEMS.filter((i) => i.type === 'destination'),
  };

  const sectionStyle = (color: string) =>
    `border-l-2 ${color} pl-3`;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-100 px-4 py-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Node Palette</p>
        <p className="text-[10px] text-gray-400 mt-0.5">Drag nodes onto the canvas</p>
      </div>

      {/* Palette Items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Sources */}
        <div>
          <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Database size={10} /> Sources
          </p>
          <div className={sectionStyle('border-blue-400')}>
            {grouped.source.map((item) => (
              <PaletteCard key={item.label} item={item} onDragStart={handleDragStart} />
            ))}
          </div>
        </div>

        {/* Transforms */}
        <div>
          <p className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Settings2 size={10} /> Transforms
          </p>
          <div className={sectionStyle('border-purple-400')}>
            {grouped.transform.map((item) => (
              <PaletteCard key={item.label} item={item} onDragStart={handleDragStart} />
            ))}
          </div>
        </div>

        {/* Destinations */}
        <div>
          <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Upload size={10} /> Destinations
          </p>
          <div className={sectionStyle('border-green-400')}>
            {grouped.destination.map((item) => (
              <PaletteCard key={item.label} item={item} onDragStart={handleDragStart} />
            ))}
          </div>
        </div>
      </div>

      {/* Tips footer */}
      <div className="border-t border-gray-100 px-4 py-2">
        <p className="text-[10px] text-gray-400">
          Drag to canvas · Click to select · Delete to remove
        </p>
      </div>
    </div>
  );
};

// ── Palette Card ─────────────────────────────────────────────────────────

interface PaletteCardProps {
  item: PaletteItem;
  onDragStart: (e: React.DragEvent, item: PaletteItem) => void;
}

const typeColors: Record<string, string> = {
  source: 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100',
  transform: 'border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100',
  destination: 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100',
};

const PaletteCard: React.FC<PaletteCardProps> = React.memo(({ item, onDragStart }) => {
  const colorClass = typeColors[item.type] || typeColors.transform;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item)}
      className={`group mb-1.5 flex cursor-grab items-center gap-2.5 rounded-lg border px-3 py-2.5 text-xs font-medium shadow-sm transition-all hover:shadow-md active:cursor-grabbing active:scale-95 ${colorClass}`}
    >
      <span className="shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
        {item.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold truncate">{item.label}</p>
        <p className="text-[10px] opacity-70 truncate">{item.description}</p>
      </div>
      <span className="shrink-0 text-[9px] opacity-0 group-hover:opacity-50 transition-opacity">
        ↕ drag
      </span>
    </div>
  );
});

PaletteCard.displayName = 'PaletteCard';

export { PALETTE_ITEMS };
export default NodePalette;
