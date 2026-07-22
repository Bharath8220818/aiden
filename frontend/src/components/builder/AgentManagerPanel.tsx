import React from 'react';
import { useAgentStore } from '../../store/agentStore';
import { Bot, Activity, CheckCircle, AlertCircle, Clock, Cpu } from 'lucide-react';

interface AgentLog {
  name: string;
  status: 'idle' | 'running' | 'success' | 'error';
  message: string;
}

interface AgentManagerPanelProps {
  logs?: AgentLog[];
  compact?: boolean;
}

const statusIcons: Record<string, React.ReactNode> = {
  idle: <Clock size={12} className="text-gray-500" />,
  running: <Activity size={12} className="text-purple-400 animate-pulse" />,
  success: <CheckCircle size={12} className="text-green-400" />,
  error: <AlertCircle size={12} className="text-red-400" />,
};

const statusColors: Record<string, string> = {
  idle: 'bg-gray-500/20 text-gray-400',
  running: 'bg-purple-500/20 text-purple-400',
  success: 'bg-green-500/20 text-green-400',
  error: 'bg-red-500/20 text-red-400',
};

const AgentManagerPanel: React.FC<AgentManagerPanelProps> = ({ logs, compact = false }) => {
  const { agents, activityLog, isPipelineRunning, lastSync } = useAgentStore();

  const agentLogs = logs || agents.map((a) => ({
    name: a.name,
    status: a.status as 'idle' | 'running' | 'success' | 'error',
    message: a.description || a.log || 'Waiting...',
  }));

  // ── Compact mode (used in the right-panel of the AI Workspace) ────────
  if (compact) {
    return (
      <div className="bg-[#111827] rounded-2xl border border-[#1E293B] p-4">
        <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <Cpu size={14} className="text-purple-400" />
          Agents
        </h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {agentLogs.length === 0 ? (
            <p className="text-sm text-gray-500">Waiting for tasks...</p>
          ) : (
            agentLogs.map((log, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                {statusIcons[log.status] || statusIcons.idle}
                <span className="text-gray-200">{log.name}</span>
                <span className="text-gray-500">— {log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // ── Full panel version ───────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-[#1E293B] px-5 py-4 bg-[#111827]">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-cyan-600 shadow-lg shadow-purple-500/25">
            <Bot size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">AI Agents</p>
            <p className="text-[11px] text-gray-400">
              {agents.filter((a) => a.status === 'running').length} active · {agents.length} total
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin bg-[#111827]">
        {/* Current Activity Banner */}
        {isPipelineRunning && (
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-purple-500">
                <span className="inline-flex h-2 w-2 animate-ping rounded-full bg-purple-400 opacity-75" />
              </span>
              <p className="text-xs font-semibold text-purple-300">Pipeline Running</p>
            </div>
            <p className="mt-1 text-[11px] text-purple-400/60">
              Agents are processing your pipeline
            </p>
          </div>
        )}

        {/* Agent Steps */}
        {agents.map((agent, idx) => {
          const isDone = agent.status === 'success';
          const isRunning = agent.status === 'running';
          const isError = agent.status === 'error';

          const iconBg = isDone
            ? 'bg-gradient-to-br from-green-600 to-green-500 shadow-green-500/30'
            : isRunning
              ? 'bg-gradient-to-br from-purple-600 to-cyan-600 shadow-purple-500/30'
              : isError
                ? 'bg-gradient-to-br from-red-600 to-red-500 shadow-red-500/30'
                : 'bg-white/5';

          const barColor = isDone
            ? 'bg-green-500'
            : isRunning
              ? 'bg-gradient-to-r from-purple-500 to-cyan-500'
              : 'bg-white/10';

          return (
            <div key={agent.name} className="flex gap-3">
              {/* Step connector */}
              <div className="flex flex-col items-center">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${iconBg} shadow-sm transition-all duration-300`}>
                  {isRunning ? (
                    <svg className="h-3.5 w-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {isDone ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      ) : isError ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      )}
                    </svg>
                  )}
                </div>
                {idx < agents.length - 1 && (
                  <div className={`mt-1 w-0.5 flex-1 min-h-[16px] rounded-full ${isDone ? 'bg-green-500/40' : 'bg-white/10'}`} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-200">{agent.name}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColors[agent.status] || statusColors.idle}`}>
                    {isDone ? 'Done' : isRunning ? 'Running' : isError ? 'Error' : 'Idle'}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-500">{agent.description}</p>

                {/* Progress bar */}
                {(isRunning || isDone) && (
                  <div className="mt-2">
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                        style={{ width: `${isDone ? 100 : (agent.progress ?? 0)}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-[10px] text-gray-500">
                      {isDone ? '100%' : `${agent.progress ?? 0}%`}
                    </p>
                  </div>
                )}

                {/* Log entry */}
                {agent.log && (
                  <div className="mt-1.5 rounded-lg bg-white/5 px-2.5 py-1.5">
                    <p className="font-mono text-[10px] text-gray-400 leading-relaxed">
                      {agent.log}
                    </p>
                  </div>
                )}

                {/* Error state */}
                {isError && (
                  <div className="mt-1.5 rounded-lg bg-red-500/10 px-2.5 py-1.5 border border-red-500/20">
                    <p className="text-[10px] text-red-400 font-medium">Agent encountered an issue</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Activity Log Section */}
      <div className="border-t border-[#1E293B] bg-[#111827]">
        <div className="px-4 py-2 border-b border-[#1E293B]">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            📋 Activity Log
          </p>
        </div>
        <div className="max-h-[150px] overflow-y-auto px-4 py-2 space-y-1 scrollbar-thin bg-[#111827]">
          {activityLog.length === 0 ? (
            <p className="text-[11px] text-gray-500 italic py-2">No activity yet</p>
          ) : (
            activityLog.map((entry, index) => (
              <div
                key={index}
                className="text-[11px] text-gray-400 border-b border-[#1E293B] py-1 last:border-0"
              >
                <span className="text-gray-600 font-mono">{entry.time}</span>
                {' '}
                <span className="font-medium text-gray-300">{entry.agent}:</span>
                {' '}
                <span className="text-gray-500">{entry.message}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-[#1E293B] bg-[#0D1A2A] px-4 py-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-medium text-gray-500">Last sync</p>
          <div className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isPipelineRunning ? 'bg-purple-500 animate-pulse' : 'bg-green-500'
              }`}
            />
            <p className="text-[10px] text-gray-400">
              {lastSync || 'Just now'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentManagerPanel;
