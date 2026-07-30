import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Brain, Cpu, BarChart3, Settings2, Play,
  RefreshCw, Sparkles, Sliders, Download
} from 'lucide-react';

const agents = [
  { id: 1, name: 'Intent Agent', status: 'ready', accuracy: 94.5, latency: '1.2s', requests: 1250, color: 'purple' },
  { id: 2, name: 'Extraction Agent', status: 'ready', accuracy: 92.1, latency: '2.8s', requests: 890, color: 'cyan' },
  { id: 3, name: 'Analysis Agent', status: 'ready', accuracy: 88.3, latency: '3.1s', requests: 720, color: 'amber' },
  { id: 4, name: 'Builder Agent', status: 'training', accuracy: 76.5, latency: '4.2s', requests: 450, color: 'green' },
  { id: 5, name: 'Self-Healing Agent', status: 'ready', accuracy: 95.2, latency: '0.8s', requests: 340, color: 'red' },
];

const statusColors: Record<string, string> = {
  ready: 'text-green-400 bg-green-500/10 border-green-500/20',
  training: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  error: 'text-red-400 bg-red-500/10 border-red-500/20',
};

const agentColors: Record<string, string> = {
  purple: 'from-purple-500/20 to-purple-600/10',
  cyan: 'from-cyan-500/20 to-cyan-600/10',
  amber: 'from-amber-500/20 to-amber-600/10',
  green: 'from-green-500/20 to-green-600/10',
  red: 'from-red-500/20 to-red-600/10',
};

export default function AIWorkspacePage() {
  const [activeTab, setActiveTab] = useState('agents');

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-[var(--color-text)]">🤖 AI Workspace</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Manage agents, monitor performance, and fine-tune models
        </p>
      </motion.div>

      {/* Tabs */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="flex gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-1">
        {[
          { id: 'agents', label: 'Agents', icon: Brain },
          { id: 'models', label: 'Models', icon: Cpu },
          { id: 'prompts', label: 'Prompts', icon: Settings2 },
          { id: 'metrics', label: 'Metrics', icon: BarChart3 },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-purple-500/10 text-purple-400 shadow-sm'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
            }`}>
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* Agent Cards */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent, i) => (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="glass-card overflow-hidden"
          >
            <div className={`h-1.5 w-full bg-gradient-to-r ${agentColors[agent.color]}`} />
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-[var(--color-text)]">{agent.name}</h3>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold mt-1 ${statusColors[agent.status]}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      agent.status === 'ready' ? 'bg-green-400 animate-pulse' :
                      agent.status === 'training' ? 'bg-amber-400 animate-pulse' : 'bg-red-400'
                    }`} />
                    {agent.status === 'training' ? 'Fine-Tuning...' : agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                  </span>
                </div>
                <button className="btn-icon btn-sm">
                  <Play className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase">Accuracy</p>
                  <p className="text-sm font-bold text-[var(--color-text)]">{agent.accuracy}%</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase">Latency</p>
                  <p className="text-sm font-bold text-[var(--color-text)]">{agent.latency}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase">Requests</p>
                  <p className="text-sm font-bold text-[var(--color-text)]">{agent.requests.toLocaleString()}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button className="btn-ghost btn-sm flex-1"><Settings2 className="h-3.5 w-3.5" /> Configure</button>
                <button className="btn-ghost btn-sm flex-1"><RefreshCw className="h-3.5 w-3.5" /> Retrain</button>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Quick Actions */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5">
        <h2 className="mb-4 font-semibold text-[var(--color-text)]">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button className="btn-primary btn-sm"><Sparkles className="h-4 w-4" /> Run All Agents</button>
          <button className="btn-secondary btn-sm"><Download className="h-4 w-4" /> Export Metrics</button>
          <button className="btn-secondary btn-sm"><Sliders className="h-4 w-4" /> Hyperparameter Tuning</button>
          <button className="btn-secondary btn-sm"><Cpu className="h-4 w-4" /> Deploy to Production</button>
        </div>
      </motion.div>
    </div>
  );
}
