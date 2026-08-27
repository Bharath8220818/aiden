import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, X, Sparkles, CheckCircle, ChevronRight } from 'lucide-react';
import api from '../../api/index';

export interface CopilotMessage {
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
  actions?: Array<{ label: string; type: 'add-node' | 'add-edge' | 'remove' | 'modify'; payload?: unknown }>;
  timestamp: number;
}

interface AICopilotPanelProps {
  isOpen: boolean;
  onClose: () => void;
  architectureContext: {
    nodes: Array<{ id: string; label: string; category: string; service: string; status: string; metrics?: Record<string, string> }>;
    edges: Array<{ source: string; target: string; label?: string; edgeType?: string }>;
    architectureName?: string;
  };
  onAction?: (action: { type: string; payload?: unknown }) => void;
}

const QUICK_ACTIONS = [
  'Find bottlenecks',
  'Improve this architecture',
  'Add monitoring',
  'Add security',
  'Make it production ready',
  'Generate Terraform',
  'Analyze costs',
  'Add disaster recovery',
];

export default function AICopilotPanel({ isOpen, onClose, architectureContext, onAction }: AICopilotPanelProps) {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  const sendMessage = useCallback(async (text?: string) => {
    const query = (text || input).trim();
    if (!query || isLoading) return;

    const userMsg: CopilotMessage = { role: 'user', content: query, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await api.post('/api/v1/architecture/copilot', {
        message: query,
        architecture: {
          name: architectureContext.architectureName || 'Untitled Architecture',
          components: architectureContext.nodes.map((n) => ({
            id: n.id,
            name: n.label,
            category: n.category,
            service: n.service,
            status: n.status,
            metrics: n.metrics,
          })),
          connections: architectureContext.edges.map((e) => ({
            source: e.source,
            target: e.target,
            label: e.label,
            edgeType: e.edgeType,
          })),
        },
      }, { timeout: 60000 });

      const data = response.data;
      const assistantMsg: CopilotMessage = {
        role: 'assistant',
        content: data.response || data.message || 'I analyzed the architecture but had no specific findings.',
        suggestions: data.suggestions || [],
        actions: data.actions || [],
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to get response';
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `⚠️ Unable to reach the AI copilot: ${msg}. Make sure the backend is running.`,
        timestamp: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, architectureContext]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    sendMessage(suggestion);
  }, [sendMessage]);

  const handleActionClick = useCallback((action: NonNullable<CopilotMessage['actions']>[number]) => {
    if (onAction) {
      onAction({ type: action.type, payload: action.payload });
    }
  }, [onAction]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: 320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 320, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="absolute right-0 top-0 bottom-0 w-[340px] z-50 flex flex-col border-l border-[#1F2937] bg-[#0E131D] shadow-2xl pointer-events-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1F2937] shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-cyan-500">
                <Bot size={12} className="text-white" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[var(--color-text)]">AIDEN COPILOT</h3>
                <p className="text-[10px] text-[var(--color-text-muted)]">
                  Context: {architectureContext.architectureName || 'Current Architecture'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 rounded hover:bg-white/5 text-[var(--color-text-muted)]">
              <X size={14} />
            </button>
          </div>

          {/* Architecture summary badge */}
          <div className="px-4 py-2 border-b border-[#1F2937]/50 bg-[#111827]/50 shrink-0">
            <div className="flex items-center gap-3 text-[10px] text-[var(--color-text-muted)]">
              <span>{architectureContext.nodes.length} components</span>
              <span>{architectureContext.edges.length} connections</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {architectureContext.nodes.filter((n) => n.status === 'healthy').length} healthy
              </span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <Sparkles size={24} className="mx-auto text-purple-400 mb-3 opacity-50" />
                <p className="text-xs text-[var(--color-text-muted)] font-medium mb-1">Ask about this architecture</p>
                <p className="text-[10px] text-[var(--color-text-muted)] opacity-60">
                  Select a node and ask AIDEN to analyze it
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-purple-600/20 text-purple-200 border border-purple-500/20'
                      : 'bg-[#111827] text-[var(--color-text-secondary)] border border-[#1F2937]'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Bot size={10} className="text-purple-400" />
                      <span className="text-[10px] font-semibold text-purple-400">AIDEN</span>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {/* Suggestion chips */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {msg.suggestions.map((s, j) => (
                        <button
                          key={j}
                          onClick={() => handleSuggestionClick(s)}
                          className="flex items-center gap-1 rounded-full bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-[10px] text-purple-300 hover:bg-purple-500/20 transition"
                        >
                          <ChevronRight size={8} />
                          {s}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Action buttons */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {msg.actions.map((action, j) => (
                        <button
                          key={j}
                          onClick={() => handleActionClick(action)}
                          className="flex items-center gap-1.5 w-full rounded-lg bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1.5 text-[10px] text-cyan-300 hover:bg-cyan-500/20 transition text-left"
                        >
                          <CheckCircle size={10} />
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[#111827] border border-[#1F2937] rounded-xl px-3 py-2 text-xs text-[var(--color-text-muted)]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse [animation-delay:150ms]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse [animation-delay:300ms]" />
                    <span className="ml-1">Analyzing architecture...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick actions (show when no messages) */}
          {messages.length === 0 && (
            <div className="px-4 pb-2 shrink-0">
              <p className="text-[10px] text-[var(--color-text-muted)] mb-1.5 font-medium">Quick actions</p>
              <div className="flex flex-wrap gap-1">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action}
                    onClick={() => sendMessage(action)}
                    className="rounded-full bg-[#111827] border border-[#1F2937] px-2 py-0.5 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white/5 transition"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-4 py-3 border-t border-[#1F2937] shrink-0">
            <div className="flex items-end gap-2 bg-[#111827] border border-[#1F2937] rounded-xl px-3 py-2 focus-within:border-purple-500/30 transition">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about this architecture..."
                rows={1}
                className="flex-1 bg-transparent text-xs text-[var(--color-text)] placeholder-[var(--color-text-muted)] resize-none outline-none max-h-20"
                style={{ minHeight: '20px' }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                className="p-1.5 rounded-lg bg-purple-600 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-purple-500 transition shrink-0"
              >
                <Send size={12} />
              </button>
            </div>
            <p className="text-[9px] text-[var(--color-text-muted)] mt-1 opacity-50">
              Enter to send · Shift+Enter for newline
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
