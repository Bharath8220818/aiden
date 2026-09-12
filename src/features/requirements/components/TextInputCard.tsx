import React from 'react';
import { TextPayload } from '../types';
import { Button } from '@/components/ui/Button';
import { Sparkles, Wand2, Tag } from 'lucide-react';

export interface TextInputCardProps {
  payload: TextPayload;
  onChange: (text: string) => void;
  onEnhance?: () => void;
}

export const TextInputCard: React.FC<TextInputCardProps> = ({
  payload,
  onChange,
  onEnhance,
}) => {
  const quickTags = [
    'PostgreSQL CDC',
    'Snowflake Target',
    'GDPR PII Masking',
    'SLA < 15 mins',
    'Zero Deduplication',
  ];

  const handleAppendTag = (tag: string) => {
    const updated = payload.rawText.trim()
      ? `${payload.rawText} Enforce ${tag}.`
      : `Requirement: ${tag}.`;
    onChange(updated);
  };

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-[#F5F7FA] flex items-center gap-2">
          Natural Language Business Intent
          <span className="text-[10px] text-[#6B7280] font-normal font-mono">
            ({payload.rawText.length} chars)
          </span>
        </label>
        <Button
          size="sm"
          variant="ai"
          onClick={onEnhance}
          className="text-xs py-1 px-2.5 h-7"
          leftIcon={<Wand2 className="w-3 h-3 text-cyan-300" />}
        >
          AI Prompt Expander
        </Button>
      </div>

      <textarea
        rows={6}
        value={payload.rawText}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Describe what data needs to be moved or transformed. E.g. Stream customer orders from PostgreSQL to Snowflake every hour, mask emails, and enforce 15-minute freshness SLA..."
        className="w-full bg-[#0B0D10] text-[#F5F7FA] placeholder-[#6B7280] text-xs sm:text-sm rounded-lg border border-[#242831] p-3.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 leading-relaxed font-sans resize-y"
      />

      {/* Enhanced prompt preview if available */}
      {payload.enhancedPrompt && (
        <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-500/30 text-xs text-indigo-200 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-white">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI Enhanced Engineering Specification:</span>
          </div>
          <p className="text-[11px] text-[#9CA3AF] leading-relaxed">
            {payload.enhancedPrompt}
          </p>
        </div>
      )}

      {/* Quick Tag Chips */}
      <div>
        <span className="text-[10px] uppercase font-bold text-[#6B7280] tracking-wider block mb-1.5">
          Insert Parameter Chips
        </span>
        <div className="flex flex-wrap gap-1.5">
          {quickTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleAppendTag(tag)}
              className="text-[11px] px-2.5 py-1 rounded-md bg-[#181B22] border border-[#242831] text-[#9CA3AF] hover:text-white hover:border-indigo-500/50 hover:bg-[#1F242C] transition-colors flex items-center gap-1"
            >
              <Tag className="w-3 h-3 text-[#6B7280]" />
              <span>+ {tag}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
