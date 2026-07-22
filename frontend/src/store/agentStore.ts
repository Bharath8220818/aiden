// frontend/src/store/agentStore.ts
import { create } from 'zustand';

// ─── Types ───────────────────────────────────────────────────────────────
export interface Agent {
  name: string;
  description: string;
  status: 'idle' | 'running' | 'success' | 'error';
  progress?: number;
  log?: string;
  // Extended fields for the Agents page
  icon: string;
  role: string;
  tasksCompleted: number;
  cpuUsage: number;
  memoryUsage: string;
  currentTask: string;
  uptime: string;
  lastError?: string;
  logs: string[];
}

export interface ActivityEntry {
  time: string;
  agent: string;
  message: string;
}

// ─── Mock Data ──────────────────────────────────────────────────────────
const DEFAULT_AGENTS: Agent[] = [
  {
    name: 'Intent Parser',
    description: 'Understanding user requests',
    status: 'running',
    icon: '🧠',
    role: 'Natural Language Understanding',
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
    name: 'Schema Discovery',
    description: 'Exploring data sources',
    status: 'running',
    icon: '🔍',
    role: 'Data Source Exploration',
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
    name: 'Extraction Agent',
    description: 'Connecting to databases',
    status: 'running',
    icon: '📤',
    role: 'Data Extraction',
    tasksCompleted: 15600,
    cpuUsage: 45,
    memoryUsage: '2.4 GB',
    currentTask: 'Connecting to PostgreSQL: sales_db',
    uptime: '14d 5h 12m',
    logs: [
      '14:30:00 — Connected to PostgreSQL: sales_db',
      '14:28:45 — Extracted 12,500 rows from sales table',
      '14:25:30 — Schema version: v3.2.1',
    ],
  },
  {
    name: 'Cleaning Agent',
    description: 'Data quality & deduplication',
    status: 'idle',
    icon: '🧹',
    role: 'Data Cleansing',
    tasksCompleted: 20300,
    cpuUsage: 12,
    memoryUsage: '0.4 GB',
    currentTask: 'Waiting for data',
    uptime: '14d 4h 0m',
    logs: [
      '14:20:00 — Cleaned 2,340 rows from sales',
      '14:15:30 — Removed 45 duplicates',
      '14:10:15 — Null value check completed',
    ],
  },
  {
    name: 'Transformation Agent',
    description: 'Generating SQL & dbt models',
    status: 'running',
    icon: '🔄',
    role: 'Data Transformation',
    tasksCompleted: 11200,
    cpuUsage: 56,
    memoryUsage: '2.1 GB',
    currentTask: 'Generating dbt models for customer_analytics',
    uptime: '14d 6h 10m',
    logs: [
      '14:31:00 — Generated dbt model: customer_summary',
      '14:28:30 — SQL transformation completed',
      '14:25:00 — Aggregation by region applied',
    ],
  },
  {
    name: 'Pipeline Builder',
    description: 'Creating Airflow DAGs',
    status: 'running',
    icon: '🏗️',
    role: 'Pipeline Construction',
    tasksCompleted: 9800,
    cpuUsage: 48,
    memoryUsage: '1.8 GB',
    currentTask: 'Building Airflow DAG for daily_sales_etl',
    uptime: '14d 5h 45m',
    logs: [
      '14:29:00 — DAG generated: daily_sales_etl.py',
      '14:27:30 — Dependencies resolved',
      '14:24:00 — Validation passed',
    ],
  },
  {
    name: 'Analytics Agent',
    description: 'BI metrics & KPIs',
    status: 'idle',
    icon: '📊',
    role: 'Business Intelligence',
    tasksCompleted: 6700,
    cpuUsage: 8,
    memoryUsage: '0.3 GB',
    currentTask: 'Generating monthly reports',
    uptime: '14d 3h 0m',
    logs: [
      '14:10:00 — Monthly report generated',
      '14:05:30 — KPI dashboard updated',
      '14:00:00 — Data export to CSV',
    ],
  },
  {
    name: 'Visualization Agent',
    description: 'Dashboards & charts',
    status: 'running',
    icon: '📈',
    role: 'Data Visualization',
    tasksCompleted: 4500,
    cpuUsage: 34,
    memoryUsage: '0.7 GB',
    currentTask: 'Rendering pipeline health dashboard',
    uptime: '14d 2h 30m',
    logs: [
      '14:20:00 — Pipeline health chart updated',
      '14:15:30 — Real-time metrics dashboard',
      '14:10:00 — Export PNG',
    ],
  },
  {
    name: 'Monitoring Agent',
    description: 'Tracking pipeline health',
    status: 'running',
    icon: '👁️',
    role: 'Observability',
    tasksCompleted: 17800,
    cpuUsage: 22,
    memoryUsage: '1.0 GB',
    currentTask: 'Monitoring pipeline failures',
    uptime: '14d 6h 20m',
    logs: [
      '14:30:00 — Alert: pipeline daily_sales_etl failed',
      '14:28:00 — Root cause analysis: schema drift',
      '14:25:00 — Self-healing triggered',
    ],
  },
  {
    name: 'Security Agent',
    description: 'Auth & RBAC',
    status: 'running',
    icon: '🔒',
    role: 'Security & Compliance',
    tasksCompleted: 20300,
    cpuUsage: 18,
    memoryUsage: '0.8 GB',
    currentTask: 'Auditing access logs',
    uptime: '14d 5h 0m',
    logs: [
      '14:15:00 — Audit log: user john.doe logged in',
      '14:10:30 — RBAC policy applied',
      '14:05:00 — API key rotated',
    ],
  },
  {
    name: 'Governance Agent',
    description: 'Compliance & lineage',
    status: 'idle',
    icon: '📋',
    role: 'Data Governance',
    tasksCompleted: 3400,
    cpuUsage: 6,
    memoryUsage: '0.2 GB',
    currentTask: 'Checking data lineage',
    uptime: '14d 1h 0m',
    logs: [
      '14:00:00 — Lineage graph updated',
      '13:55:00 — Data privacy scan completed',
    ],
  },
  {
    name: 'Optimization Agent',
    description: 'Cost & performance tuning',
    status: 'running',
    icon: '⚡',
    role: 'Performance Optimization',
    tasksCompleted: 7600,
    cpuUsage: 52,
    memoryUsage: '1.5 GB',
    currentTask: 'Tuning query performance',
    uptime: '14d 4h 30m',
    logs: [
      '14:20:00 — Query optimization applied',
      '14:15:30 — Cost reduction: 12%',
      '14:10:00 — Index recommendation',
    ],
  },
  {
    name: 'Self-Healing Agent',
    description: 'Auto-repair failures',
    status: 'error',
    icon: '🔧',
    role: 'Autonomous Recovery',
    tasksCompleted: 31200,
    cpuUsage: 0,
    memoryUsage: '0.0 GB',
    currentTask: 'Diagnosing pipeline failure',
    uptime: '14d 6h 40m',
    lastError: 'Network timeout while connecting to PostgreSQL',
    logs: [
      '14:32:00 — Failure detected: schema drift',
      '14:30:30 — Fix proposed: alter table add column',
      '14:28:00 — Approval required',
    ],
  },
  {
    name: 'Learning Agent',
    description: 'RAG & knowledge graph',
    status: 'running',
    icon: '🧠',
    role: 'Continuous Learning',
    tasksCompleted: 5400,
    cpuUsage: 38,
    memoryUsage: '2.8 GB',
    currentTask: 'Updating RAG index with new pipeline',
    uptime: '14d 3h 20m',
    logs: [
      '14:25:00 — RAG index updated',
      '14:20:30 — New knowledge graph node added',
      '14:15:00 — Embedding generated',
    ],
  },
  {
    name: 'Deployment Agent',
    description: 'CI/CD & Docker',
    status: 'idle',
    icon: '🚀',
    role: 'DevOps Automation',
    tasksCompleted: 2300,
    cpuUsage: 5,
    memoryUsage: '0.1 GB',
    currentTask: 'Ready for deployment',
    uptime: '14d 0h 30m',
    logs: [
      '14:00:00 — Docker image built',
      '13:55:00 — Kubernetes manifest generated',
      '13:50:00 — Deployment ready',
    ],
  },
];

// ─── Store ──────────────────────────────────────────────────────────────
interface AgentState {
  agents: Agent[];
  activityLog: ActivityEntry[];
  isPipelineRunning: boolean;
  lastSync: string | null;
  agentsList: Agent[];
  selectedAgent: Agent | null;
  isLoadingAgents: boolean;

  addActivity: (agent: string, message: string) => void;
  updateAgentStatus: (name: string, status: Agent['status'], progress?: number) => void;
  updateAgentLog: (name: string, log: string) => void;
  setPipelineRunning: (running: boolean) => void;
  resetAgents: () => void;
  fetchAgents: () => Promise<void>;
  selectAgent: (agent: Agent | null) => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  agents: DEFAULT_AGENTS,
  activityLog: [],
  isPipelineRunning: false,
  lastSync: null,
  agentsList: [],
  selectedAgent: null,
  isLoadingAgents: false,

  addActivity: (agent, message) =>
    set((state) => ({
      activityLog: [
        { time: new Date().toLocaleTimeString('en-US', { hour12: false }), agent, message },
        ...state.activityLog,
      ].slice(0, 100),
      lastSync: new Date().toLocaleTimeString('en-US', { hour12: false }),
    })),

  updateAgentStatus: (name, status, progress) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.name === name ? { ...a, status, ...(progress !== undefined ? { progress } : {}) } : a
      ),
    })),

  updateAgentLog: (name, log) =>
    set((state) => ({
      agents: state.agents.map((a) => (a.name === name ? { ...a, log } : a)),
    })),

  setPipelineRunning: (running) => set({ isPipelineRunning: running }),

  resetAgents: () =>
    set({
      agents: DEFAULT_AGENTS.map((a) => ({ ...a })),
      activityLog: [],
      isPipelineRunning: false,
    }),

  fetchAgents: async () => {
    set({ isLoadingAgents: true });
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 300));
    set({ agentsList: DEFAULT_AGENTS, isLoadingAgents: false });
  },

  selectAgent: (agent) => set({ selectedAgent: agent }),
}));
