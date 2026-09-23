import React, { useEffect, useRef, useState } from 'react';
import { AiChatMessage, AiSuggestion } from '../types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { Sparkles, Send, Copy, Check, ArrowUpNarrowWide, Wand2, DollarSign, Gauge, Lightbulb } from 'lucide-react';

export interface AiAssistantPanelProps {
  messages: AiChatMessage[];
  suggestions: AiSuggestion[];
  isChatLoading: boolean;
  isSuggestionsLoading: boolean;
  onLoadSuggestions: () => void;
  onAsk: (prompt: string) => void;
  onApplySql: (sql: string) => void;
}

const SUGGESTION_ICON = {
  optimization: <Gauge className="w-3.5 h-3.5" />,
  index: <ArrowUpNarrowWide className="w-3.5 h-3.5" />,
  rewrite: <Wand2 className="w-3.5 h-3.5" />,
  cost: <DollarSign className="w-3.5 h-3.5" />,
};

const SUGGESTION_ACCENT = {
  optimization: 'text-indigo-600 bg-indigo-500/10 border-indigo-500/30',
  index: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30',
  rewrite: 'text-cyan-600 bg-cyan-500/10 border-cyan-500/30',
  cost: 'text-amber-600 bg-amber-500/10 border-amber-500/30',
};

const QUICK_PROMPTS = [
  'Top 20 customers by lifetime revenue',
  'Monthly refund rate trend',
  'Explain this query simply',
];

export const AiAssistantPanel: React.FC<AiAssistantPanelProps> = ({
  messages,
  suggestions,
  isChatLoading,
  isSuggestionsLoading,
  onLoadSuggestions,
  onAsk,
  onApplySql,
}) => {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isChatLoading]);

  const send = () => {
    if (!input.trim() || isChatLoading) return;
    onAsk(input.trim());
    setInput('');
  };

  const copySql = (msg: AiChatMessage) => {
    if (!msg.sql) return;
    navigator.clipboard.writeText(msg.sql);
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-primary">Ask AIDEN</span>
        </div>
        <Badge variant="ai" size="sm" dot pulse={isChatLoading}>
          {isChatLoading ? 'thinking' : 'online'}
        </Badge>
      </div>

      {/* Suggestions */}
      <div className="p-3 border-b border-border space-y-2">
        <button
          onClick={onLoadSuggestions}
          disabled={isSuggestionsLoading}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-semibold rounded-md border border-dashed border-border-highlight text-text-secondary hover:border-indigo-500/50 hover:text-indigo-600 transition-all disabled:opacity-50"
        >
          <Lightbulb className="w-3 h-3" />
          {isSuggestionsLoading ? 'Analyzing query…' : 'Analyze current query for optimizations'}
        </button>

        {suggestions.map((sug) => (
          <div key={sug.id} className="p-2.5 rounded-lg bg-card border border-border space-y-1.5">
            <div className="flex items-start gap-2">
              <span className={cn('p-1 rounded-md border shrink-0', SUGGESTION_ACCENT[sug.kind])}>
                {SUGGESTION_ICON[sug.kind]}
              </span>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-text-primary leading-snug">{sug.title}</div>
                <p className="text-[10px] text-text-secondary leading-snug mt-0.5">{sug.explanation}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Badge variant="success" size="sm">{sug.estimatedGain}</Badge>
              {sug.optimizedSql && (
                <Button variant="ghost" size="sm" onClick={() => onApplySql(sug.optimizedSql!)} className="text-[10px] h-6">
                  Apply to editor
                </Button>
              )}
            </div>
            {sug.optimizedSql && (
              <pre className="p-2 rounded bg-background border border-border-subtle text-[9px] font-mono text-text-secondary overflow-x-auto max-h-24">
                {sug.optimizedSql}
              </pre>
            )}
          </div>
        ))}
      </div>

      {/* Chat thread */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Describe what you want to analyze and AIDEN writes the SQL — schema-aware, warehouse-dialect correct.
            </p>
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => onAsk(p)}
                className="w-full text-left px-2.5 py-1.5 rounded-md bg-card border border-border text-[11px] text-text-secondary hover:text-text-primary hover:border-border-highlight transition-all"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'max-w-[92%] rounded-lg px-2.5 py-2 space-y-1.5',
                msg.role === 'user'
                  ? 'bg-indigo-500/15 border border-indigo-500/30'
                  : 'bg-card border border-border'
              )}
            >
              <p className="text-[11px] text-text-primary leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              {msg.sql && (
                <>
                  <pre className="p-2 rounded bg-background border border-border-subtle text-[9px] font-mono text-text-secondary overflow-x-auto max-h-40">
                    {msg.sql}
                  </pre>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => copySql(msg)}
                      className="flex items-center gap-1 text-[9px] text-text-muted hover:text-text-primary px-1.5 py-0.5 rounded hover:bg-card-active transition-all"
                    >
                      {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      Copy
                    </button>
                    <button
                      onClick={() => onApplySql(msg.sql!)}
                      className="flex items-center gap-1 text-[9px] text-indigo-600 hover:text-indigo-200 px-1.5 py-0.5 rounded hover:bg-indigo-500/10 transition-all"
                    >
                      → Editor
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}

        {isChatLoading && (
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-card border border-border w-fit">
            {[0, 1, 2].map((i) => (
              <span key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
            ))}
            <span className="text-[10px] text-text-muted ml-1">AIDEN is writing SQL…</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={2}
            placeholder="e.g. Show refund rate by month…"
            className="flex-1 bg-card text-text-primary placeholder-[#9CA3AF] text-[11px] rounded-md border border-border px-2.5 py-2 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/80 resize-none"
          />
          <Button variant="ai" size="icon" onClick={send} disabled={!input.trim() || isChatLoading} className="shrink-0">
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
