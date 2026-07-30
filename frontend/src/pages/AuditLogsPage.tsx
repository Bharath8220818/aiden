import React, { useState, useEffect } from 'react';
import { Search, Download, ChevronDown, Globe, Clock, ArrowUpDown } from 'lucide-react';
import { auditApi } from '../api/audit';

type ActionType = 'all' | 'login' | 'create' | 'update' | 'delete' | 'run' | 'approve' | 'reject' | 'cancel';
type TimeSort = 'newest' | 'oldest';

interface AuditEntry {
  id: number;
  user: string;
  userRole: string;
  action: string;
  actionType: ActionType;
  resource: string;
  details: string;
  ip: string;
  timestamp: string;
  status: 'success' | 'failure' | 'pending';
}

// ─── Mock data as fallback when backend is unavailable ────────────────
const MOCK_AUDIT_LOGS: AuditEntry[] = [
  { id: 1, user: 'Bharath K.', userRole: 'Admin', action: 'Login', actionType: 'login', resource: 'AIDEN Platform', details: 'Login from new device (Chrome 126, Windows)', ip: '192.168.1.100', timestamp: '2026-07-21 14:32:01', status: 'success' },
  { id: 2, user: 'Femi F.', userRole: 'Engineer', action: 'Create Pipeline', actionType: 'create', resource: 'Daily Sales ETL', details: 'Created pipeline from prompt: "Build a daily sales pipeline from PostgreSQL to Snowflake"', ip: '192.168.1.101', timestamp: '2026-07-21 14:30:22', status: 'success' },
  { id: 3, user: 'AIDEN Auto', userRole: 'System', action: 'Run Pipeline', actionType: 'run', resource: 'IoT Stream Pipeline', details: 'Auto-triggered execution (scheduled: every 5 min)', ip: '10.0.0.1', timestamp: '2026-07-21 14:28:15', status: 'success' },
  { id: 4, user: 'Sarah L.', userRole: 'Engineer', action: 'Update Pipeline', actionType: 'update', resource: 'Customer Analytics', details: 'Modified schedule from "0 6 * * *" to "0 8 * * *"', ip: '192.168.1.102', timestamp: '2026-07-21 14:25:00', status: 'success' },
  { id: 5, user: 'AIDEN Auto', userRole: 'System', action: 'Run Pipeline', actionType: 'run', resource: 'IoT Stream Pipeline', details: 'Auto-triggered execution (scheduled: every 5 min)', ip: '10.0.0.1', timestamp: '2026-07-21 14:23:00', status: 'failure' },
  { id: 6, user: 'Mike R.', userRole: 'Admin', action: 'Approve Action', actionType: 'approve', resource: 'Schema Update #2', details: 'Approved schema update for Daily Sales ETL (new column: order_discount)', ip: '192.168.1.103', timestamp: '2026-07-21 14:20:45', status: 'success' },
  { id: 7, user: 'Bharath K.', userRole: 'Admin', action: 'Delete Pipeline', actionType: 'delete', resource: 'Legacy Export Pipeline', details: 'Deleted pipeline (reason: deprecation, last run: 90 days ago)', ip: '192.168.1.100', timestamp: '2026-07-21 14:18:30', status: 'success' },
  { id: 8, user: 'Femi F.', userRole: 'Engineer', action: 'Reject Action', actionType: 'approve', resource: 'API Key Rotation #5', details: 'Rejected API key rotation for Slack integration (reason: schedule during maintenance)', ip: '192.168.1.101', timestamp: '2026-07-21 14:15:00', status: 'success' },
  { id: 9, user: 'Sarah L.', userRole: 'Engineer', action: 'Login', actionType: 'login', resource: 'AIDEN Platform', details: 'Login from Firefox 128, macOS', ip: '192.168.1.104', timestamp: '2026-07-21 14:10:12', status: 'success' },
  { id: 10, user: 'AIDEN Auto', userRole: 'System', action: 'Run Pipeline', actionType: 'run', resource: 'Product Inventory', details: 'Auto-triggered execution (scheduled: every hour)', ip: '10.0.0.1', timestamp: '2026-07-21 14:08:00', status: 'success' },
  { id: 11, user: 'Mike R.', userRole: 'Admin', action: 'Update Settings', actionType: 'update', resource: 'Alert Configuration', details: 'Changed alert threshold for success rate from 95% to 90%', ip: '192.168.1.103', timestamp: '2026-07-21 14:05:22', status: 'success' },
  { id: 12, user: 'AIDEN Auto', userRole: 'System', action: 'Self-Heal', actionType: 'update', resource: 'IoT Stream Pipeline', details: 'Auto-recovery: restarted pipeline with exponential backoff', ip: '10.0.0.1', timestamp: '2026-07-21 14:00:00', status: 'success' },
];

const actionConfig: Record<string, { bg: string; label: string }> = {
  login: { bg: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400', label: 'Login' },
  create: { bg: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400', label: 'Create' },
  update: { bg: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400', label: 'Update' },
  delete: { bg: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400', label: 'Delete' },
  run: { bg: 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400', label: 'Run' },
  approve: { bg: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-400', label: 'Approve' },
};

const statusConfig: Record<string, { dot: string }> = {
  success: { dot: 'bg-green-500' },
  failure: { dot: 'bg-red-500' },
  pending: { dot: 'bg-yellow-500' },
};

const AuditLogsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<ActionType>('all');
  const [timeSort, setTimeSort] = useState<TimeSort>('newest');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [logs, setLogs] = useState<AuditEntry[]>(MOCK_AUDIT_LOGS);
  const [totalEvents, setTotalEvents] = useState(MOCK_AUDIT_LOGS.length);
  // ─── Fetch logs from backend, fall back to mock ──────────────────────
  useEffect(() => {
    (async () => {
      try {
        const data = await auditApi.list({ limit: 50, sort: 'newest' });
        const entries: AuditEntry[] = (data.logs || data).map((log: any, i: number) => ({
          id: log.id || i + 1,
          user: log.username || log.user || 'System',
          userRole: log.role || 'User',
          action: log.action.charAt(0).toUpperCase() + log.action.slice(1),
          actionType: log.action as ActionType,
          resource: log.resource || 'AIDEN Platform',
          details: log.details || '',
          ip: log.ip_address || log.ip || 'N/A',
          timestamp: log.created_at || log.timestamp || new Date().toISOString(),
          status: log.status || 'success',
        }));
        setLogs(entries);
        setTotalEvents(data.total ?? entries.length);
      } catch {
        setLogs(MOCK_AUDIT_LOGS);
        setTotalEvents(MOCK_AUDIT_LOGS.length);
      }
    })();
  }, []);

  // ─── Export CSV via real API or client-side fallback ────────────────
  const handleExportCsv = async () => {
    try {
      const blob = await auditApi.exportCSV({});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Client-side fallback: generate CSV from current data
      const headers = 'ID,User,Action,Resource,IP,Status,Timestamp\n';
      const rows = filtered.map((e) =>
        `${e.id},"${e.user}","${e.action}","${e.resource}",${e.ip},${e.status},${e.timestamp}`
      ).join('\n');
      const blob = new Blob([headers + rows], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const filtered = [...logs]
    .filter((entry) => {
      if (actionFilter !== 'all' && entry.actionType !== actionFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          entry.user.toLowerCase().includes(q) ||
          entry.action.toLowerCase().includes(q) ||
          entry.resource.toLowerCase().includes(q) ||
          entry.details.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      return timeSort === 'newest'
        ? b.timestamp.localeCompare(a.timestamp)
        : a.timestamp.localeCompare(b.timestamp);
    });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-purple-600 dark:text-purple-400">
            Compliance
          </p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
            Audit Logs
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Complete audit trail of all user and system actions.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Events', value: totalEvents, color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', icon: Clock },
          { label: 'Creates', value: logs.filter((l) => l.actionType === 'create').length, color: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400', icon: 'bg-green-500' },
          { label: 'Failures', value: logs.filter((l) => l.status === 'failure').length, color: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400', icon: 'bg-red-500' },
          { label: 'Auto Actions', value: logs.filter((l) => l.user.includes('AIDEN') || l.user === 'System').length, color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400', icon: 'bg-purple-500' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
            <p className="text-lg font-bold">{s.value}</p>
            <p className="text-[10px] font-medium uppercase tracking-wider mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search logs..."
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm shadow-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value as ActionType)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-purple-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          >
            <option value="all">All Actions</option>
            <option value="login">Login</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="run">Run</option>
            <option value="approve">Approve/Reject</option>
          </select>

          <button
            onClick={() => setTimeSort(timeSort === 'newest' ? 'oldest' : 'newest')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-600 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <ArrowUpDown size={14} />
            {timeSort === 'newest' ? 'Newest' : 'Oldest'}
          </button>
        </div>

        <p className="text-sm text-gray-500">
          Showing <span className="font-semibold text-gray-900 dark:text-white">{filtered.length}</span> of {totalEvents} events
        </p>
      </div>

      {/* ── Audit Table ── */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900/60">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50/70 dark:bg-gray-800/50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">User</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Action</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Resource</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 hidden md:table-cell">IP</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Timestamp</th>
                <th className="px-5 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {filtered.map((entry) => {
                const actionCfg = actionConfig[entry.actionType] || actionConfig.login;
                const statusCfg = statusConfig[entry.status];
                return (
                  <React.Fragment key={entry.id}>
                    <tr
                      className="transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/30 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-100 text-[10px] font-bold text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                            {entry.user.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{entry.user}</p>
                            <p className="text-[10px] text-gray-400">{entry.userRole}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${actionCfg.bg}`}>
                          {entry.action}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">{entry.resource}</td>
                      <td className="px-5 py-4 text-xs text-gray-400 hidden md:table-cell font-mono">{entry.ip}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
                          <span className="text-xs capitalize text-gray-500 dark:text-gray-400">{entry.status}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-400 whitespace-nowrap">{entry.timestamp}</td>
                      <td className="px-5 py-4">
                        <ChevronDown size={14} className={`text-gray-400 transition-transform ${expandedId === entry.id ? 'rotate-180' : ''}`} />
                      </td>
                    </tr>
                    {expandedId === entry.id && (
                      <tr key={`${entry.id}-details`}>
                        <td colSpan={7} className="px-5 py-4 bg-gray-50/70 dark:bg-gray-800/30">
                          <div className="flex items-start gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
                              <Clock size={14} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">Action Details</p>
                              <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{entry.details}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No log entries found</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filters.</p>
          </div>
        )}
      </div>

      {/* ── Info Bar ── */}
      <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 text-sm dark:border-gray-700 dark:bg-gray-900/60">
        <Globe size={16} className="text-purple-500 shrink-0" />
        <p className="text-gray-500 dark:text-gray-400">
          <span className="font-semibold text-gray-700 dark:text-gray-300">Retention policy:</span> Audit logs are retained for 90 days. 
          Export logs for long-term archival. Last exported: 2 days ago.
        </p>
      </div>
    </div>
  );
};

export default AuditLogsPage;
