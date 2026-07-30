import { motion } from 'framer-motion';
import {
  Users, Server, Database, Activity,
  Cpu, HardDrive,
  Wifi, RefreshCw, Settings, Download
} from 'lucide-react';

const systemHealth = [
  { name: 'API Server', status: 'healthy', uptime: '99.99%', latency: '45ms', icon: Server },
  { name: 'PostgreSQL', status: 'healthy', uptime: '99.97%', latency: '12ms', icon: Database },
  { name: 'Redis Cache', status: 'healthy', uptime: '99.99%', latency: '2ms', icon: Cpu },
  { name: 'Qdrant (Vector DB)', status: 'degraded', uptime: '95.20%', latency: '180ms', icon: HardDrive },
  { name: 'Airflow', status: 'healthy', uptime: '99.90%', latency: '320ms', icon: Activity },
  { name: 'WebSocket', status: 'healthy', uptime: '99.99%', latency: '8ms', icon: Wifi },
];

const recentUsers = [
  { name: 'Femi Friendly', email: 'femifriendly@gmail.com', pipelines: 8, lastActive: '2 min ago', role: 'Admin' },
  { name: 'Demo User', email: 'demo@aiden.local', pipelines: 3, lastActive: '15 min ago', role: 'User' },
  { name: 'Admin User', email: 'admin@aiden.local', pipelines: 12, lastActive: '1 hour ago', role: 'Admin' },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text)]">🛡️ Admin Dashboard</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            System health, user management, and infrastructure monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary btn-sm"><RefreshCw className="h-4 w-4" /> Refresh</button>
          <button className="btn-secondary btn-sm"><Download className="h-4 w-4" /> Export</button>
        </div>
      </motion.div>

      {/* System Health */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {systemHealth.map((svc, i) => (
          <motion.div
            key={svc.name}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="glass-card p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  svc.status === 'healthy' ? 'bg-green-500/10' : 'bg-amber-500/10'
                }`}>
                  <svc.icon className={`h-4.5 w-4.5 ${svc.status === 'healthy' ? 'text-green-400' : 'text-amber-400'}`} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--color-text)]">{svc.name}</h3>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${
                    svc.status === 'healthy' ? 'text-green-400' : 'text-amber-400'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      svc.status === 'healthy' ? 'bg-green-400' : 'bg-amber-400 animate-pulse'
                    }`} />
                    {svc.status === 'healthy' ? 'Operational' : 'Degraded'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
              <span>Uptime: {svc.uptime}</span>
              <span>Latency: {svc.latency}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent Users */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 font-semibold text-[var(--color-text)]">
            <Users className="h-4 w-4 text-purple-400" /> Recent Users
          </h2>
          <button className="btn-ghost btn-sm text-xs">View All</button>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {recentUsers.map((user) => (
            <div key={user.email} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-cyan-500/20 text-xs font-bold text-purple-400">
                  {user.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">{user.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-[var(--color-text-secondary)]">
                <span>{user.pipelines} pipelines</span>
                <span>{user.lastActive}</span>
                <span className={`rounded-full border px-2 py-0.5 font-medium ${
                  user.role === 'Admin' 
                    ? 'border-purple-500/20 bg-purple-500/10 text-purple-400'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)]'
                }`}>
                  {user.role}
                </span>
                <button className="btn-icon btn-sm"><Settings className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="grid gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Users', value: '12', icon: Users, color: 'text-purple-400' },
          { label: 'Active Pipelines', value: '47', icon: Activity, color: 'text-cyan-400' },
          { label: 'Storage Used', value: '2.4 TB', icon: HardDrive, color: 'text-green-400' },
          { label: 'API Requests (24h)', value: '12.5K', icon: Wifi, color: 'text-amber-400' },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/10 to-cyan-500/10">
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--color-text)]">{stat.value}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">{stat.label}</p>
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
