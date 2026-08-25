/**
 * AgentActivityPanel — Real-time dashboard showing orchestrator execution,
 * agent step-by-step progress, and connector health via WebSocket.
 */
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Play, CheckCircle, XCircle, Clock, Zap, Wifi, WifiOff,
  ChevronDown, ChevronRight, Send, RefreshCw, CircleDot,
  ArrowRight, Terminal, Database, Radio,
} from 'lucide-react';
import useAgentWebSocket, {
  type AgentRun,
  type AgentStep,
  type ConnectorHealthEvent,
} from '../../hooks/useAgentWebSocket';

// ── Status dot ────────────────────────────────────────────────────────

const StatusDot: React.FC<{ status: string; size?: 'sm' | 'md' | 'lg' }> = ({ status, size = 'md' }) => {
  const sizeClass = size === 'sm' ? 'w-1.5 h-1.5' : size === 'lg' ? 'w-3 h-3' : 'w-2 h-2';
  const colors: Record<string, string> = {
    running: 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]',
    success: 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]',
    healthy: 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]',
    failed: 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]',
    failure: 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]',
    error: 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]',
    pending: 'bg-gray-400',
    idle: 'bg-gray-500',
    degraded: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]',
  };
  return (
    <span className={`inline-block ${sizeClass} rounded-full ${colors[status] || 'bg-gray-500'} ${status === 'running' ? 'animate-pulse' : ''}`} />
  );
};

// ── Run card ──────────────────────────────────────────────────────────

const RunCard: React.FC<{
  run: AgentRun;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ run, isExpanded, onToggle }) => {
  const completedSteps = run.steps.filter((s) => s.status === 'success' || s.status === 'failed').length;
  const totalSteps = run.steps.length || run.agents_used.length;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border ${run.status === 'failure' ? 'border-red-500/30 bg-red-500/5' : run.status === 'success' ? 'border-green-500/20 bg-green-500/5' : 'border-[#1F2937] bg-[#111827]'} overflow-hidden`}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <StatusDot status={run.status} />
        <div className="flex-1 min-w-0">
          <p className="font-mono text-sm font-medium text-white truncate">
            {run.objective || run.run_id}
          </p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="font-mono text-[10px] text-gray-500">{run.run_id}</span>
            {run.intent && (
              <span className="font-mono text-[10px] text-purple-400">
                {run.intent.intent} ({(run.intent.confidence * 100).toFixed(0)}%)
              </span>
            )}
            {run.execution_time_ms !== undefined && (
              <span className="font-mono text-[10px] text-gray-500">
                {run.execution_time_ms < 1000 ? `${run.execution_time_ms.toFixed(0)}ms` : `${(run.execution_time_ms / 1000).toFixed(1)}s`}
              </span>
            )}
          </div>
        </div>

        {/* Agent badges */}
        <div className="hidden sm:flex items-center gap-1">
          {run.agents_used.slice(0, 4).map((agent) => (
            <span key={agent} className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
              {agent}
            </span>
          ))}
          {run.agents_used.length > 4 && (
            <span className="font-mono text-[9px] text-gray-500">+{run.agents_used.length - 4}</span>
          )}
        </div>

        {isExpanded ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />}
      </button>

      {/* Progress bar */}
      {run.status === 'running' && (
        <div className="h-0.5 bg-[#1F2937]">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      )}

      {/* Expanded details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-[#1F2937]"
          >
            <div className="px-4 py-3 space-y-2">
              {/* Tools used */}
              {run.tools_used.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[9px] text-gray-500 uppercase">Tools:</span>
                  {run.tools_used.map((tool) => (
                    <span key={tool} className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      {tool}
                    </span>
                  ))}
                </div>
              )}

              {/* Agent steps timeline */}
              {run.steps.length > 0 && (
                <div className="space-y-1.5">
                  {run.steps.map((step, i) => (
                    <StepRow key={i} step={step} index={i} />
                  ))}
                </div>
              )}

              {run.steps.length === 0 && run.status === 'running' && (
                <div className="flex items-center gap-2 py-2">
                  <RefreshCw size={12} className="animate-spin text-blue-400" />
                  <span className="font-mono text-xs text-gray-400">Executing...</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Step row ──────────────────────────────────────────────────────────

const StepRow: React.FC<{ step: AgentStep; index: number }> = ({ step, index }) => {
  const icons: Record<string, React.ReactNode> = {
    running: <RefreshCw size={12} className="animate-spin text-blue-400" />,
    success: <CheckCircle size={12} className="text-green-400" />,
    failed: <XCircle size={12} className="text-red-400" />,
    pending: <Clock size={12} className="text-gray-500" />,
  };

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded bg-[#0D1A2A]/50">
      <span className="font-mono text-[9px] text-gray-600 w-4">{index + 1}</span>
      {icons[step.status] || icons.pending}
      <span className="font-mono text-xs font-medium text-white">{step.agent}</span>
      {step.detail && (
        <span className="font-mono text-[10px] text-gray-400 truncate flex-1">{step.detail}</span>
      )}
      {step.execution_time_ms !== undefined && (
        <span className="font-mono text-[9px] text-gray-500 shrink-0">
          {step.execution_time_ms < 1000 ? `${step.execution_time_ms.toFixed(0)}ms` : `${(step.execution_time_ms / 1000).toFixed(1)}s`}
        </span>
      )}
    </div>
  );
};

// ── Connector health card ─────────────────────────────────────────────

const ConnectorCard: React.FC<{ name: string; event: ConnectorHealthEvent }> = ({ name, event }) => (
  <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-[#1F2937] bg-[#111827]">
    <StatusDot status={event.status} size="md" />
    <div className="flex-1 min-w-0">
      <p className="font-mono text-xs font-medium text-white">{name}</p>
      <p className="font-mono text-[10px] text-gray-500">{event.latency_ms.toFixed(0)}ms</p>
    </div>
    <span className={`font-mono text-[9px] uppercase ${event.status === 'healthy' ? 'text-green-400' : event.status === 'error' ? 'text-red-400' : 'text-amber-400'}`}>
      {event.status}
    </span>
  </div>
);

// ── Main panel ────────────────────────────────────────────────────────

export interface AgentActivityPanelProps {
  /** Show compact version (for embedding in dashboard) */
  compact?: boolean;
  /** Max runs to show */
  maxRuns?: number;
  /** Show execute input */
  showExecute?: boolean;
}

const AgentActivityPanel: React.FC<AgentActivityPanelProps> = ({
  compact = false,
  maxRuns = 20,
  showExecute = true,
}) => {
  const {
    connected,
    runs,
    latestRun,
    connectorHealth,
    notifications,
    execute,
    reconnect,
  } = useAgentWebSocket('aiden-dashboard', maxRuns);

  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [executeInput, setExecuteInput] = useState('');
  const [filter, setFilter] = useState<'all' | 'running' | 'success' | 'failure'>('all');

  const filteredRuns = useMemo(() => {
    if (filter === 'all') return runs;
    return runs.filter((r) => r.status === filter);
  }, [runs, filter]);

  const stats = useMemo(() => ({
    total: runs.length,
    running: runs.filter((r) => r.status === 'running').length,
    success: runs.filter((r) => r.status === 'success').length,
    failure: runs.filter((r) => r.status === 'failure').length,
  }), [runs]);

  const handleExecute = () => {
    if (executeInput.trim()) {
      execute(executeInput.trim());
      setExecuteInput('');
    }
  };

  const connectors = Object.entries(connectorHealth);

  return (
    <div className={`flex flex-col ${compact ? 'gap-3' : 'gap-4'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-purple-400" />
            <h2 className="font-mono text-sm font-bold text-white">
              {compact ? 'Agent Activity' : 'Real-Time Agent Activity'}
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            {connected ? (
              <><Wifi size={12} className="text-green-400" /><span className="font-mono text-[9px] text-green-400">LIVE</span></>
            ) : (
              <><WifiOff size={12} className="text-red-400" /><span className="font-mono text-[9px] text-red-400">OFFLINE</span></>
            )}
          </div>
        </div>
        <button onClick={reconnect} className="p-1.5 rounded hover:bg-white/5 text-gray-500 hover:text-gray-300 transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { label: 'Total', value: stats.total, color: 'text-gray-300', icon: Terminal },
          { label: 'Running', value: stats.running, color: 'text-blue-400', icon: Play },
          { label: 'Success', value: stats.success, color: 'text-green-400', icon: CheckCircle },
          { label: 'Failed', value: stats.failure, color: 'text-red-400', icon: XCircle },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#1F2937] bg-[#0D1A2A]">
            <Icon size={11} className={color} />
            <span className={`font-mono text-xs font-bold ${color}`}>{value}</span>
            <span className="font-mono text-[8px] uppercase tracking-wider text-gray-500">{label}</span>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1">
        {(['all', 'running', 'success', 'failure'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`font-mono text-[10px] px-2.5 py-1 rounded transition-colors ${
              filter === f
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== 'all' && (
              <span className="ml-1">{stats[f === 'failure' ? 'failure' : f]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Execute input */}
      {showExecute && (
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Terminal size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={executeInput}
              onChange={(e) => setExecuteInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleExecute()}
              placeholder="Ask AIDEN anything... (e.g. 'why is customer_etl failing?')"
              className="w-full font-mono text-xs pl-9 pr-3 py-2 rounded-lg border border-[#1F2937] bg-[#0D1A2A] text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
            />
          </div>
          <button
            onClick={handleExecute}
            disabled={!executeInput.trim() || !connected}
            className="p-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={14} className="text-white" />
          </button>
        </div>
      )}

      {/* Runs list */}
      <div className={`space-y-2 ${compact ? 'max-h-[400px]' : 'max-h-[600px]'} overflow-y-auto scrollbar-thin`}>
        {filteredRuns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CircleDot size={28} className="text-gray-600 mb-2" />
            <p className="font-mono text-xs text-gray-500">
              {connected ? 'No agent runs yet. Type a question above to start.' : 'Connecting to AIDEN server...'}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredRuns.map((run) => (
              <RunCard
                key={run.run_id}
                run={run}
                isExpanded={expandedRunId === run.run_id}
                onToggle={() => setExpandedRunId(expandedRunId === run.run_id ? null : run.run_id)}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Connector health (shown when compact or if there are entries) */}
      {!compact && connectors.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Database size={12} className="text-cyan-400" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-gray-500">Connector Health</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {connectors.map(([name, event]) => (
              <ConnectorCard key={name} name={name} event={event} />
            ))}
          </div>
        </div>
      )}

      {/* Notifications (compact list) */}
      {!compact && notifications.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Radio size={12} className="text-amber-400" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-gray-500">Notifications</span>
          </div>
          <div className="space-y-1">
            {notifications.slice(0, 5).map((n, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#0D1A2A] border border-[#1F2937]">
                <span className="font-mono text-[9px] text-gray-500 shrink-0">
                  {new Date(n.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                </span>
                <span className="font-mono text-xs text-gray-300 truncate">{n.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentActivityPanel;
