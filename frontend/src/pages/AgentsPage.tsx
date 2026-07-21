import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Zap, Cpu, RefreshCw, Pause, Search, AlertCircle, Clock } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────────
interface AIAgent {
  id: number;
  name: string;
  role: string;
  icon: string;
  status: 'running' | 'idle' | 'error' | 'paused';
  tasksCompleted: number;
  cpuUsage: number;
  memoryUsage: string;
  currentTask: string;
  uptime: string;
  lastError?: string;
  logs: string[];
}

// ─── Mock Data ─────────────────────────────────────────────────────────────────
const AGENTS: AIAgent[] = [
  {
    id: 1,
    name: 'Intent Parser',
    role: 'Natural Language Understanding',
    icon: '🧠',
    status: 'running',
    tasksCompleted: 12580,
    cpuUsage: 32,
    memoryUsage: '1.2 GB',
    currentTask: 'Parsing user request: "Build ETL pipeline from PostgreSQL..."',
    uptime: '14d 6h 32m',
    logs: [
      '14:32:01 — Parsed intent: postgres_to_snowflake_pipeline',
      '14:30:22 — Extracted 3 transformations from request',
      '14:28:15 — Confidence score: 0.94',
      '14:25:00 — Context window: 2048 tokens',
    ],
  },
  {
    id: 2,
    name: 'Schema Discovery',
    role: 'Data Source Exploration',
    icon: '🔍',
    status: 'running',
    tasksCompleted: 8942,
    cpuUsage: 28,
    memoryUsage: '0.9 GB',
    currentTask: 'Scanning PostgreSQL sales_db for schema changes',
    uptime: '14d 6h 30m',
    logs: [
      '14:31:00 — Found new table: order_items_2026',
      '14:29:15 — Index recommendations for customer_orders',
      '14:27:30 — Detected schema drift in users table',
    ],
  },
  {
    id: 3,
    name: 'Data Quality Analyzer',
    role: 'Data Profiling & Validation',
    icon: '✅',
    status: 'running',
    tasksCompleted: 15672,
    cpuUsage: 45,
    memoryUsage: '2.1 GB',
    currentTask: 'Validating 500k records in customer_analytics',
    uptime: '14d 6h 28m',
    logs: [
      '14:33:00 — Null rate: 2.3% in email field (threshold: 5%)',
      '14:31:45 — Duplicate check: 157 duplicates found',
      '14:30:10 — Range validation: order_amount within bounds',
    ],
  },
  {
    id: 4,
    name: 'Pipeline Generator',
    role: 'Code & DAG Generation',
    icon: '⚡',
    status: 'running',
    tasksCompleted: 4231,
    cpuUsage: 52,
    memoryUsage: '1.8 GB',
    currentTask: 'Generating Airflow DAG for daily_sales_etl',
    uptime: '14d 6h 25m',
    logs: [
      '14:32:30 — DAG generated: daily_sales_etl.py (42 tasks)',
      '14:30:00 — dbt model created: customer_360.sql',
      '14:27:45 — Data quality test suite generated',
    ],
  },
  {
    id: 5,
    name: 'Orchestrator',
    role: 'Multi-Agent Coordination',
    icon: '🎯',
    status: 'running',
    tasksCompleted: 5678,
    cpuUsage: 18,
    memoryUsage: '0.6 GB',
    currentTask: 'Coordinating 3 agents for pipeline build request',
    uptime: '14d 6h 22m',
    logs: [
      '14:32:00 — Pipeline assembly: 4/4 stages complete',
      '14:30:45 — Agent handoff: Schema → Analyzer → Generator',
      '14:28:00 — Orchestration plan created (3 agents)',
    ],
  },
  {
    id: 6,
    name: 'Self-Healing Engine',
    role: 'Failure Detection & Recovery',
    icon: '🔧',
    status: 'idle',
    tasksCompleted: 2345,
    cpuUsage: 5,
    memoryUsage: '0.3 GB',
    currentTask: 'Monitoring — no active incidents',
    uptime: '14d 6h 20m',
    logs: [
      '14:00:00 — No anomalies detected in last hour',
      '13:00:00 — Health check: all pipelines operational',
      '12:30:00 — Auto-recovery simulation: passed',
    ],
  },
  {
    id: 7,
    name: 'Monitoring Agent',
    role: 'Real-time Pipeline Monitoring',
    icon: '📊',
    status: 'running',
    tasksCompleted: 18902,
    cpuUsage: 15,
    memoryUsage: '0.8 GB',
    currentTask: 'Streaming execution metrics from 15 active pipelines',
    uptime: '14d 6h 18m',
    logs: [
      '14:33:15 — Avg pipeline duration: 4.2 min',
      '14:31:00 — Alert: IoT stream latency spike detected',
      '14:28:45 — Dashboard updated: 126 total pipelines',
    ],
  },
  {
    id: 8,
    name: 'Knowledge Indexer',
    role: 'RAG & Documentation Search',
    icon: '📚',
    status: 'paused',
    tasksCompleted: 3456,
    cpuUsage: 2,
    memoryUsage: '4.5 GB',
    currentTask: 'Indexing paused — waiting for new documents',
    uptime: '14d 6h 15m',
    lastError: 'Disk space low at 15:00 UTC',
    logs: [
      '15:00:00 — Indexing paused: disk usage at 92%',
      '14:00:00 — Indexed 2,500 new documentation pages',
      '12:00:00 — Embedding generation: 98% complete',
    ],
  },
  {
    id: 9,
    name: 'API Gateway Agent',
    role: 'External API Integration',
    icon: '🌐',
    status: 'error',
    tasksCompleted: 7890,
    cpuUsage: 0,
    memoryUsage: '0.0 GB',
    currentTask: 'Failed — connection timeout to Slack API',
    uptime: '0d 0h 0m',
    lastError: 'Connection timeout after 30s at 14:35 UTC',
    logs: [
      '14:35:00 — Error: connection timeout to api.slack.com',
      '14:34:00 — Retry attempt 3/3 failed',
      '14:30:00 — Retry attempt 2/3: socket hang up',
      '14:25:00 — Initial connection to Slack API',
    ],
  },
  {
    id: 10,
    name: 'Report Generator',
    role: 'Analytics & Reporting',
    icon: '📋',
    status: 'idle',
    tasksCompleted: 1234,
    cpuUsage: 3,
    memoryUsage: '0.2 GB',
    currentTask: 'Waiting for scheduled report generation (02:00 UTC)',
    uptime: '14d 6h 10m',
    logs: [
      '06:00:00 — Daily report generated: 15 pages',
      '06:00:00 — PDF export: 12.4 MB',
      '02:00:00 — Weekly summary: 126 pipelines, 97.8% success',
    ],
  },
  {
    id: 11,
    name: 'Security Auditor',
    role: 'Access Control & Audit',
    icon: '🔒',
    status: 'running',
    tasksCompleted: 4567,
    cpuUsage: 8,
    memoryUsage: '0.4 GB',
    currentTask: 'Auditing API access logs for anomalous patterns',
    uptime: '14d 6h 5m',
    logs: [
      '14:30:00 — Audit check: 0 anomalies in last 15 min',
      '14:00:00 — Token refresh: 12 tokens rotated',
      '13:00:00 — Access review: all active sessions valid',
    ],
  },
  {
    id: 12,
    name: 'Optimization Engine',
    role: 'Pipeline Performance Tuning',
    icon: '🚀',
    status: 'running',
    tasksCompleted: 678,
    cpuUsage: 38,
    memoryUsage: '1.5 GB',
    currentTask: 'Running cost optimization analysis on 5 pipelines',
    uptime: '7d 2h 30m',
    logs: [
      '14:34:00 — Optimization: IoT pipeline could save 32% on compute',
      '14:30:00 — Memory profiling complete: 5 candidates',
      '14:25:00 — Analyzing query execution plans for joins',
    ],
  },
  {
    id: 13,
    name: 'Decision Engine',
    role: 'Self-Healing Decision Making',
    icon: '🤔',
    status: 'idle',
    tasksCompleted: 890,
    cpuUsage: 2,
    memoryUsage: '0.1 GB',
    currentTask: 'Standby — no decisions pending',
    uptime: '14d 6h 0m',
    logs: [
      '12:00:00 — Previous decision: Restart IoT pipeline (successful)',
      '10:00:00 — Decision: Re-route traffic to backup connector',
      '08:00:00 — Evaluated 3 recovery strategies for Kafka failure',
    ],
  },
  {
    id: 14,
    name: 'Deployment Agent',
    role: 'CI/CD & Deployment',
    icon: '📦',
    status: 'running',
    tasksCompleted: 234,
    cpuUsage: 22,
    memoryUsage: '0.7 GB',
    currentTask: 'Deploying updated pipeline DAG to Airflow',
    uptime: '3d 12h 15m',
    logs: [
      '14:33:00 — DAG deployed: daily_sales_etl v2.1.0',
      '14:30:00 — Pre-deployment validation passed',
      '14:28:00 — Syncing DAG files to /opt/airflow/dags/',
    ],
  },
  {
    id: 15,
    name: 'Learning Agent',
    role: 'Continuous Model Improvement',
    icon: '🎓',
    status: 'paused',
    tasksCompleted: 156,
    cpuUsage: 1,
    memoryUsage: '3.2 GB',
    currentTask: 'Training paused — waiting for labeled data',
    uptime: '0d 0h 0m',
    lastError: 'Insufficient labeled data for fine-tuning',
    logs: [
      '14:00:00 — Training paused: need 500 more labeled examples',
      '12:00:00 — Dataset size: 2,350 labeled intents',
      '10:00:00 — Fine-tuning checkpoint saved',
    ],
  },
];

// ─── Status helpers ─────────────────────────────────────────────────────────────
const statusConfig: Record<string, { bg: string; dot: string; icon: React.ReactNode; label: string }> = {
  running: {
    bg: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400',
    dot: 'bg-green-500 animate-pulse',
    icon: <RefreshCw size={12} className="animate-spin" />,
    label: 'Running',
  },
  idle: {
    bg: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    dot: 'bg-gray-400',
    icon: <Clock size={12} />,
    label: 'Idle',
  },
  error: {
    bg: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
    dot: 'bg-red-500',
    icon: <AlertCircle size={12} />,
    label: 'Error',
  },
  paused: {
    bg: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
    dot: 'bg-amber-400',
    icon: <Pause size={12} />,
    label: 'Paused',
  },
};

// ─── Agent Card ─────────────────────────────────────────────────────────────────
interface AgentCardProps {
  agent: AIAgent;
  expanded: boolean;
  onToggle: () => void;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, expanded, onToggle }) => {
  const status = statusConfig[agent.status];

  return (
    <div
      className={`group rounded-2xl border bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md dark:bg-gray-900/80 dark:border-gray-800 ${
        agent.status === 'error' ? 'border-red-200 dark:border-red-900/50' :
        agent.status === 'running' ? 'border-green-200 dark:border-green-900/30' :
        agent.status === 'paused' ? 'border-amber-200 dark:border-amber-900/30' :
        'border-gray-200 dark:border-gray-800'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${
            agent.status === 'running' ? 'bg-green-100 dark:bg-green-950/50' :
            agent.status === 'error' ? 'bg-red-100 dark:bg-red-950/50' :
            agent.status === 'paused' ? 'bg-amber-100 dark:bg-amber-950/50' :
            'bg-gray-100 dark:bg-gray-800'
          }`}>
            {agent.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">{agent.name}</h3>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.bg}`}>
                {status.icon}
                {status.label}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{agent.role}</p>
          </div>
        </div>
        <button
          onClick={onToggle}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          <svg
            className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Metrics */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-gray-50 p-2.5 dark:bg-gray-800/50">
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Tasks</p>
          <p className="mt-0.5 text-sm font-bold text-gray-900 dark:text-white">{agent.tasksCompleted.toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-2.5 dark:bg-gray-800/50">
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">CPU</p>
          <div className="mt-1 flex items-center gap-1.5">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className={`h-full rounded-full transition-all ${
                  agent.cpuUsage > 80 ? 'bg-red-500' : agent.cpuUsage > 40 ? 'bg-amber-500' : 'bg-green-500'
                }`}
                style={{ width: `${agent.cpuUsage}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{agent.cpuUsage}%</span>
          </div>
        </div>
        <div className="rounded-lg bg-gray-50 p-2.5 dark:bg-gray-800/50">
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Memory</p>
          <p className="mt-0.5 text-sm font-bold text-gray-900 dark:text-white">{agent.memoryUsage}</p>
        </div>
      </div>

      {/* Current Task */}
      <div className="mt-3 flex items-start gap-2 rounded-lg bg-purple-50/50 p-2.5 dark:bg-purple-950/20">
        <Zap size={14} className="mt-0.5 shrink-0 text-purple-500" />
        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
          <span className="font-medium text-gray-900 dark:text-gray-200">Current: </span>
          {agent.currentTask}
        </p>
      </div>

      {/* Error Banner */}
      {agent.lastError && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 p-2.5 dark:bg-red-950/20">
          <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-500" />
          <div>
            <p className="text-xs font-medium text-red-700 dark:text-red-400">Error</p>
            <p className="text-xs text-red-600 dark:text-red-300">{agent.lastError}</p>
          </div>
        </div>
      )}

      {/* Expanded: Logs */}
      {expanded && (
        <div className="mt-4 animate-slide-down">
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-gray-900/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Recent Activity</p>
              <span className="text-[10px] text-gray-400">{agent.uptime} uptime</span>
            </div>
            <div className="space-y-1.5">
              {agent.logs.map((log, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px]">
                  <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                    log.includes('Error') ? 'bg-red-400' :
                    log.includes('pause') || log.includes('Paus') ? 'bg-amber-400' :
                    'bg-green-400'
                  }`} />
                  <p className="text-gray-600 dark:text-gray-400 font-mono leading-relaxed">{log}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Uptime */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
          <Clock size={12} />
          <span>Uptime: {agent.uptime}</span>
        </div>
        <div className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
      </div>
    </div>
  );
};

// ─── Main Page ──────────────────────────────────────────────────────────────────
const AgentsPage: React.FC = () => {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'tasks' | 'cpu'>('name');
  const navigate = useNavigate();

  const filteredAgents = AGENTS
    .filter((agent) => {
      if (statusFilter !== 'all' && agent.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          agent.name.toLowerCase().includes(q) ||
          agent.role.toLowerCase().includes(q) ||
          agent.currentTask.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'tasks') return b.tasksCompleted - a.tasksCompleted;
      if (sortBy === 'cpu') return b.cpuUsage - a.cpuUsage;
      return a.name.localeCompare(b.name);
    });

  const stats = {
    total: AGENTS.length,
    running: AGENTS.filter((a) => a.status === 'running').length,
    idle: AGENTS.filter((a) => a.status === 'idle').length,
    error: AGENTS.filter((a) => a.status === 'error').length,
    paused: AGENTS.filter((a) => a.status === 'paused').length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-purple-600 dark:text-purple-400">
            AI Infrastructure
          </p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
            AI Agents
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Your autonomous agent fleet — {stats.running} running, {stats.idle} idle, {stats.error} errors
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/builder')}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Sparkles size={16} />
            New Pipeline
          </button>
        </div>
      </div>

      {/* ── Quick Stats ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: 'Total Agents', value: stats.total, color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400', icon: Cpu },
          { label: 'Running', value: stats.running, color: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400', icon: RefreshCw },
          { label: 'Idle', value: stats.idle, color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', icon: Clock },
          { label: 'Errors', value: stats.error, color: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400', icon: AlertCircle },
          { label: 'Paused', value: stats.paused, color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400', icon: Pause },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`rounded-xl p-3 text-center ${stat.color}`}>
              <Icon size={16} className="mx-auto mb-1" />
              <p className="text-lg font-bold">{stat.value}</p>
              <p className="text-[10px] font-medium uppercase tracking-wider mt-0.5">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search agents..."
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm shadow-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-purple-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          >
            <option value="all">All Status</option>
            <option value="running">Running</option>
            <option value="idle">Idle</option>
            <option value="error">Error</option>
            <option value="paused">Paused</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-purple-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          >
            <option value="name">Sort: Name</option>
            <option value="tasks">Sort: Tasks</option>
            <option value="cpu">Sort: CPU</option>
          </select>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          Showing <span className="font-semibold text-gray-900 dark:text-white">{filteredAgents.length}</span> of {AGENTS.length} agents
        </p>
      </div>

      {/* ── Agent Grid ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredAgents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            expanded={expandedId === agent.id}
            onToggle={() => setExpandedId(expandedId === agent.id ? null : agent.id)}
          />
        ))}
      </div>

      {/* ── Empty State ── */}
      {filteredAgents.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center dark:border-gray-700">
          <div className="text-4xl mb-3">🤖</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No agents match your filters</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Try adjusting your search or filter criteria.</p>
          <button
            onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
            className="mt-4 text-sm font-semibold text-purple-600 hover:text-purple-700"
          >
            Clear all filters →
          </button>
        </div>
      )}

      {/* ── Legend ── */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/60">
        <div className="flex flex-wrap items-center gap-6 text-xs text-gray-500 dark:text-gray-400">
          <span className="font-semibold text-gray-700 dark:text-gray-300">Agent Status Legend:</span>
          {Object.entries(statusConfig).map(([key, val]) => (
            <span key={key} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${val.dot}`} />
              {val.label}
            </span>
          ))}
          <span className="ml-auto text-[10px]">Last updated: just now</span>
        </div>
      </div>
    </div>
  );
};

export default AgentsPage;
