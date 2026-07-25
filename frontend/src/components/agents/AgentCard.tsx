// src/components/agents/AgentCard.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import type { Agent } from '../../store/agentStore';

interface AgentCardProps {
  agent: Agent;
  onSelect: (agent: Agent) => void;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, onSelect }) => {
  const isRunning = agent.status === 'running';
  const isError = agent.status === 'error';
  const isIdle = agent.status === 'idle' || agent.status === 'success';

  // Keep the card boundary neutral; status is communicated by the dot and label.
  const cardBorder = isError ? 'border-red-500/40' : 'border-[#1E293B]/40';

  const errorStrip = isError ? 'border-l-2 border-l-red-500' : '';

  const statusDot = isRunning
    ? 'w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'
    : isError
      ? 'w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
      : 'w-2 h-2 rounded-full bg-gray-500';

  const statusLabel = isRunning ? 'Running' : isError ? 'Error' : isIdle ? 'Idle' : '—';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative cursor-pointer rounded-xl border bg-[#0D1A2A] shadow-sm transition-all duration-200 hover:shadow-glow-purple ${cardBorder} ${errorStrip}`}
      onClick={() => onSelect(agent)}
    >
      <div className="relative p-4">
        {/* Header: icon, name, status */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg leading-none">{agent.icon}</span>
            <span className="font-mono text-sm font-bold text-white truncate">{agent.name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`${statusDot}`} />
            <span className="font-mono text-[9px] font-semibold uppercase tracking-wide text-gray-400">
              {statusLabel}
            </span>
          </div>
        </div>
        <p className="font-mono text-[10px] text-gray-500 mt-0.5">{agent.role}</p>

        {/* Metrics – primary visual weight */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="bg-[#050816] rounded border border-[#1E293B]/40 p-2 text-center">
            <p className="font-mono text-[8px] uppercase tracking-[0.15em] text-gray-500">Tasks</p>
            <p className="font-mono text-sm font-bold text-white tracking-tight">
              {agent.tasksCompleted.toLocaleString()}
            </p>
          </div>
          <div className="bg-[#050816] rounded border border-[#1E293B]/40 p-2">
            <p className="font-mono text-[8px] uppercase tracking-[0.15em] text-gray-500 text-center">CPU</p>
            <div className="flex items-center gap-1 mt-1">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#1E293B]">
                <div
                  className={`h-full rounded-full transition-all ${
                    agent.cpuUsage > 80 ? 'bg-red-500' : agent.cpuUsage > 40 ? 'bg-amber-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${agent.cpuUsage}%` }}
                />
              </div>
              <span className="font-mono text-[10px] font-semibold text-gray-300">
                {agent.cpuUsage}%
              </span>
            </div>
          </div>
          <div className="bg-[#050816] rounded border border-[#1E293B]/40 p-2 text-center">
            <p className="font-mono text-[8px] uppercase tracking-[0.15em] text-gray-500">Memory</p>
            <p className="font-mono text-sm font-bold text-white tracking-tight">
              {agent.memoryUsage}
            </p>
          </div>
        </div>

        {/* Current task (terminal-style) */}
        <div className="mt-3 flex items-center gap-2 bg-[#050816]/50 rounded border border-[#1E293B]/40 px-2 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="font-mono text-[10px] text-gray-400 truncate">
            <span className="text-gray-500">$</span> {agent.currentTask}
          </span>
        </div>

        {/* Error banner (compact) */}
        {agent.lastError && (
          <div className="mt-2 flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded px-2 py-1.5">
            <AlertCircle size={12} className="text-red-400 mt-0.5 shrink-0" />
            <span className="font-mono text-[10px] text-red-300 truncate">{agent.lastError}</span>
          </div>
        )}

        {/* Footer: uptime + status dot */}
        <div className="mt-3 flex items-center justify-between border-t border-[#1E293B]/30 pt-2">
          <span className="font-mono text-[9px] text-gray-500">uptime {agent.uptime}</span>
          <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-500'}`} />
        </div>
      </div>
    </motion.div>
  );
};

export default AgentCard;
