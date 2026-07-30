import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Mail,
  UserPlus, MoreHorizontal, Activity,
  Clock, MessageSquare, Share2
} from 'lucide-react';

const members = [
  { name: 'Sarah Chen', role: 'Data Engineer', email: 'sarah@aiden.local', status: 'online', pipelines: 24, avatar: 'SC' },
  { name: 'Marcus Johnson', role: 'ML Engineer', email: 'marcus@aiden.local', status: 'online', pipelines: 18, avatar: 'MJ' },
  { name: 'Elena Rodriguez', role: 'Data Analyst', email: 'elena@aiden.local', status: 'away', pipelines: 12, avatar: 'ER' },
  { name: 'Alex Kim', role: 'Data Engineer', email: 'alex@aiden.local', status: 'offline', pipelines: 8, avatar: 'AK' },
  { name: 'Priya Patel', role: 'DevOps', email: 'priya@aiden.local', status: 'online', pipelines: 15, avatar: 'PP' },
  { name: 'James Wilson', role: 'Data Architect', email: 'james@aiden.local', status: 'away', pipelines: 20, avatar: 'JW' },
];

const activityFeed = [
  { user: 'Sarah Chen', action: 'deployed pipeline', target: 'daily_sales_etl', time: '2 min ago', type: 'success' },
  { user: 'Marcus Johnson', action: 'approved schema change', target: 'customer_360', time: '15 min ago', type: 'approval' },
  { user: 'Elena Rodriguez', action: 'created pipeline', target: 'product_inventory', time: '1 hour ago', type: 'create' },
  { user: 'Alex Kim', action: 'ran query', target: 'fraud_detection', time: '2 hours ago', type: 'query' },
  { user: 'Priya Patel', action: 'fixed deployment', target: 'iot_stream', time: '3 hours ago', type: 'fix' },
];

const statusColors: Record<string, string> = {
  online: 'bg-green-400',
  away: 'bg-amber-400',
  offline: 'bg-gray-400',
};

const avatarColors = [
  'from-purple-500/20 to-cyan-500/20 text-purple-400',
  'from-blue-500/20 to-cyan-500/20 text-blue-400',
  'from-green-500/20 to-emerald-500/20 text-green-400',
  'from-amber-500/20 to-orange-500/20 text-amber-400',
  'from-pink-500/20 to-purple-500/20 text-pink-400',
  'from-cyan-500/20 to-blue-500/20 text-cyan-400',
];

export default function TeamPage() {
  const [search, setSearch] = useState('');

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text)]">👥 Team</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Collaborate on pipelines, share knowledge, and manage access
          </p>
        </div>
        <button className="btn-primary"><UserPlus className="h-4 w-4" /> Invite Member</button>
      </motion.div>

      <div className="flex gap-6">
        {/* Members List */}
        <div className="flex-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search team members..." className="input pl-9 py-2.5 text-sm" />
          </div>

          <div className="space-y-2">
            {filtered.map((member, i) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="glass-card flex items-center gap-4 p-4"
              >
                <div className="relative shrink-0">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${avatarColors[i % avatarColors.length]} font-bold text-sm`}>
                    {member.avatar}
                  </div>
                  <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--color-card)] ${statusColors[member.status]}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-[var(--color-text)]">{member.name}</h3>
                    <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-secondary)]">
                      {member.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {member.email}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)]">{member.pipelines} pipelines</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button className="btn-icon btn-sm"><MessageSquare className="h-3.5 w-3.5" /></button>
                  <button className="btn-icon btn-sm"><Share2 className="h-3.5 w-3.5" /></button>
                  <button className="btn-icon btn-sm"><MoreHorizontal className="h-3.5 w-3.5" /></button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="w-80 shrink-0 space-y-4 max-lg:hidden">
          <h2 className="flex items-center gap-2 font-semibold text-[var(--color-text)]">
            <Activity className="h-4 w-4 text-purple-400" /> Recent Activity
          </h2>
          <div className="space-y-2">
            {activityFeed.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="glass-card p-3"
              >
                <div className="flex items-start gap-2">
                  <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                    item.type === 'success' ? 'bg-green-400' :
                    item.type === 'approval' ? 'bg-amber-400' :
                    item.type === 'fix' ? 'bg-cyan-400' : 'bg-purple-400'
                  }`} />
                  <div className="min-w-0">
                    <p className="text-xs text-[var(--color-text)]">
                      <span className="font-medium">{item.user}</span> {item.action}{' '}
                      <span className="font-mono text-purple-400">{item.target}</span>
                    </p>
                    <span className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" /> {item.time}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
