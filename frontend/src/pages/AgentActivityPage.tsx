/**
 * AgentActivityPage — Full-page real-time dashboard showing orchestrator
 * execution runs, agent step-by-step progress, connector health, and notifications.
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, Zap, Database, Bell, ArrowRight,
} from 'lucide-react';
import AgentActivityPanel from '../components/agents/AgentActivityPanel';
import useAgentWebSocket from '../hooks/useAgentWebSocket';

const AgentActivityPage: React.FC = () => {
  const { connected, runs, connectorHealth, notifications } = useAgentWebSocket('aiden-activity-page', 100);
  const [activeTab, setActiveTab] = useState<'activity' | 'connectors' | 'notifications'>('activity');

  const stats = {
    totalRuns: runs.length,
    running: runs.filter((r) => r.status === 'running').length,
    success: runs.filter((r) => r.status === 'success').length,
    failure: runs.filter((r) => r.status === 'failure').length,
    connectors: Object.keys(connectorHealth).length,
    healthyConnectors: Object.values(connectorHealth).filter((c) => c.status === 'healthy').length,
    unreadNotifications: notifications.length,
  };

  const connectorEntries = Object.entries(connectorHealth);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-purple-400">
            Operations Center
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white font-mono">Agent Activity</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)] animate-pulse' : 'bg-red-400'}`} />
            <span className="font-mono text-xs text-gray-400">
              {connected ? 'WebSocket connected — live updates active' : 'Disconnected — attempting reconnect...'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
      >
        {[
          { label: 'Total Runs', value: stats.totalRuns, icon: Activity, color: 'text-gray-300', bg: 'border-[#1F2937] bg-[#111827]' },
          { label: 'Running', value: stats.running, icon: Zap, color: 'text-blue-400', bg: 'border-blue-500/20 bg-blue-500/5' },
          { label: 'Success', value: stats.success, icon: Activity, color: 'text-green-400', bg: 'border-green-500/20 bg-green-500/5' },
          { label: 'Failed', value: stats.failure, icon: Activity, color: 'text-red-400', bg: 'border-red-500/20 bg-red-500/5' },
          { label: 'Connectors', value: `${stats.healthyConnectors}/${stats.connectors}`, icon: Database, color: 'text-cyan-400', bg: 'border-[#1F2937] bg-[#111827]' },
          { label: 'Notifications', value: stats.unreadNotifications, icon: Bell, color: 'text-amber-400', bg: 'border-[#1F2937] bg-[#111827]' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-xl border p-4 ${bg}`}>
            <div className="flex items-center justify-between">
              <Icon size={16} className={color} />
              <span className="font-mono text-[9px] uppercase tracking-wider text-gray-500">{label}</span>
            </div>
            <p className={`font-mono text-2xl font-bold mt-2 ${color}`}>{value}</p>
          </div>
        ))}
      </motion.div>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 border-b border-[#1F2937] pb-0">
        {([
          { key: 'activity', label: 'Live Activity', icon: Activity },
          { key: 'connectors', label: 'Connectors', icon: Database },
          { key: 'notifications', label: 'Notifications', icon: Bell },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 font-mono text-xs transition-colors border-b-2 -mb-px ${
              activeTab === key
                ? 'text-purple-300 border-purple-400'
                : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}
          >
            <Icon size={13} />
            {label}
            {key === 'notifications' && stats.unreadNotifications > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-bold">
                {stats.unreadNotifications}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'activity' && (
        <AgentActivityPanel showExecute={true} />
      )}

      {activeTab === 'connectors' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {connectorEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Database size={32} className="text-gray-600 mb-3" />
              <p className="font-mono text-sm text-gray-500">No connector health data yet</p>
              <p className="font-mono text-xs text-gray-600 mt-1">Connectors will appear once the orchestrator polls their health</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {connectorEntries.map(([name, event]) => (
                <div key={name} className="rounded-xl border border-[#1F2937] bg-[#111827] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        event.status === 'healthy' ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' :
                        event.status === 'error' ? 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]' :
                        'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                      }`} />
                      <span className="font-mono text-sm font-bold text-white">{name}</span>
                    </div>
                    <span className={`font-mono text-[10px] uppercase px-2 py-0.5 rounded ${
                      event.status === 'healthy' ? 'bg-green-500/10 text-green-400' :
                      event.status === 'error' ? 'bg-red-500/10 text-red-400' :
                      'bg-amber-500/10 text-amber-400'
                    }`}>
                      {event.status}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="font-mono text-[10px] text-gray-500">Latency</span>
                      <span className="font-mono text-xs text-white">{event.latency_ms.toFixed(0)}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono text-[10px] text-gray-500">Last Check</span>
                      <span className="font-mono text-xs text-gray-400">
                        {new Date(event.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {activeTab === 'notifications' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Bell size={32} className="text-gray-600 mb-3" />
              <p className="font-mono text-sm text-gray-500">No notifications</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((n, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-lg border border-[#1F2937] bg-[#111827]">
                  <Bell size={14} className={
                    n.type === 'error' ? 'text-red-400' :
                    n.type === 'warning' ? 'text-amber-400' :
                    'text-blue-400'
                  } />
                  <span className="font-mono text-[10px] text-gray-500 shrink-0">
                    {new Date(n.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                  </span>
                  <span className="font-mono text-xs text-gray-300">{n.message}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default AgentActivityPage;
