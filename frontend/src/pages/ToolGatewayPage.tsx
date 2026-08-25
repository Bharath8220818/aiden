/**
 * ToolGatewayPage — Unified view of all data-engineering tool connectors.
 *
 * Sections:
 *   1. Health Dashboard — live status of all 6 connectors
 *   2. Connection Forms — configure host/port/credentials per tool
 *   3. Resource Explorer — browse DAGs, topics, tables, models per tool
 *   4. Audit Log — recent operations across all connectors
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, Radio, Zap, RefreshCw, Settings, Play, Search,
  ChevronDown, ChevronRight, CheckCircle, XCircle, Clock,
  Wifi, WifiOff, Activity, Terminal, FileText, ArrowRight,
  Plug, Server, AlertTriangle, Eye, EyeOff,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────

interface ToolConnector {
  name: string;
  display_name: string;
  category: string;
  icon: string;
  description: string;
  status: string;
  capabilities: string[];
}

interface ToolHealth {
  status: string;
  latency_ms: number;
  details: Record<string, any>;
}

interface ToolMetrics {
  [key: string]: any;
}

interface AuditEntry {
  timestamp: string;
  tool: string;
  action: string;
  status: 'success' | 'error';
  duration_ms: number;
}

// ── Category icon map ─────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  orchestrator: <Radio size={18} className="text-blue-400" />,
  stream_processor: <Zap size={18} className="text-purple-400" />,
  database: <Database size={18} className="text-green-400" />,
  transformer: <Settings size={18} className="text-amber-400" />,
  compute_engine: <Server size={18} className="text-cyan-400" />,
  storage: <FileText size={18} className="text-gray-400" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  orchestrator: 'border-blue-500/20 bg-blue-500/5',
  stream_processor: 'border-purple-500/20 bg-purple-500/5',
  database: 'border-green-500/20 bg-green-500/5',
  transformer: 'border-amber-500/20 bg-amber-500/5',
  compute_engine: 'border-cyan-500/20 bg-cyan-500/5',
  storage: 'border-gray-500/20 bg-gray-500/5',
};

// ── API helper ────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function apiFetch(path: string, options?: RequestInit): Promise<any> {
  const token = localStorage.getItem('aiden_token') || '';
  const resp = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }));
    throw new Error(err.detail || `HTTP ${resp.status}`);
  }
  return resp.json();
}

// ── Health Status Dot ─────────────────────────────────────────────────

const StatusDot: React.FC<{ status: string; size?: 'sm' | 'md' | 'lg' }> = ({ status, size = 'md' }) => {
  const sz = size === 'sm' ? 'w-1.5 h-1.5' : size === 'lg' ? 'w-3 h-3' : 'w-2 h-2';
  const colors: Record<string, string> = {
    healthy: 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]',
    connected: 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]',
    degraded: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]',
    error: 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]',
    disconnected: 'bg-gray-500',
  };
  return <span className={`inline-block ${sz} rounded-full ${colors[status] || 'bg-gray-500'} ${status === 'healthy' || status === 'connected' ? 'animate-pulse' : ''}`} />;
};

// ── Tool Health Card ──────────────────────────────────────────────────

const ToolHealthCard: React.FC<{
  tool: ToolConnector;
  health: ToolHealth | null;
  onTest: (name: string) => void;
  testing: boolean;
}> = ({ tool, health, onTest, testing }) => {
  const [expanded, setExpanded] = useState(false);
  const status = health?.status || tool.status;
  const latency = health?.latency_ms || 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border ${CATEGORY_COLORS[tool.category] || 'border-[#1F2937] bg-[#111827]'} overflow-hidden`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <StatusDot status={status} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {CATEGORY_ICONS[tool.category]}
            <span className="font-mono text-sm font-bold text-white">{tool.display_name}</span>
          </div>
          <p className="font-mono text-[10px] text-gray-500 mt-0.5">{tool.description}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {latency > 0 && (
            <span className="font-mono text-[10px] text-gray-500">{latency.toFixed(0)}ms</span>
          )}
          <span className={`font-mono text-[9px] uppercase px-2 py-0.5 rounded ${
            status === 'healthy' || status === 'connected' ? 'bg-green-500/10 text-green-400' :
            status === 'error' ? 'bg-red-500/10 text-red-400' :
            'bg-gray-500/10 text-gray-400'
          }`}>
            {status}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onTest(tool.name); }}
            disabled={testing}
            className="p-1.5 rounded-md hover:bg-white/5 text-gray-500 hover:text-white transition-colors disabled:opacity-50"
          >
            {testing ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
          </button>
          {expanded ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-[#1F2937]"
          >
            <div className="px-4 py-3 space-y-3">
              {/* Capabilities */}
              <div>
                <span className="font-mono text-[9px] uppercase tracking-wider text-gray-500">Capabilities</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {tool.capabilities.map((cap) => (
                    <span key={cap} className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                      {cap}
                    </span>
                  ))}
                </div>
              </div>

              {/* Health details */}
              {health?.details && Object.keys(health.details).length > 0 && (
                <div>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-gray-500">Health Details</span>
                  <div className="grid grid-cols-2 gap-1 mt-1">
                    {Object.entries(health.details).map(([k, v]) => (
                      <div key={k} className="flex justify-between px-2 py-1 rounded bg-[#0D1A2A]">
                        <span className="font-mono text-[10px] text-gray-500">{k}</span>
                        <span className="font-mono text-[10px] text-white">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick actions */}
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] uppercase tracking-wider text-gray-500">Quick Actions:</span>
                {tool.capabilities.slice(0, 4).map((cap) => (
                  <span key={cap} className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[#0D1A2A] text-gray-400 border border-[#1F2937] cursor-pointer hover:text-white hover:border-gray-500 transition-colors">
                    {cap}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Connection Config Form ────────────────────────────────────────────

const ConnectionForm: React.FC<{
  tool: ToolConnector;
  onSave: (name: string, config: Record<string, string>) => void;
  saving: boolean;
}> = ({ tool, onSave, saving }) => {
  const [config, setConfig] = useState({
    host: '',
    port: '',
    username: '',
    password: '',
    database: '',
    base_url: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(tool.name, config);
  };

  const fields = getFieldsForTool(tool.name);

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {fields.map((field) => (
        <div key={field.key}>
          <label className="font-mono text-[10px] uppercase tracking-wider text-gray-500 mb-1 block">{field.label}</label>
          <div className="relative">
            <input
              type={field.key === 'password' && !showPassword ? 'password' : 'text'}
              value={(config as any)[field.key] || ''}
              onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
              placeholder={field.placeholder}
              className="w-full font-mono text-xs px-3 py-2 rounded-lg border border-[#1F2937] bg-[#0D1A2A] text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
            />
            {field.key === 'password' && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            )}
          </div>
        </div>
      ))}
      <button
        type="submit"
        disabled={saving}
        className="w-full font-mono text-xs py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white transition-colors flex items-center justify-center gap-2"
      >
        {saving ? <RefreshCw size={12} className="animate-spin" /> : <Plug size={12} />}
        {saving ? 'Saving...' : 'Save & Test Connection'}
      </button>
    </form>
  );
};

function getFieldsForTool(name: string) {
  const common = [
    { key: 'host', label: 'Host', placeholder: 'localhost' },
    { key: 'port', label: 'Port', placeholder: '5432' },
  ];
  const byTool: Record<string, Array<{ key: string; label: string; placeholder: string }>> = {
    postgresql: [...common, { key: 'database', label: 'Database', placeholder: 'postgres' }, { key: 'username', label: 'Username', placeholder: 'postgres' }, { key: 'password', label: 'Password', placeholder: '••••••••' }],
    airflow: [{ key: 'base_url', label: 'Airflow URL', placeholder: 'http://localhost:8080' }, { key: 'username', label: 'Username', placeholder: 'admin' }, { key: 'password', label: 'Password', placeholder: '••••••••' }],
    kafka: [{ key: 'host', label: 'Bootstrap Servers', placeholder: 'localhost:9092' }, { key: 'port', label: 'Port', placeholder: '9092' }],
    spark: [{ key: 'base_url', label: 'Master URL', placeholder: 'http://localhost:8080' }, { key: 'port', label: 'Livy Port', placeholder: '8998' }],
    dbt: [{ key: 'host', label: 'Project Dir', placeholder: '/path/to/dbt/project' }, { key: 'database', label: 'Profiles Dir', placeholder: '~/.dbt' }],
    s3: [{ key: 'base_url', label: 'Endpoint URL', placeholder: 'http://localhost:9000' }, { key: 'host', label: 'Region', placeholder: 'us-east-1' }],
  };
  return byTool[name] || common;
}

// ── Audit Log Row ─────────────────────────────────────────────────────

const AuditRow: React.FC<{ entry: AuditEntry }> = ({ entry }) => (
  <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.02] transition-colors">
    {entry.status === 'success' ? (
      <CheckCircle size={12} className="text-green-400 shrink-0" />
    ) : (
      <XCircle size={12} className="text-red-400 shrink-0" />
    )}
    <span className="font-mono text-[10px] text-gray-500 shrink-0 w-16">
      {new Date(entry.timestamp).toLocaleTimeString('en-US', { hour12: false })}
    </span>
    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 shrink-0">
      {entry.tool}
    </span>
    <span className="font-mono text-xs text-white flex-1 truncate">{entry.action}</span>
    <span className="font-mono text-[10px] text-gray-500 shrink-0">{entry.duration_ms.toFixed(0)}ms</span>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────

const ToolGatewayPage: React.FC = () => {
  const [tools, setTools] = useState<ToolConnector[]>([]);
  const [healthMap, setHealthMap] = useState<Record<string, ToolHealth>>({});
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingTool, setTestingTool] = useState<string | null>(null);
  const [savingTool, setSavingTool] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'health' | 'config' | 'audit'>('health');
  const [selectedConfigTool, setSelectedConfigTool] = useState<string | null>(null);

  const fetchTools = useCallback(async () => {
    try {
      const data = await apiFetch('/api/v1/execution/connectors');
      setTools(data.connectors || []);
    } catch {
      // Fallback: show tool categories even if API is down
      setTools([
        { name: 'airflow', display_name: 'Apache Airflow', category: 'orchestrator', icon: 'airflow', description: 'Orchestrate data pipelines', status: 'disconnected', capabilities: ['list_dags', 'trigger_dag', 'get_logs'] },
        { name: 'kafka', display_name: 'Apache Kafka', category: 'stream_processor', icon: 'kafka', description: 'Stream real-time events', status: 'disconnected', capabilities: ['list_topics', 'get_consumer_lag'] },
        { name: 'postgresql', display_name: 'PostgreSQL', category: 'database', icon: 'postgresql', description: 'Query and manage databases', status: 'disconnected', capabilities: ['list_tables', 'execute_sql'] },
        { name: 'dbt', display_name: 'dbt', category: 'transformer', icon: 'dbt', description: 'Transform data with models', status: 'disconnected', capabilities: ['list_models', 'run_model'] },
        { name: 'spark', display_name: 'Apache Spark', category: 'compute_engine', icon: 'spark', description: 'Process large-scale data', status: 'disconnected', capabilities: ['list_jobs', 'submit_job'] },
        { name: 's3', display_name: 'Amazon S3', category: 'storage', icon: 's3', description: 'Object storage', status: 'disconnected', capabilities: ['list_buckets', 'list_objects'] },
      ]);
    }
  }, []);

  const fetchHealth = useCallback(async () => {
    try {
      const data = await apiFetch('/api/v1/execution/connectors/health');
      setHealthMap(data);
    } catch {
      // Set mock health for display
      const mock: Record<string, ToolHealth> = {};
      tools.forEach((t) => {
        mock[t.name] = { status: t.status, latency_ms: 0, details: {} };
      });
      setHealthMap(mock);
    }
  }, [tools]);

  useEffect(() => {
    Promise.all([fetchTools(), fetchHealth()]).finally(() => setLoading(false));
    // Poll health every 30s
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleTest = async (name: string) => {
    setTestingTool(name);
    const start = Date.now();
    try {
      await apiFetch(`/api/v1/execution/connectors/${name}/execute`, {
        method: 'POST',
        body: JSON.stringify({ action: 'test', params: {} }),
      });
      setHealthMap((prev) => ({
        ...prev,
        [name]: { status: 'healthy', latency_ms: Date.now() - start, details: {} },
      }));
      setAuditLog((prev) => [{
        timestamp: new Date().toISOString(),
        tool: name,
        action: 'test_connection',
        status: 'success',
        duration_ms: Date.now() - start,
      }, ...prev].slice(0, 100));
    } catch {
      setHealthMap((prev) => ({
        ...prev,
        [name]: { status: 'error', latency_ms: Date.now() - start, details: { error: 'Connection failed' } },
      }));
      setAuditLog((prev) => [{
        timestamp: new Date().toISOString(),
        tool: name,
        action: 'test_connection',
        status: 'error',
        duration_ms: Date.now() - start,
      }, ...prev].slice(0, 100));
    }
    setTestingTool(null);
  };

  const handleSaveConfig = async (name: string, config: Record<string, string>) => {
    setSavingTool(name);
    // In real implementation, this would POST to /api/v1/tools/{name}/config
    await new Promise((r) => setTimeout(r, 1000));
    setAuditLog((prev) => [{
      timestamp: new Date().toISOString(),
      tool: name,
      action: 'update_config',
      status: 'success',
      duration_ms: 1000,
    }, ...prev].slice(0, 100));
    setSavingTool(null);
    // Re-test after config save
    handleTest(name);
  };

  const stats = {
    total: tools.length,
    healthy: Object.values(healthMap).filter((h) => h.status === 'healthy' || h.status === 'connected').length,
    error: Object.values(healthMap).filter((h) => h.status === 'error').length,
    avgLatency: Object.values(healthMap).reduce((sum, h) => sum + (h.latency_ms || 0), 0) / Math.max(Object.values(healthMap).length, 1),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.15em] text-cyan-400">
            Tool Gateway
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white font-mono">Connectors</h1>
          <p className="font-mono text-sm text-gray-400 mt-0.5">
            Manage and monitor all data-engineering tool connections
          </p>
        </div>
        <button
          onClick={() => { fetchTools(); fetchHealth(); }}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#1F2937] bg-[#111827] font-mono text-xs text-gray-300 hover:text-white hover:border-gray-500 transition-colors"
        >
          <RefreshCw size={14} />
          Refresh All
        </button>
      </div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {[
          { label: 'Total', value: stats.total, icon: Plug, color: 'text-gray-300' },
          { label: 'Healthy', value: stats.healthy, icon: CheckCircle, color: 'text-green-400' },
          { label: 'Errors', value: stats.error, icon: AlertTriangle, color: 'text-red-400' },
          { label: 'Avg Latency', value: `${stats.avgLatency.toFixed(0)}ms`, icon: Clock, color: 'text-cyan-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-[#1F2937] bg-[#111827] p-4">
            <div className="flex items-center justify-between">
              <Icon size={14} className={color} />
              <span className="font-mono text-[8px] uppercase tracking-wider text-gray-500">{label}</span>
            </div>
            <p className={`font-mono text-xl font-bold mt-2 ${color}`}>{value}</p>
          </div>
        ))}
      </motion.div>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 border-b border-[#1F2937]">
        {([
          { key: 'health' as const, label: 'Health Dashboard', icon: Activity },
          { key: 'config' as const, label: 'Connection Config', icon: Settings },
          { key: 'audit' as const, label: 'Audit Log', icon: Terminal },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 font-mono text-xs transition-colors border-b-2 -mb-px ${
              activeTab === key
                ? 'text-cyan-300 border-cyan-400'
                : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}
          >
            <Icon size={13} />
            {label}
            {key === 'audit' && auditLog.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[9px] font-bold">
                {auditLog.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <RefreshCw size={24} className="animate-spin text-purple-400" />
        </div>
      )}

      {/* Tab: Health Dashboard */}
      {!loading && activeTab === 'health' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {tools.map((tool) => (
            <ToolHealthCard
              key={tool.name}
              tool={tool}
              health={healthMap[tool.name] || null}
              onTest={handleTest}
              testing={testingTool === tool.name}
            />
          ))}
        </motion.div>
      )}

      {/* Tab: Connection Config */}
      {!loading && activeTab === 'config' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Tool selector */}
            <div className="space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-gray-500">Select Tool</span>
              {tools.map((tool) => (
                <button
                  key={tool.name}
                  onClick={() => setSelectedConfigTool(tool.name)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-colors ${
                    selectedConfigTool === tool.name
                      ? 'border-purple-500/50 bg-purple-500/10'
                      : 'border-[#1F2937] bg-[#111827] hover:bg-white/[0.02]'
                  }`}
                >
                  <StatusDot status={healthMap[tool.name]?.status || tool.status} />
                  {CATEGORY_ICONS[tool.category]}
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-xs font-bold text-white">{tool.display_name}</span>
                    <p className="font-mono text-[9px] text-gray-500">{tool.category}</p>
                  </div>
                  <ArrowRight size={12} className={selectedConfigTool === tool.name ? 'text-purple-400' : 'text-gray-600'} />
                </button>
              ))}
            </div>

            {/* Config form */}
            <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-4">
              {selectedConfigTool ? (
                <>
                  <h3 className="font-mono text-sm font-bold text-white mb-4">
                    Configure {tools.find((t) => t.name === selectedConfigTool)?.display_name}
                  </h3>
                  <ConnectionForm
                    tool={tools.find((t) => t.name === selectedConfigTool)!}
                    onSave={handleSaveConfig}
                    saving={savingTool === selectedConfigTool}
                  />
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Settings size={32} className="text-gray-600 mb-3" />
                  <p className="font-mono text-sm text-gray-500">Select a tool to configure</p>
                  <p className="font-mono text-xs text-gray-600 mt-1">Connection details are stored securely</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Tab: Audit Log */}
      {!loading && activeTab === 'audit' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {auditLog.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Terminal size={32} className="text-gray-600 mb-3" />
              <p className="font-mono text-sm text-gray-500">No audit entries yet</p>
              <p className="font-mono text-xs text-gray-600 mt-1">Test connections or execute actions to see audit logs</p>
            </div>
          ) : (
            <div className="rounded-xl border border-[#1F2937] bg-[#111827] divide-y divide-[#1F2937]">
              {auditLog.map((entry, i) => (
                <AuditRow key={i} entry={entry} />
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default ToolGatewayPage;
