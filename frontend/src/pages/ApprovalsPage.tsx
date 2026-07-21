import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock, Search, ChevronDown, User, MessageSquare } from 'lucide-react';

type ApprovalStatus = 'pending' | 'approved' | 'rejected';
type Severity = 'low' | 'medium' | 'high' | 'critical';

interface Approval {
  id: number;
  title: string;
  description: string;
  pipeline: string;
  severity: Severity;
  status: ApprovalStatus;
  requestedBy: string;
  requestedAt: string;
  action: string;
  details: string[];
}

const APPROVALS: Approval[] = [
  {
    id: 1,
    title: 'Restart Failed Pipeline',
    description: 'IoT Stream Pipeline has failed 3 times in the last hour. Recommended action: restart with backoff.',
    pipeline: 'IoT Stream Pipeline',
    severity: 'critical',
    status: 'pending',
    requestedBy: 'Self-Healing Engine',
    requestedAt: '5 min ago',
    action: 'restart',
    details: [
      'Failure: Connection timeout to Kafka broker (3 retries)',
      'Impact: 12,500 records not ingested in last 60 min',
      'Recommended: Restart with exponential backoff (30s → 60s → 120s)',
      'Auto-recovery confidence: 87%'
    ],
  },
  {
    id: 2,
    title: 'Schema Update Approval',
    description: 'New column "order_discount" detected in PostgreSQL source. Auto-mapping to Snowflake target.',
    pipeline: 'Daily Sales ETL',
    severity: 'high',
    status: 'pending',
    requestedBy: 'Schema Discovery Agent',
    requestedAt: '15 min ago',
    action: 'schema_update',
    details: [
      'Source: PostgreSQL → Target: Snowflake',
      'New column: order_discount (DECIMAL(10,2))',
      'Historical backfill: 14 days of data (est. 45 min)',
      'No breaking changes detected to existing columns'
    ],
  },
  {
    id: 3,
    title: 'Data Quality Threshold Breach',
    description: 'Null rate in "email" field exceeded 5% threshold (actual: 8.3%). Auto-approve or escalate?',
    pipeline: 'Customer Analytics',
    severity: 'medium',
    status: 'pending',
    requestedBy: 'Data Quality Analyzer',
    requestedAt: '1 hour ago',
    action: 'threshold_override',
    details: [
      'Field: email — Null rate: 8.3% (threshold: 5%)',
      'Affected records: 3,450 out of 41,566',
      'Suggested: Increase threshold to 10% with logging',
      'Data quality score impact: -2.1 points'
    ],
  },
  {
    id: 4,
    title: 'Cost Optimization Recommendation',
    description: 'Reserved instance pricing available — estimated 32% savings on compute costs for IoT pipeline.',
    pipeline: 'IoT Stream Pipeline',
    severity: 'low',
    status: 'approved',
    requestedBy: 'Optimization Engine',
    requestedAt: '3 hours ago',
    action: 'cost_opt',
    details: [
      'Current: On-demand compute (128 GB) = $1,280/month',
      'Recommended: 1-year reserved (128 GB) = $870/month',
      'Savings: $410/month (32%)',
      'Commitment: 1-year term, 50% upfront'
    ],
  },
  {
    id: 5,
    title: 'API Key Rotation Required',
    description: 'Slack API key has been active for 89 days (rotation policy: 90 days). Rotate now?',
    pipeline: 'Marketing Attribution',
    severity: 'high',
    status: 'rejected',
    requestedBy: 'Security Auditor',
    requestedAt: '6 hours ago',
    action: 'key_rotation',
    details: [
      'Integration: Slack (marketing-notifications)',
      'Current key age: 89 days (limit: 90 days)',
      'Risk: Low (rotating key may cause 5-min interruption)',
      'Recommended: Schedule rotation during next maintenance window'
    ],
  },
];

const severityConfig: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: 'bg-red-100 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-400', label: 'Critical' },
  high: { bg: 'bg-orange-100 dark:bg-orange-950/30', text: 'text-orange-700 dark:text-orange-400', label: 'High' },
  medium: { bg: 'bg-yellow-100 dark:bg-yellow-950/30', text: 'text-yellow-700 dark:text-yellow-400', label: 'Medium' },
  low: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', label: 'Low' },
};

const statusConfig: Record<string, { bg: string; dot: string; label: string }> = {
  pending: { bg: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400', dot: 'bg-yellow-500', label: 'Pending' },
  approved: { bg: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400', dot: 'bg-green-500', label: 'Approved' },
  rejected: { bg: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400', dot: 'bg-red-500', label: 'Rejected' },
};

const ApprovalsPage: React.FC = () => {
  const [filter, setFilter] = useState<ApprovalStatus | 'all'>('pending');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const [approvals, setApprovals] = useState(APPROVALS);

  const filtered = approvals.filter((a) => {
    if (filter !== 'all' && a.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return a.title.toLowerCase().includes(q) || a.pipeline.toLowerCase().includes(q) || a.description.toLowerCase().includes(q);
    }
    return true;
  });

  const handleApprove = (id: number) => {
    setApprovals((prev) => prev.map((a) => a.id === id ? { ...a, status: 'approved' as ApprovalStatus } : a));
    setSelected(null);
  };

  const handleReject = (id: number) => {
    setApprovals((prev) => prev.map((a) => a.id === id ? { ...a, status: 'rejected' as ApprovalStatus } : a));
    setSelected(null);
  };

  const pendingCount = approvals.filter((a) => a.status === 'pending').length;
  const resolvedCount = approvals.filter((a) => a.status === 'approved' || a.status === 'rejected').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-purple-600 dark:text-purple-400">
            Governance
          </p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
            Human Approval Center
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Review and approve AI-suggested actions for pipeline self-healing and changes.
          </p>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending', value: pendingCount, icon: Clock, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400' },
          { label: 'Approved', value: approvals.filter((a) => a.status === 'approved').length, icon: CheckCircle2, color: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400' },
          { label: 'Rejected', value: approvals.filter((a) => a.status === 'rejected').length, icon: XCircle, color: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`rounded-xl p-4 text-center ${s.color}`}>
              <Icon size={20} className="mx-auto mb-1" />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs font-medium uppercase tracking-wider mt-0.5">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search approvals..."
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm shadow-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>
          <div className="flex rounded-xl border border-gray-100 bg-white p-1 shadow-sm dark:border-gray-700 dark:bg-gray-900">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all capitalize ${
                  filter === f
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>
        </div>
        <p className="text-sm text-gray-500">
          <span className="font-semibold text-purple-600">{pendingCount}</span> pending ·{' '}
          <span className="font-semibold text-gray-600">{resolvedCount}</span> resolved
        </p>
      </div>

      {/* ── Approval Cards ── */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center dark:border-gray-700">
            <div className="text-4xl mb-3">✅</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">All caught up!</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">No pending approvals require your attention.</p>
          </div>
        ) : (
          filtered.map((approval) => {
            const sev = severityConfig[approval.severity];
            const stat = statusConfig[approval.status];
            const isSelected = selected === approval.id;

            return (
              <div
                key={approval.id}
                className={`rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md dark:bg-gray-900/60 dark:border-gray-700 ${
                  approval.status === 'pending' ? 'border-l-4 border-l-purple-500' :
                  approval.status === 'approved' ? 'border-l-4 border-l-green-500' :
                  'border-l-4 border-l-red-500'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{approval.title}</h3>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${stat.bg}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${stat.dot}`} />
                        {stat.label}
                      </span>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${sev.bg} ${sev.text}`}>
                        {sev.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{approval.description}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <User size={12} />
                        {approval.requestedBy}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {approval.requestedAt}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelected(isSelected ? null : approval.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <ChevronDown size={16} className={`transition-transform ${isSelected ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* Expandable details */}
                {isSelected && (
                  <div className="mt-4 animate-slide-down">
                    <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Details</h4>
                      <ul className="space-y-2">
                        {approval.details.map((detail, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {approval.status === 'pending' && (
                      <div className="mt-4 flex items-center gap-3">
                        <button
                          onClick={() => handleApprove(approval.id)}
                          className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-green-700 hover:shadow-md"
                        >
                          <CheckCircle2 size={16} />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(approval.id)}
                          className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-600 shadow-sm transition-all hover:bg-red-50 hover:shadow-md dark:border-red-800 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-950/30"
                        >
                          <XCircle size={16} />
                          Reject
                        </button>
                        <button className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 transition-all hover:bg-gray-50 dark:border-gray-700 dark:bg-transparent dark:text-gray-400 dark:hover:bg-gray-800">
                          <MessageSquare size={14} />
                          Add Note
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Audit Trail Summary ── */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900/60">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          <span className="font-semibold text-gray-700 dark:text-gray-300">Audit Trail:</span>{' '}
          All approval actions are logged for compliance. View full{' '}
          <Link to="/audit-logs" className="text-purple-600 hover:text-purple-700 underline">Audit Logs</Link>.
        </p>
      </div>
    </div>
  );
};

export default ApprovalsPage;
