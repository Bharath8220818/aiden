import React from 'react';
import { NODE_PALETTE, PaletteItem } from '../services/architecture.service';
import { ArchitectureNodeKind } from '../types';
import { cn } from '@/lib/utils';
import {
  Database,
  Download,
  Cpu,
  HardDrive,
  ShieldCheck,
  Layers,
  Clock,
  Plus,
} from 'lucide-react';

const KIND_ICONS: Record<ArchitectureNodeKind, JSX.Element> = {
  source: <Database className="w-4 h-4" />,
  ingestion: <Download className="w-4 h-4" />,
  processing: <Cpu className="w-4 h-4" />,
  storage: <HardDrive className="w-4 h-4" />,
  quality: <ShieldCheck className="w-4 h-4" />,
  sink: <Layers className="w-4 h-4" />,
  orchestration: <Clock className="w-4 h-4" />,
};

const KIND_ACCENT: Record<ArchitectureNodeKind, string> = {
  source: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30',
  ingestion: 'text-cyan-600 bg-cyan-500/10 border-cyan-500/30',
  processing: 'text-indigo-600 bg-indigo-500/10 border-indigo-500/30',
  storage: 'text-amber-600 bg-amber-500/10 border-amber-500/30',
  quality: 'text-violet-600 bg-violet-500/10 border-violet-500/30',
  sink: 'text-blue-600 bg-blue-500/10 border-blue-500/30',
  orchestration: 'text-fuchsia-600 bg-fuchsia-500/10 border-fuchsia-500/30',
};

export interface NodePaletteProps {
  onAddNode: (kind: ArchitectureNodeKind) => void;
  className?: string;
}

export const NodePalette: React.FC<NodePaletteProps> = ({ onAddNode, className }) => {
  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="px-4 pt-4 pb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">Component Palette</h3>
        <p className="text-[11px] text-text-secondary mt-0.5">Click to place a node on the canvas</p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1.5">
        {NODE_PALETTE.map((item: PaletteItem) => (
          <button
            key={item.kind}
            onClick={() => onAddNode(item.kind)}
            className="w-full text-left p-2.5 rounded-lg bg-card border border-border hover:border-border-highlight hover:bg-card-hover transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <span className={cn('inline-flex items-center justify-center w-7 h-7 rounded-md border shrink-0', KIND_ACCENT[item.kind])}>
                {KIND_ICONS[item.kind]}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-text-primary">{item.label}</div>
                <div className="text-[10px] text-text-muted font-mono truncate">{item.technology}</div>
              </div>
              <Plus className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
        ))}
      </div>

      <div className="px-4 py-3 border-t border-border">
        <p className="text-[10px] text-text-muted leading-relaxed">
          Connect nodes by dragging between handles. Sources accept no input; sinks emit no output — invalid connections are rejected by validation.
        </p>
      </div>
    </div>
  );
};
