import React from 'react';
import { DiagramPayload } from '../types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Image, UploadCloud, Eye, Network, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DiagramInputCardProps {
  payload: DiagramPayload;
  onChange: (updates: Partial<DiagramPayload>) => void;
}

export const DiagramInputCard: React.FC<DiagramInputCardProps> = ({ payload, onChange }) => {
  const nodeTypeColor = {
    source: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    transform: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300',
    sink: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
    storage: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone & Status */}
      <div className="p-4 rounded-lg border-2 border-dashed border-[#242831] bg-[#0B0D10] text-center space-y-2 hover:border-indigo-500/40 transition-colors">
        <UploadCloud className="w-8 h-8 text-indigo-400 mx-auto" />
        <div>
          <p className="text-xs font-semibold text-[#F5F7FA]">
            Upload Architecture Diagram, Whiteboard Sketch, or ERD
          </p>
          <p className="text-[11px] text-[#6B7280]">
            Supports PNG, JPEG, SVG, Draw.io XML up to 25MB
          </p>
        </div>
        <div className="pt-1 flex items-center justify-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => alert('Diagram file selector opened')}>
            Browse Files
          </Button>
          <span className="text-xs text-[#9CA3AF]">or drag & drop</span>
        </div>
      </div>

      {/* OCR & Entity Flow Graph Simulation */}
      <div className="p-4 rounded-lg bg-[#14171C] border border-[#242831] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-semibold text-[#F5F7FA]">
              Computer Vision & OCR Topology Recognition
            </h4>
          </div>
          <span className="text-[11px] font-mono text-[#9CA3AF]">
            {payload.fileName || 'architecture_ecommerce_cdc.png'}
          </span>
        </div>

        {/* Detected Nodes Visual Grid */}
        <div className="p-3 bg-[#0B0D10] rounded-lg border border-[#1F242C] space-y-2">
          <span className="text-[10px] font-bold uppercase text-[#6B7280] tracking-wider block">
            Extracted Pipeline Entities ({payload.detectedNodes.length})
          </span>

          <div className="flex flex-wrap items-center gap-2">
            {payload.detectedNodes.map((node, i) => (
              <React.Fragment key={node.id}>
                <div
                  className={cn(
                    'px-3 py-1.5 rounded-md border text-xs font-semibold flex items-center gap-1.5',
                    nodeTypeColor[node.type]
                  )}
                >
                  <Network className="w-3.5 h-3.5" />
                  <span>{node.name}</span>
                </div>
                {i < payload.detectedNodes.length - 1 && (
                  <ArrowRight className="w-3.5 h-3.5 text-[#383F4D]" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* OCR Key Phrases */}
        <div>
          <span className="text-[10px] font-bold uppercase text-[#6B7280] tracking-wider block mb-1.5">
            OCR Extracted Technical Tokens
          </span>
          <div className="flex flex-wrap gap-1.5">
            {payload.extractedText.map((token, i) => (
              <Badge key={i} variant="neutral" size="sm">
                {token}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
