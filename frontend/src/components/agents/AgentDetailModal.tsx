import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, Cpu, Database, Clock, AlertCircle } from 'lucide-react';
import { useAgentStore } from '../../store/agentStore';

const AgentDetailModal: React.FC = () => {
  const { selectedAgent, selectAgent } = useAgentStore();

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') selectAgent(null);
    };
    if (selectedAgent) {
      document.addEventListener('keydown', handleKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [selectedAgent, selectAgent]);

  if (!selectedAgent) return null;

  const a = selectedAgent;
  const isError = a.status === 'error';
  const isRunning = a.status === 'running';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={() => selectAgent(null)}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', duration: 0.4, bounce: 0.25 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border border-[#1E293B] bg-[#0D1A2A] shadow-2xl shadow-purple-500/10"
        >
          {/* Close */}
          <button
            onClick={() => selectAgent(null)}
            className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={16} />
          </button>

          {/* Header */}
          <div className="p-6 pb-4 border-b border-[#1E293B]/40">
            <div className="flex items-start gap-4">
              <span className="text-2xl">{a.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="font-mono text-xl font-bold text-white">{a.name}</h2>
                  <span className={`font-mono text-[11px] font-semibold px-2 py-0.5 rounded border ${
                    isRunning ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                    isError ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                    'bg-gray-500/20 text-gray-400 border-gray-500/30'
                  }`}>
                    {isRunning ? 'RUNNING' : isError ? 'ERROR' : 'IDLE'}
                  </span>
                </div>
                <p className="font-mono text-sm text-gray-400">{a.role}</p>
                <p className="font-mono text-xs text-gray-500 mt-1">{a.currentTask}</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Tasks', value: a.tasksCompleted.toLocaleString(), icon: CheckCircle, color: 'text-green-400' },
                { label: 'CPU', value: `${a.cpuUsage}%`, icon: Cpu, color: 'text-purple-400' },
                { label: 'Memory', value: a.memoryUsage, icon: Database, color: 'text-cyan-400' },
                { label: 'Uptime', value: a.uptime, icon: Clock, color: 'text-amber-400' },
              ].map((metric) => {
                const Icon = metric.icon;
                return (
                  <div key={metric.label} className="bg-[#050816] border border-[#1E293B]/40 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon size={14} className={metric.color} />
                      <span className="font-mono text-[8px] uppercase tracking-[0.15em] text-gray-500">
                        {metric.label}
                      </span>
                    </div>
                    <p className="font-mono text-lg font-bold text-white tracking-tight">{metric.value}</p>
                  </div>
                );
              })}
            </div>

            {/* CPU bar */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[10px] text-gray-400">CPU Load</span>
                <span className="font-mono text-[10px] text-gray-500">{a.cpuUsage}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#1E293B]">
                <div
                  className={`h-full rounded-full transition-all ${
                    a.cpuUsage > 80 ? 'bg-red-500' : a.cpuUsage > 40 ? 'bg-amber-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${a.cpuUsage}%` }}
                />
              </div>
            </div>

            {/* Error banner (with left alarm strip) */}
            {a.lastError && (
              <div className="relative bg-red-500/10 border border-red-500/20 rounded-lg p-3 pl-4">
                <div className="absolute left-0 top-0 w-0.5 h-full bg-red-500 rounded-l" />
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-mono text-xs font-semibold text-red-300">Last Error</p>
                    <p className="font-mono text-[10px] text-red-400/80 mt-0.5">{a.lastError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Activity log (terminal-style) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400">Activity Log</span>
                <span className="font-mono text-[9px] text-gray-500">{a.uptime} uptime</span>
              </div>
              <div className="bg-[#050816] border border-[#1E293B]/40 rounded-lg p-3 max-h-48 overflow-y-auto space-y-1">
                {a.logs.map((log, i) => (
                  <div key={i} className="flex items-start gap-2 font-mono text-[10px] text-gray-400">
                    <span className="text-gray-600">$</span>
                    <span className="leading-relaxed">{log}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AgentDetailModal;
