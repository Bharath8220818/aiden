import React from 'react';
import { SwarmMessage } from '../types';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { ArrowRight, HelpCircle, ShieldQuestion, CheckCircle2, Radio } from 'lucide-react';

export interface SwarmFeedProps {
  messages: SwarmMessage[];
  isLoading: boolean;
}

const KIND_META: Record<SwarmMessage['kind'], { icon: JSX.Element; badge: 'ai' | 'warning' | 'success' | 'info' }> = {
  handoff: { icon: <ArrowRight className="w-3 h-3" />, badge: 'ai' },
  question: { icon: <HelpCircle className="w-3 h-3" />, badge: 'warning' },
  approval_request: { icon: <ShieldQuestion className="w-3 h-3" />, badge: 'warning' },
  result: { icon: <CheckCircle2 className="w-3 h-3" />, badge: 'success' },
};

export const SwarmFeed: React.FC<SwarmFeedProps> = ({ messages, isLoading }) => {
  if (isLoading) {
    return (
      <div className="p-3 space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-3 space-y-1.5">
      {messages.map((msg) => {
        const meta = KIND_META[msg.kind];
        return (
          <div key={msg.id} className="p-2.5 rounded-md bg-card border border-border-subtle space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap text-[9px] font-mono">
              <span className="text-indigo-600 font-bold">{msg.from}</span>
              <ArrowRight className="w-3 h-3 text-text-muted" />
              <span className={msg.to === 'broadcast' ? 'text-amber-600 font-bold' : 'text-cyan-600 font-bold'}>
                {msg.to === 'broadcast' ? 'all agents' : msg.to}
              </span>
              <Badge variant={meta.badge} size="sm" className="ml-auto">
                {meta.icon}
                <span className="ml-0.5">{msg.kind.replace('_', ' ')}</span>
              </Badge>
            </div>
            <p className="text-[10px] text-text-primary leading-snug">{msg.summary}</p>
            <span className="text-[9px] text-text-muted font-mono">{new Date(msg.ts).toLocaleTimeString()}</span>
          </div>
        );
      })}

      {messages.length === 0 && (
        <p className="text-[10px] text-text-muted flex items-center gap-1.5 justify-center py-4">
          <Radio className="w-3 h-3" /> No inter-agent traffic in the last hour.
        </p>
      )}
    </div>
  );
};
