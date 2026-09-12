import React, { useState } from 'react';
import { useUIStore } from '@/store/uiStore';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Sparkles, ArrowRight, CornerDownLeft, Bot, GitBranch, AlertOctagon, Terminal, Search } from 'lucide-react';

export const AskAidenModal: React.FC = () => {
  const { isAskAidenOpen, closeAskAiden } = useUIStore();
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [responseMessage, setResponseMessage] = useState<string | null>(null);

  const quickCommands = [
    {
      title: 'Generate pipeline',
      prompt: 'Create a daily sales pipeline from PostgreSQL to Snowflake with hourly incremental CDC',
      icon: GitBranch,
      tag: 'Studio',
    },
    {
      title: 'Diagnose failed pipeline',
      prompt: 'Diagnose failure on fraud_stream_processor: checkpoint timeout on Spark worker 3',
      icon: AlertOctagon,
      tag: 'Self-Healing',
    },
    {
      title: 'Explain architecture',
      prompt: 'Summarize customer_360 end-to-end data lineage and dependency graph',
      icon: Bot,
      tag: 'Architecture',
    },
    {
      title: 'Optimize SQL',
      prompt: 'Analyze query execution plan for aggregated_monthly_revenue and suggest partitioning indexes',
      icon: Terminal,
      tag: 'SQL',
    },
  ];

  const handleSubmit = (promptText?: string) => {
    const textToSubmit = promptText || query;
    if (!textToSubmit.trim()) return;

    setIsProcessing(true);
    setResponseMessage(null);

    // Mock autonomous AI generation response for Phase 1
    setTimeout(() => {
      setIsProcessing(false);
      setResponseMessage(
        `AIDEN Autonomous Agent has analyzed: "${textToSubmit}". Requirement intent identified. In Phase 2, this will auto-generate requirement specifications, pipeline DAGs, and validation tests.`
      );
    }, 800);
  };

  const handleReset = () => {
    setQuery('');
    setResponseMessage(null);
    closeAskAiden();
  };

  return (
    <Modal
      isOpen={isAskAidenOpen}
      onClose={handleReset}
      maxWidth="2xl"
      className="p-0 border-indigo-500/30 shadow-ai-glow"
    >
      {/* Top AI Banner */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#242831] bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-[#14171C]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-ai-glow">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#F5F7FA] flex items-center gap-2">
              Ask AIDEN
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Autonomous AI
              </span>
            </h2>
            <p className="text-xs text-[#9CA3AF]">
              Natural language to data pipelines, root-cause diagnosis, & architecture
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Main Prompt Input */}
        <div>
          <label className="block text-xs font-medium text-[#9CA3AF] mb-2">
            What do you want to build or diagnose?
          </label>
          <div className="relative">
            <textarea
              rows={3}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="e.g. Create a daily sales pipeline from PostgreSQL to Snowflake with anomaly detection..."
              className="w-full bg-[#0B0D10] text-[#F5F7FA] placeholder-[#6B7280] text-sm rounded-lg border border-[#242831] p-3.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
            />
            <div className="absolute right-3 bottom-3 flex items-center gap-2">
              <span className="text-[11px] text-[#6B7280] flex items-center gap-1 font-mono">
                <CornerDownLeft className="w-3 h-3" /> Enter
              </span>
              <Button
                size="sm"
                variant="ai"
                isLoading={isProcessing}
                onClick={() => handleSubmit()}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Execute
              </Button>
            </div>
          </div>
        </div>

        {/* AI Output preview */}
        {responseMessage && (
          <div className="p-4 rounded-lg bg-indigo-950/30 border border-indigo-500/40 text-xs text-indigo-200 leading-relaxed flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-white">Autonomous Agent Response:</p>
              <p>{responseMessage}</p>
            </div>
          </div>
        )}

        {/* Recent Commands / Suggestions */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-2.5">
            Quick Actions & Recent Commands
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {quickCommands.map((cmd, idx) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setQuery(cmd.prompt);
                    handleSubmit(cmd.prompt);
                  }}
                  className="group flex flex-col p-3 rounded-lg border border-[#242831] bg-[#0F1115] hover:bg-[#1A1D24] hover:border-indigo-500/40 text-left transition-all duration-150"
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="flex items-center gap-2 text-xs font-medium text-[#F5F7FA] group-hover:text-indigo-300">
                      <Icon className="w-3.5 h-3.5 text-indigo-400" />
                      {cmd.title}
                    </span>
                    <span className="text-[10px] text-[#6B7280] bg-[#14171C] px-1.5 py-0.5 rounded border border-[#242831]">
                      {cmd.tag}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#9CA3AF] line-clamp-2">
                    {cmd.prompt}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-6 py-3 border-t border-[#242831] bg-[#0F1115] text-[11px] text-[#6B7280]">
        <span>Press <kbd className="px-1.5 py-0.5 rounded bg-[#1A1D24] border border-[#242831] font-mono text-[#9CA3AF]">ESC</kbd> to exit</span>
        <span className="flex items-center gap-1.5 text-indigo-400">
          <Search className="w-3 h-3" /> Autonomous Agent v1.0 Ready
        </span>
      </div>
    </Modal>
  );
};
