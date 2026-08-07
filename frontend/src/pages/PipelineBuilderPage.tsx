import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Send, Paperclip, Mic, Copy, RefreshCw, Save,
  Loader2, Bot, History, GitBranch,
  Activity, Clock, Cpu,
} from 'lucide-react';
import { usePipelineStore } from '../store/pipelineStore';
import { useNotificationStore } from '../store/notificationStore';
import PipelineCanvas from '../components/builder/PipelineCanvas';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  type?: 'success' | 'error' | 'info';
}

// ── Sub-components ─────────────────────────────────────────────────────────

const HistoryPanel: React.FC = () => {
  const conversations = [
    { id: '1', title: 'Daily Sales ETL', time: '2 min ago', pinned: true },
    { id: '2', title: 'Customer 360 Pipeline', time: '1 hour ago', pinned: false },
    { id: '3', title: 'IoT Data Ingestion', time: '3 hours ago', pinned: false },
  ];

  return (
    <div className="bg-[#111827] rounded-2xl border border-[#1E293B] p-4">
      <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
        <History size={14} className="text-purple-400" />
        History
      </h3>
      <div className="space-y-1">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/5 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-200 truncate">{conv.title}</span>
              {conv.pinned && (
                <span className="text-[10px] text-amber-400 shrink-0">📌</span>
              )}
            </div>
            <span className="text-xs text-gray-500">{conv.time}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-[#1E293B]">
        <h4 className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Templates</h4>
        {['Daily Sales ETL', 'Customer 360', 'IoT Streaming'].map((t) => (
          <button
            key={t}
            className="w-full text-left text-sm px-3 py-1.5 rounded-xl text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors"
          >
            {t.startsWith('Daily') && '📊 '}
            {t.startsWith('Customer') && '📈 '}
            {t.startsWith('IoT') && '🌐 '}
            {t}
          </button>
        ))}
      </div>

      {/* Agent activity feed (compact) */}
      <div className="mt-4 pt-4 border-t border-[#1E293B]">
        <h4 className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wider flex items-center gap-2">
          <Activity size={12} className="text-cyan-400" />
          Agent Activity
        </h4>
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-xs">
            <Cpu size={12} className="text-purple-400 mt-0.5 shrink-0" />
            <span className="text-gray-300 font-medium">Intent Parser</span>
            <span className="text-gray-500">idle</span>
          </div>
          <div className="flex items-start gap-2 text-xs">
            <Cpu size={12} className="text-gray-500 mt-0.5 shrink-0" />
            <span className="text-gray-300 font-medium">Extraction Agent</span>
            <span className="text-gray-500">idle</span>
          </div>
          <div className="flex items-start gap-2 text-xs">
            <Cpu size={12} className="text-gray-500 mt-0.5 shrink-0" />
            <span className="text-gray-300 font-medium">Transformer Agent</span>
            <span className="text-gray-500">idle</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const ActivityLog: React.FC<{ agent: string; message: string; status?: 'running' | 'success' | 'idle' | 'error' }> = ({
  agent, message, status = 'running',
}) => {
  const colors = {
    running: 'text-purple-400',
    success: 'text-green-400',
    idle: 'text-gray-500',
    error: 'text-red-400',
  };
  return (
    <div className="flex items-start gap-2 text-sm">
      <Bot size={14} className={`${colors[status]} mt-0.5 shrink-0`} />
      <div>
        <span className="font-medium text-gray-200">{agent}</span>
        <span className="text-gray-400"> {message}</span>
      </div>
    </div>
  );
};

const SuggestionChip: React.FC<{ children: React.ReactNode; onClick?: () => void }> = ({ children, onClick }) => (
  <button
    onClick={onClick}
    className="px-3 py-1.5 rounded-full bg-[#1E293B] hover:bg-[#2D3748] border border-purple-500/10 text-sm text-gray-400 hover:text-gray-200 transition-all"
  >
    {children}
  </button>
);

// ── Main Component ─────────────────────────────────────────────────────────

const PipelineBuilderPage: React.FC = () => {
  const location = useLocation();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm AIDEN, your AI data engineering assistant. Describe the pipeline you need, and I'll build it with you step by step.",
    },
  ]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [pipelineData, setPipelineData] = useState<any>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { createFromPrompt } = usePipelineStore();
  const { addNotification } = useNotificationStore();

  const reusedPipeline = (location.state as any)?.reusedPipeline;
  const demoPipelineSummary = `✅ Pipeline created successfully!\n\n**Steps completed:**\n1. 🔍 **Extract** — Connected to PostgreSQL, discovered schema\n2. 🔄 **Transform** — Cleaned data, removed duplicates, aggregated by region\n3. 📥 **Load** — Wrote to Snowflake, analytics schema\n\n**Next steps:** View in Pipelines or monitor execution.`;

  const pipelineName = reusedPipeline?.name || 'New Pipeline';

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsGenerating(true);

    // Add streaming assistant message placeholder
    const assistantId = 'streaming-' + Date.now();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', isStreaming: true },
    ]);

    // Simulate step-by-step pipeline generation with canvas updates
    const steps = [
      { stage: 'extract', label: '🔍 Extracting from PostgreSQL', duration: 1200, nodeId: 'source-1' },
      { stage: 'transform-1', label: '🔄 Cleaning and standardizing data', duration: 1600, nodeId: 'transform-1' },
      { stage: 'transform-2', label: '🔄 Aggregating by region', duration: 1400, nodeId: 'transform-2' },
      { stage: 'load', label: '📥 Loading into Snowflake', duration: 1000, nodeId: 'destination-1' },
    ];

    let accumulatedContent = '';
    for (const step of steps) {
      // Update conversation message
      accumulatedContent += `⏳ ${step.label}...\n`;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: accumulatedContent } : m
        )
      );

      // Update pipeline canvas nodes
      setPipelineData((prev: any) => {
        const existingNodes = prev?.nodes || [];
        const newNodes = [...existingNodes, { id: step.nodeId, label: step.label.replace(/^.[^\s]+\s/, ''), status: 'running' }].map((n) => ({
          ...n,
          status: n.id === step.nodeId ? 'running' : n.status || 'success',
        }));
        return { ...prev, nodes: newNodes };
      });

      await new Promise((r) => setTimeout(r, step.duration));
    }

    // Finalize
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantId
          ? { ...m, content: demoPipelineSummary, isStreaming: false, type: 'success' }
          : m
      )
    );

    // Final canvas state (all done)
    setPipelineData({
      nodes: [
        { id: 'source-1', label: 'PostgreSQL', status: 'success', type: 'source' },
        { id: 'transform-1', label: 'Clean Data', status: 'success', type: 'transform' },
        { id: 'transform-2', label: 'Aggregate', status: 'success', type: 'transform' },
        { id: 'destination-1', label: 'Snowflake', status: 'success', type: 'destination' },
      ],
    });

    try {
      const pipeline = await createFromPrompt(input);
      addNotification({ type: 'success', message: `Pipeline "${pipeline.name}" created!` });
    } catch {
      addNotification({ type: 'error', message: 'Failed to save pipeline to backend' });
    }

    setIsGenerating(false);
  };

  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      // Skip the initial mount: scrollIntoView on first render would scroll
      // every scrollable ancestor — including the page — and cause the
      // "jump to top" on navigation.
      didMountRef.current = true;
      return;
    }
    // Scope the auto-scroll to the chat panel only, never the window.
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  const suggestionChips = [
    { label: 'Build Sales Pipeline', onClick: () => setInput('Build a daily sales ETL from PostgreSQL to Snowflake') },
    { label: 'IoT Ingestion', onClick: () => setInput('Create a real-time IoT data pipeline from Kafka to BigQuery') },
    { label: 'Customer 360', onClick: () => setInput('Build a customer 360 pipeline merging 3 sources') },
    { label: 'Data Quality', onClick: () => setInput('Set up data quality monitoring on all tables') },
  ];

  return (
    <div className="flex h-[calc(100vh-72px)] gap-4 p-4">
      {/* ═══════════════════════════════════════════════════════════════╗
          ║  LEFT PANEL — History + Agents                              ║
          ╚══════════════════════════════════════════════════════════════╝ */}
      <div className="w-64 flex-shrink-0 overflow-y-auto space-y-4 hidden lg:block">
        {reusedPipeline && (
          <div className="rounded-2xl border border-purple-500/20 bg-purple-500/10 p-4">
            <div className="flex items-center gap-2 mb-1">
              <GitBranch size={14} className="text-purple-400" />
              <span className="text-xs font-semibold text-purple-300">
                Reusing pipeline
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {reusedPipeline.description || `From execution #${reusedPipeline.executionId || 'past run'}`}
            </p>
            <div className="flex flex-wrap gap-2 mt-2 text-[11px] text-gray-400">
              <span className="bg-white/5 px-2 py-0.5 rounded">
                Source: <strong className="text-gray-200">{reusedPipeline.source_type || '?'}</strong>
              </span>
              <span className="bg-white/5 px-2 py-0.5 rounded">
                Dest: <strong className="text-gray-200">{reusedPipeline.destination_type || '?'}</strong>
              </span>
            </div>
          </div>
        )}

        <HistoryPanel />
      </div>

      {/* ═══════════════════════════════════════════════════════════════╗
          ║  CENTER PANEL — Chat                                        ║
          ╚══════════════════════════════════════════════════════════════╝ */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#111827] rounded-3xl border border-[#1E293B] overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[#1E293B] shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-cyan-600 shadow-lg shadow-purple-500/25">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{pipelineName}</p>
            <p className="text-xs text-gray-400">AI Pipeline Assistant</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[11px] text-green-400 font-medium">Online</span>
            </span>
          </div>
        </div>

        {/* Messages */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-2xl rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white'
                      : msg.type === 'success'
                        ? 'bg-green-500/10 border border-green-500/20 text-gray-100'
                        : msg.type === 'error'
                          ? 'bg-red-500/10 border border-red-500/20 text-gray-100'
                          : 'bg-[#1E293B] border border-[#2D3748] text-gray-100'
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {msg.content}
                    {msg.isStreaming && (
                      <span className="inline-block w-1.5 h-4 bg-purple-400 animate-pulse ml-1 align-text-bottom" />
                    )}
                  </div>
                  <div className="mt-1 text-[10px] opacity-40">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Input */}
        <div className="border-t border-[#1E293B] p-4 shrink-0">
          <div className="flex items-center gap-3 bg-[#0D1A2A] rounded-2xl border border-[#1E293B] p-2 transition-all duration-200 focus-within:border-purple-500/40 focus-within:shadow-glow-purple">
            <button className="p-2 hover:bg-[#1E293B] rounded-xl transition-colors" title="Attach file">
              <Paperclip size={18} className="text-gray-400" />
            </button>
            <button className="p-2 hover:bg-[#1E293B] rounded-xl transition-colors" title="Voice input">
              <Mic size={18} className="text-gray-400" />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Describe your pipeline in plain English..."
              className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500 py-2 px-1"
              disabled={isGenerating}
            />
            <button
              onClick={handleSend}
              disabled={isGenerating || !input.trim()}
              className="p-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>

          {/* Suggestion chips */}
          {!isGenerating && (
            <div className="flex flex-wrap gap-2 mt-3">
              {suggestionChips.map((chip, i) => (
                <SuggestionChip key={i} onClick={chip.onClick}>
                  {chip.label}
                </SuggestionChip>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════╗
          ║  RIGHT PANEL — Pipeline Preview + Agent Activity            ║
          ╚══════════════════════════════════════════════════════════════╝ */}
      <div className="w-96 flex-shrink-0 space-y-4 overflow-y-auto hidden xl:block">
        {/* Pipeline Flow Canvas Preview */}
        <div className="bg-[#111827] rounded-2xl border border-[#1E293B] p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-white flex items-center gap-2">
              <GitBranch size={14} className="text-purple-400" />
              Pipeline Flow
            </h3>
            {pipelineData && (
              <button className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
                Full View →
              </button>
            )}
          </div>
          <div
            className="h-48 rounded-xl overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0D1A2A, #111827)' }}
          >
            <PipelineCanvas
              pipeline={pipelineData}
              compact
            />
          </div>
        </div>

        {/* Agent Activity Feed */}
        <div className="bg-[#111827] rounded-2xl border border-[#1E293B] p-4">
          <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
            <Cpu size={14} className="text-cyan-400" />
            Agent Activity
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {isGenerating ? (
              <>
                <ActivityLog agent="Intent Parser" message="Parsing user request..." status="running" />
                <ActivityLog agent="Extraction Agent" message="Connecting to PostgreSQL..." status="running" />
                <ActivityLog agent="Transformer Agent" message="Generating transformation logic..." status="running" />
                <ActivityLog agent="Loader Agent" message="Preparing Snowflake schema..." status="running" />
              </>
            ) : pipelineData ? (
              <>
                <ActivityLog agent="Intent Parser" message="Pipeline intent parsed" status="success" />
                <ActivityLog agent="Extraction Agent" message="Data extracted from PostgreSQL" status="success" />
                <ActivityLog agent="Transformer Agent" message="Transformation complete" status="success" />
                <ActivityLog agent="Loader Agent" message="Loaded to Snowflake" status="success" />
              </>
            ) : (
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <Clock size={14} />
                Waiting for pipeline request...
              </p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-[#111827] rounded-2xl border border-[#1E293B] p-4">
          <h3 className="text-sm font-medium text-white mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            <button className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#1E293B] rounded-xl text-sm text-gray-300 hover:text-white hover:bg-[#2D3748] transition-colors">
              <Save size={14} /> Save
            </button>
            <button
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl text-sm font-medium text-white hover:opacity-90 transition-opacity"
              disabled={!pipelineData}
            >
              <Send size={14} /> Deploy
            </button>
            <button className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#1E293B] rounded-xl text-sm text-gray-300 hover:text-white hover:bg-[#2D3748] transition-colors">
              <Copy size={14} /> Copy
            </button>
            <button className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#1E293B] rounded-xl text-sm text-gray-300 hover:text-white hover:bg-[#2D3748] transition-colors">
              <RefreshCw size={14} /> Reset
            </button>
          </div>
        </div>
      </div>

      {/* Mobile tab bar */}
      <div className="xl:hidden fixed bottom-0 left-0 right-0 bg-[#050816] border-t border-[#1E293B] p-2 flex gap-1 z-50">
        {['Chat', 'Canvas', 'Agents'].map((tab) => (
          <button
            key={tab}
            className="flex-1 py-2 px-3 rounded-xl text-xs font-medium text-gray-400 hover:text-white hover:bg-[#1E293B] transition-colors"
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PipelineBuilderPage;
