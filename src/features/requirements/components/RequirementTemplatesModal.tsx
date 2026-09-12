import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { RequirementPreset } from '../mockData';
import { Sparkles, Layers, ArrowRight, Check } from 'lucide-react';

export interface RequirementTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  presets: RequirementPreset[];
  activePresetId: string;
  onSelectPreset: (preset: RequirementPreset) => void;
}

export const RequirementTemplatesModal: React.FC<RequirementTemplatesModalProps> = ({
  isOpen,
  onClose,
  presets,
  activePresetId,
  onSelectPreset,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Enterprise Requirement & Contract Templates"
      description="Select an industry template to populate multimodal inputs and pre-synthesized data contracts."
      maxWidth="2xl"
    >
      <div className="space-y-3 mt-2">
        {presets.map((preset) => {
          const isActive = preset.id === activePresetId;
          return (
            <div
              key={preset.id}
              onClick={() => {
                onSelectPreset(preset);
                onClose();
              }}
              className="p-4 rounded-xl border border-[#242831] bg-[#0F1115] hover:bg-[#181B22] hover:border-indigo-500/40 transition-all cursor-pointer space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[#F5F7FA] group-hover:text-indigo-300 transition-colors">
                      {preset.name}
                    </h4>
                    <span className="text-[11px] text-[#6B7280]">{preset.domain}</span>
                  </div>
                </div>

                {isActive ? (
                  <Badge variant="success" size="sm" dot>
                    Currently Active
                  </Badge>
                ) : (
                  <span className="text-xs text-indigo-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1 font-medium">
                    Load Template <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>

              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                {preset.description}
              </p>

              <div className="flex items-center gap-2 pt-1 text-[10px] text-[#6B7280]">
                <span>Columns: {preset.contract.columns.length}</span>
                <span>•</span>
                <span>SLA: {preset.contract.sla.freshness}</span>
                <span>•</span>
                <span>Format: {preset.contract.targetFormat}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
};
