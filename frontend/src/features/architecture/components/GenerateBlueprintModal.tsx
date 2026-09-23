import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Sparkles, Wand2 } from 'lucide-react';

export interface GenerateBlueprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (prompt: string) => Promise<void>;
  isGenerating: boolean;
}

const PATTERN_EXAMPLES = [
  { label: 'Streaming CDC', prompt: 'Stream PostgreSQL orders to Snowflake with PII masking and quality gates' },
  { label: 'Fraud Analytics', prompt: 'Real-time payment fraud velocity features from Kafka into Redis with risk alerts' },
  { label: 'Batch ETL', prompt: 'Nightly batch load of sales data from MySQL into the data lake' },
  { label: 'Reverse ETL', prompt: 'Sync warehouse marts back into Salesforce for the sales team' },
];

export const GenerateBlueprintModal: React.FC<GenerateBlueprintModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
  isGenerating,
}) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = async () => {
    if (!prompt.trim()) return;
    await onGenerate(prompt);
    setPrompt('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Architecture with AIDEN"
      description="Describe the pipeline you want to build — the Architect Agent will design the topology."
      maxWidth="lg"
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            autoFocus
            placeholder="e.g. Stream order events from PostgreSQL into Snowflake with PII tokenization and a quality gate before loading the mart…"
            className="w-full bg-card text-text-primary text-xs rounded-md border border-border px-3 py-2.5 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/80 resize-none placeholder:text-text-muted"
          />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Quick starts</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PATTERN_EXAMPLES.map((example) => (
              <button
                key={example.label}
                onClick={() => setPrompt(example.prompt)}
                className="text-left p-2.5 rounded-lg bg-card border border-border hover:border-indigo-500/40 transition-all group"
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Wand2 className="w-3 h-3 text-indigo-600" />
                  <span className="text-[11px] font-semibold text-text-primary">{example.label}</span>
                </div>
                <p className="text-[10px] text-text-secondary leading-snug line-clamp-2">{example.prompt}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Cancel
          </Button>
          <Button
            variant="ai"
            size="sm"
            onClick={handleSubmit}
            isLoading={isGenerating}
            disabled={!prompt.trim()}
            leftIcon={<Sparkles className="w-3.5 h-3.5" />}
            className="text-xs shadow-ai-glow"
          >
            {isGenerating ? 'Designing topology…' : 'Generate blueprint'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
