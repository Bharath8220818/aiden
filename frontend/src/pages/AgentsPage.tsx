import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles, Cpu, RefreshCw, Clock, AlertCircle, Search, Activity,
} from 'lucide-react';
import { useAgentStore } from '../store/agentStore';
import AgentCard from '../components/agents/AgentCard';
import AgentDetailModal from '../components/agents/AgentDetailModal';

// ─── Compact stats indicator ─────────────────────────────────────────
const StatsIndicator: React.FC<{
  label: string;
  value: number;
  icon: React.FC<{ className?: string }>;
  active?: boolean;
}> = ({ label, value, icon: Icon, active = false }) => (
  <div className={`flex items-center gap-2 rounded-lg border ${active ? 'border-green-500/30 bg-green-500/5' : 'border-[#1E293B]/40 bg-[#0D1A2A]'} px-4 py-2`}>
    <Icon size={14} className={active ? 'text-green-400' : 'text-gray-500'} />
    <span className="font-mono text-sm font-bold text-white">{value}</span>
    <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-gray-400">{label}</span>
  </div>
);

const AgentsPage: React.FC = () => {
  const { agentsList, fetchAgents, isLoadingAgents, selectAgent } = useAgentStore();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'tasks' | 'cpu'>('name');

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const filtered = useMemo(() => {
    return agentsList
      .filter((a) => {
        if (statusFilter !== 'all' && a.status !== statusFilter) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          return a.name.toLowerCase().includes(q) ||
                 a.role.toLowerCase().includes(q) ||
                 a.currentTask.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'tasks') return b.tasksCompleted - a.tasksCompleted;
        if (sortBy === 'cpu') return b.cpuUsage - a.cpuUsage;
        return a.name.localeCompare(b.name);
      });
  }, [agentsList, statusFilter, searchQuery, sortBy]);

  const stats = useMemo(() => ({
    total: agentsList.length,
    running: agentsList.filter((a) => a.status === 'running').length,
    idle: agentsList.filter((a) => a.status === 'idle').length,
    error: agentsList.filter((a) => a.status === 'error').length,
    success: agentsList.filter((a) => a.status === 'success').length,
  }), [agentsList]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-purple-400">AI Infrastructure</p>
          <h1 className="mt-1 text-2xl font-bold text-white font-mono">AI Agents</h1>
          <p className="font-mono text-sm text-gray-400">
            {stats.running} running, {stats.idle} idle, {stats.error} errors
          </p>
        </div>
        <button onClick={() => navigate('/builder')} className="btn-primary-gradient inline-flex items-center gap-2">
          <Sparkles size={16} /> New Pipeline
        </button>
      </div>

      {/* Stats row (compact) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center gap-3"
      >
        <StatsIndicator label="Total" value={stats.total} icon={Cpu} />
        <StatsIndicator label="Running" value={stats.running} icon={RefreshCw} active />
        <StatsIndicator label="Idle" value={stats.idle} icon={Clock} />
        <StatsIndicator label="Errors" value={stats.error} icon={AlertCircle} />
        <StatsIndicator label="Online" value={stats.success} icon={Activity} />
      </motion.div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search agents..."
              className="input font-mono w-full pl-9 text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input font-mono w-auto text-sm"
          >
            {['all', 'running', 'idle', 'error', 'success'].map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="input font-mono w-auto text-sm"
          >
            <option value="name">Sort by Name</option>
            <option value="tasks">Sort by Tasks</option>
            <option value="cpu">Sort by CPU</option>
          </select>
        </div>
        <p className="font-mono text-sm text-gray-500">
          {filtered.length} of {agentsList.length} agents
        </p>
      </div>

      {/* Loading */}
      {isLoadingAgents && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw size={24} className="animate-spin text-purple-400" />
        </div>
      )}

      {/* Agent Grid */}
      {!isLoadingAgents && (
        <motion.div
          layout
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {filtered.map((agent) => (
            <AgentCard key={agent.name} agent={agent} onSelect={selectAgent} />
          ))}
        </motion.div>
      )}

      {/* Empty */}
      {!isLoadingAgents && filtered.length === 0 && (
        <div className="glass-card rounded-2xl border-2 border-dashed border-[#1E293B]/40 p-12 text-center">
          <div className="text-4xl mb-3">🤖</div>
          <h3 className="font-mono text-lg font-semibold text-white">No agents match</h3>
          <p className="font-mono text-sm text-gray-400">Try adjusting your filters.</p>
          <button
            onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
            className="mt-4 font-mono text-sm font-semibold text-purple-400 hover:text-purple-300"
          >
            Clear filters →
          </button>
        </div>
      )}

      {/* Modal */}
      <AgentDetailModal />

      {/* Legend */}
      <div className="glass-card rounded-xl p-4 border border-[#1E293B]/40 bg-[#0D1A2A]">
        <div className="flex flex-wrap items-center gap-6 font-mono text-[10px] text-gray-500">
          <span className="font-semibold text-gray-300">Status:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" /> Running
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gray-500" /> Idle
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" /> Error
          </span>
          <span className="ml-auto">auto-refresh every 30s</span>
        </div>
      </div>
    </div>
  );
};

export default AgentsPage;
