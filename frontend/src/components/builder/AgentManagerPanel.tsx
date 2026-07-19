import React from 'react';
import { useAgentStore } from '../../store/agentStore';

const AgentManagerPanel: React.FC = () => {
  const { agents, activityLog, isPipelineRunning, lastSync } = useAgentStore();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-900">AI Agents</p>
            <p className="text-[10px] text-gray-400">
              {agents.filter((a) => a.status === 'running').length} active
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {/* Current Activity Banner */}
        {isPipelineRunning && (
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-blue-500">
                <span className="inline-flex h-2 w-2 animate-ping rounded-full bg-blue-400 opacity-75" />
              </span>
              <p className="text-xs font-semibold text-blue-700">Pipeline Running</p>
            </div>
            <p className="mt-1 text-[11px] text-blue-600">
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
            ? 'bg-green-500 text-white'
            : isRunning
              ? 'bg-blue-500 text-white'
              : isError
                ? 'bg-red-500 text-white'
                : 'bg-gray-200 text-gray-500';

          const badgeStyle = isDone
            ? 'bg-green-100 text-green-700'
            : isRunning
              ? 'bg-blue-100 text-blue-700 animate-pulse'
              : isError
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-500';

          const barColor = isDone
            ? 'bg-green-500'
            : isRunning
              ? 'bg-blue-500'
              : 'bg-gray-300';

          return (
            <div key={agent.name} className="flex gap-3">
              {/* Step connector */}
              <div className="flex flex-col items-center">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${iconBg} shadow-sm`}>
                  {isRunning ? (
                    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <div
                    className={`mt-1 w-0.5 flex-1 min-h-[20px] rounded-full ${
                      isDone ? 'bg-green-300' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-gray-900">{agent.name}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${badgeStyle}`}>
                    {isDone ? 'Done' : isRunning ? 'Running' : isError ? 'Error' : 'Pending'}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-gray-500">{agent.description}</p>

                {/* Progress bar */}
                {(isRunning || isDone) && (
                  <div className="mt-2">
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                        style={{ width: `${isDone ? 100 : (agent.progress ?? 0)}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-[10px] text-gray-400">
                      {isDone ? '100%' : `${agent.progress ?? 0}%`}
                    </p>
                  </div>
                )}

                {/* Log entry */}
                {agent.log && (
                  <div className="mt-1.5 rounded-lg bg-gray-50 px-2.5 py-1.5">
                    <p className="font-mono text-[10px] text-gray-500 leading-relaxed">
                      {agent.log}
                    </p>
                  </div>
                )}

                {/* Status indicator for idle/error */}
                {isError && (
                  <div className="mt-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 border border-red-100">
                    <p className="text-[10px] text-red-600 font-medium">
                      Agent encountered an issue
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Activity Log Section */}
      <div className="border-t border-gray-100">
        <div className="px-4 py-2 border-b border-gray-50">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            📋 Activity Log
          </p>
        </div>
        <div className="max-h-[150px] overflow-y-auto px-4 py-2 space-y-1 scrollbar-thin">
          {activityLog.length === 0 ? (
            <p className="text-[11px] text-gray-400 italic py-2">No activity yet</p>
          ) : (
            activityLog.map((entry, index) => (
              <div
                key={index}
                className="text-[11px] text-gray-600 border-b border-gray-50 py-1 last:border-0"
              >
                <span className="text-gray-400 font-mono">{entry.time}</span>
                {' '}
                <span className="font-medium text-gray-700">{entry.agent}:</span>
                {' '}
                <span className="text-gray-500">{entry.message}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-medium text-gray-500">Last sync</p>
          <div className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isPipelineRunning ? 'bg-blue-500 animate-pulse' : 'bg-green-500'
              }`}
            />
            <p className="text-[10px] text-gray-600">
              {lastSync || 'Just now'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentManagerPanel;
