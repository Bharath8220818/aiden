import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { ArchitectureTemplate } from '../types';
import { Network, Layers, ArrowRight } from 'lucide-react';

export interface TemplateGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: ArchitectureTemplate[];
  onSelectTemplate: (template: ArchitectureTemplate) => void;
}

export const TemplateGalleryModal: React.FC<TemplateGalleryModalProps> = ({
  isOpen,
  onClose,
  templates,
  onSelectTemplate,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Architecture Template Gallery"
      description="Load a curated blueprint onto the canvas and adapt it to your stack."
      maxWidth="2xl"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => {
              onSelectTemplate(template);
              onClose();
            }}
            className="text-left p-4 rounded-lg bg-card border border-border hover:border-indigo-500/50 hover:bg-card transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-600">
                  <Network className="w-4 h-4" />
                </span>
                <span className="text-sm font-semibold text-text-primary">{template.name}</span>
              </div>
              <ArrowRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </div>
            <p className="text-[11px] text-text-secondary leading-relaxed mb-2.5">{template.description}</p>
            <div className="flex items-center gap-1.5">
              <Badge variant="ai" size="sm">{template.pattern}</Badge>
              <Badge variant="neutral" size="sm">
                <Layers className="w-3 h-3 mr-1" />
                {template.nodes.length} nodes
              </Badge>
              <Badge variant="neutral" size="sm">{template.edges.length} edges</Badge>
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
};
