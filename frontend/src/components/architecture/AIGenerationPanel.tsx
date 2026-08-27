import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, X, Loader2, CheckCircle2, Upload, Mic, ChevronDown,
  Cloud, Brain
} from 'lucide-react';
import type { AssetItem } from './AssetLibraryPanel';

interface AIGenerationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (prompt: string, nodes: AssetItem[]) => void;
  isGenerating?: boolean;
  generationSteps?: string[];
}

const ENVIRONMENTS = ['AWS', 'Azure', 'GCP', 'On-Premise'];
const STYLES = ['Data Engineering', 'Streaming', 'ML Pipeline', 'Data Mesh', 'Lakehouse', 'Microservices'];

const QUICK_PROMPTS = [
  'Real-time analytics platform with Kafka, Spark, and Snowflake',
  'ETL pipeline from PostgreSQL to BigQuery',
  'ML feature store with streaming ingestion',
  'Data lakehouse with Bronze/Silver/Gold layers',
  'Event-driven microservices architecture',
];

const AIGenerationPanel: React.FC<AIGenerationPanelProps> = ({
  isOpen,
  onClose,
  onGenerate,
  isGenerating = false,
  generationSteps = [],
}) => {
  const [prompt, setPrompt] = useState('');
  const [environment, setEnvironment] = useState('AWS');
  const [style, setStyle] = useState('Data Engineering');
  const [showEnvDropdown, setShowEnvDropdown] = useState(false);
  const [showStyleDropdown, setShowStyleDropdown] = useState(false);

  const handleGenerate = useCallback(() => {
    if (!prompt.trim()) return;
    onGenerate(prompt, []);
  }, [prompt, onGenerate]);

  const handleQuickPrompt = useCallback((qp: string) => {
    setPrompt(qp);
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 w-[520px] max-w-[calc(100%-2rem)]"
      >
        <div className="rounded-2xl border border-[#1F2937] bg-[#0E131D] shadow-2xl shadow-black/40 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#1F2937]">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-cyan-500/20">
                <Sparkles size={14} className="text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--color-text)]">Generate Architecture</p>
                <p className="text-[10px] text-[var(--color-text-muted)]">Describe your system in natural language</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 rounded hover:bg-white/5 text-[var(--color-text-muted)]">
              <X size={14} />
            </button>
          </div>

          {isGenerating ? (
            /* Generation Progress */
            <div className="p-5">
              <div className="space-y-2.5">
                {generationSteps.map((step, i) => (
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.3 }}
                    className="flex items-center gap-2.5"
                  >
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    <span className="text-xs text-[var(--color-text-secondary)]">{step}</span>
                  </motion.div>
                ))}
                {generationSteps.length < 6 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2.5"
                  >
                    <Loader2 size={14} className="text-purple-400 animate-spin" />
                    <span className="text-xs text-purple-400">Processing...</span>
                  </motion.div>
                )}
              </div>
            </div>
          ) : (
            /* Input Form */
            <div className="p-5 space-y-4">
              {/* Prompt Input */}
              <div>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe your architecture...&#10;&#10;e.g., &quot;Create an e-commerce streaming data platform using Kafka, Spark, PostgreSQL and Snowflake&quot;"
                  rows={3}
                  className="w-full rounded-xl border border-[#1F2937] bg-[#111827] px-4 py-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-purple-500/50 resize-none"
                />
              </div>

              {/* Quick Prompts */}
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.slice(0, 3).map((qp) => (
                  <button
                    key={qp}
                    onClick={() => handleQuickPrompt(qp)}
                    className="px-2.5 py-1 rounded-lg border border-[#1F2937] text-[10px] text-[var(--color-text-muted)] hover:border-purple-500/30 hover:text-purple-400 hover:bg-purple-500/5 transition"
                  >
                    {qp}
                  </button>
                ))}
              </div>

              {/* Environment + Style */}
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1 block">
                    Environment
                  </label>
                  <button
                    onClick={() => { setShowEnvDropdown(!showEnvDropdown); setShowStyleDropdown(false); }}
                    className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg border border-[#1F2937] bg-[#111827] text-xs text-[var(--color-text)] hover:border-[#374155] transition"
                  >
                    <span className="flex items-center gap-1.5">
                      <Cloud size={12} className="text-orange-400" />
                      {environment}
                    </span>
                    <ChevronDown size={12} />
                  </button>
                  {showEnvDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-[#1F2937] bg-[#111827] shadow-xl z-10">
                      {ENVIRONMENTS.map((env) => (
                        <button
                          key={env}
                          onClick={() => { setEnvironment(env); setShowEnvDropdown(false); }}
                          className="w-full text-left px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-white/5 transition"
                        >
                          {env}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex-1 relative">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1 block">
                    Architecture Style
                  </label>
                  <button
                    onClick={() => { setShowStyleDropdown(!showStyleDropdown); setShowEnvDropdown(false); }}
                    className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg border border-[#1F2937] bg-[#111827] text-xs text-[var(--color-text)] hover:border-[#374155] transition"
                  >
                    <span className="flex items-center gap-1.5">
                      <Brain size={12} className="text-purple-400" />
                      {style}
                    </span>
                    <ChevronDown size={12} />
                  </button>
                  {showStyleDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-[#1F2937] bg-[#111827] shadow-xl z-10">
                      {STYLES.map((s) => (
                        <button
                          key={s}
                          onClick={() => { setStyle(s); setShowStyleDropdown(false); }}
                          className="w-full text-left px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-white/5 transition"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim()}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:from-purple-500 hover:to-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <Sparkles size={14} />
                  Generate Architecture
                </button>
                <button className="p-2.5 rounded-xl border border-[#1F2937] hover:bg-white/5 text-[var(--color-text-muted)] transition">
                  <Upload size={14} />
                </button>
                <button className="p-2.5 rounded-xl border border-[#1F2937] hover:bg-white/5 text-[var(--color-text-muted)] transition">
                  <Mic size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AIGenerationPanel;
