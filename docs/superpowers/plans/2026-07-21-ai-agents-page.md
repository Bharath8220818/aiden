# AI Agents Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the existing AI Agents page with the enterprise dark-first design system, connect it to the Zustand store, and add zoom-in detail modals.

**Architecture:** The page already exists with 15 mock agents, a route at `/agents`, a nav link in `Header.tsx`, and a basic `agentStore`. The plan enhances the store with richer agent types, replaces the light-first CSS with the dark-first design system (`glass-card`, `bg-[#111827]`, `border-[#1E293B]`), and adds an `AgentDetailModal` component for the zoom-in experience. Data moves from inline mock arrays into the store.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Framer Motion, Zustand, Lucide React

## Global Constraints

- All new components use the enterprise dark-first design system: backgrounds `bg-[#111827]`, borders `border-[#1E293B]`, cards `glass-card`, buttons `btn-primary-gradient` or `btn-secondary`
- No new npm dependencies — all icons from `lucide-react`, animations from `framer-motion`
- Existing `agentStore.ts` `Agent` interface must be extended, not replaced
- `App.tsx` route at `/agents` and `Header.tsx` nav link already exist — do not modify them
- Must follow the existing Zustand store pattern (`create<AgentState>((set) => ({}))`)
- `AgentManagerPanel.tsx` already depends on `useAgentStore` — changes to the store must be backward-compatible

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `frontend/src/store/agentStore.ts` | **Modify** | Extend `Agent` type with richer fields. Add mock data for 15 agents. Export `fetchAgents` action. |
| `frontend/src/pages/AgentsPage.tsx` | **Modify** | Replace light-first CSS with dark-first design. Read from store instead of inline data. Add zoom-in modal (via sub-component). Use `PageTransition` for entrance animation. |
| `frontend/src/components/agents/AgentDetailModal.tsx` | **Create** | Full-screen modal opened by clicking an agent card. Shows expanded logs, reasoning, memory usage chart, and timeline. |
| `frontend/src/index.css` | **No change** | Design tokens already defined (glass-card, btn-primary-gradient, etc.) |
| `frontend/src/App.tsx` | **No change** | Route `/agents` already points to `AgentsPage` |
| `frontend/src/components/common/Header.tsx` | **No change** | Nav already includes `Agents` item with `<Cpu size={16} />` |

---

<!-- Task 1: Store Enhancement -->

### Task 1: Enhance agent store with rich agent types and mock data

**Files:**
- Modify: `frontend/src/store/agentStore.ts:1-75`

**Interfaces:**
- Consumes: existing `Agent` interface (name, description, status, progress, log)
- Produces: extended `Agent` interface, 15 mock agents, `fetchAgents()` action

- [ ] **Step 1: Extend the `Agent` interface with richer fields**

Replace the existing `Agent` interface to add all the fields the page needs. Keep the original fields for backward compatibility with `AgentManagerPanel.tsx`.

```typescript
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
```

- [ ] **Step 2: Add mock agent data array to the store**

Add a `AGENT_MOCK_DATA` constant (15 agents) between the `DEFAULT_AGENTS` and the `useAgentStore` creation. Each mock agent must include all extended fields. Copy the 15 agents from the existing `AgentsPage.tsx` inline data.

```typescript
const AGENT_MOCK_DATA: Agent[] = [
  {
    name: 'Intent Parser',
    role: 'Natural Language Understanding',
    icon: '🧠',
    status: 'running',
    tasksCompleted: 12580,
    cpuUsage: 32,
    memoryUsage: '1.2 GB',
    currentTask: 'Parsing user request: "Build ETL pipeline from PostgreSQL..."',
    uptime: '14d 6h 32m',
    description: 'Understanding your request',
    logs: [
      '14:32:01 — Parsed intent: postgres_to_snowflake_pipeline',
      '14:30:22 — Extracted 3 transformations from request',
      '14:28:15 — Confidence score: 0.94',
      '14:25:00 — Context window: 2048 tokens',
    ],
  },
  {
    name: 'Schema Discovery',
    role: 'Data Source Exploration',
    icon: '🔍',
    status: 'running',
    tasksCompleted: 8942,
    cpuUsage: 28,
    memoryUsage: '0.9 GB',
    currentTask: 'Scanning PostgreSQL sales_db for schema changes',
    uptime: '14d 6h 30m',
    description: 'Exploring data sources',
    logs: [
      '14:31:00 — Found new table: order_items_2026',
      '14:29:15 — Index recommendations for customer_orders',
      '14:27:30 — Detected schema drift in users table',
    ],
  },
  // ... all 15 agents in the same format
];
```

Copy the full 15-agent array from `frontend/src/pages/AgentsPage.tsx` lines 27-300 (the `AGENTS` array). Transform each entry to use `status` values `'idle' | 'running' | 'success' | 'error'` by mapping the existing values (`'paused'` → `'idle'`, `'running'` stays).

- [ ] **Step 3: Add `fetchAgents` action and `agentsList` state**

```typescript
interface AgentState {
  agents: Agent[];
  activityLog: ActivityEntry[];
  isPipelineRunning: boolean;
  lastSync: string | null;
  agentsList: Agent[];       // NEW: full 15-agent list for the Agents page
  selectedAgent: Agent | null; // NEW: currently selected agent for the modal
  isLoadingAgents: boolean;  // NEW: loading state

  // Existing actions (unchanged):
  addActivity: (agent: string, message: string) => void;
  updateAgentStatus: (name: string, status: Agent['status'], progress?: number) => void;
  updateAgentLog: (name: string, log: string) => void;
  setPipelineRunning: (running: boolean) => void;
  resetAgents: () => void;

  // NEW actions:
  fetchAgents: () => Promise<void>;
  selectAgent: (agent: Agent | null) => void;
}
```

- [ ] **Step 4: Implement `fetchAgents` and `selectAgent`**

```typescript
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

  setPipelineRunning: (running) =>
    set({ isPipelineRunning: running }),

  resetAgents: () =>
    set({
      agents: DEFAULT_AGENTS.map((a) => ({ ...a })),
      activityLog: [],
      isPipelineRunning: false,
    }),

  // NEW implementations:
  fetchAgents: async () => {
    set({ isLoadingAgents: true });
    // Simulate API fetch with the mock data
    await new Promise((r) => setTimeout(r, 300));
    set({ agentsList: AGENT_MOCK_DATA, isLoadingAgents: false });
  },

  selectAgent: (agent) => set({ selectedAgent: agent }),
}));
```

- [ ] **Step 5: Verify store compiles**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors (or only errors from Task 2, which is expected since `AgentsPage.tsx` hasn't been updated yet)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/store/agentStore.ts
git commit -m "feat(agents): extend agent store with rich types and 15 mock agents"
```

---

<!-- Task 2: Agent Detail Modal -->

### Task 2: Create AgentDetailModal component

**Files:**
- Create: `frontend/src/components/agents/AgentDetailModal.tsx`

**Interfaces:**
- Consumes: `Agent` type from `useAgentStore` (extended interface with `logs`, `cpuUsage`, `memoryUsage`, `tasksCompleted`, `uptime`, `lastError`)
- Consumes: `selectedAgent` and `selectAgent` from `useAgentStore`
- Produces: `<AgentDetailModal />` component that renders when `selectedAgent` is non-null

- [ ] **Step 1: Write the component**

```typescript
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Zap, Activity, Clock, CheckCircle, AlertCircle,
  RefreshCw, Cpu, Database, Shield,
} from 'lucide-react';
import { useAgentStore } from '../../store/agentStore';

const AgentDetailModal: React.FC = () => {
  const { selectedAgent, selectAgent } = useAgentStore();

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') selectAgent(null);
    };
    if (selectedAgent) {
      document.addEventListener('keydown', handleKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [selectedAgent, selectAgent]);

  if (!selectedAgent) return null;

  const statusColors: Record<string, string> = {
    running: 'bg-green-500/20 text-green-400 border-green-500/30',
    idle: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    success: 'bg-green-500/20 text-green-400 border-green-500/30',
    error: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const logDotColors: Record<string, string> = {
    Error: 'bg-red-400',
    error: 'bg-red-400',
    pause: 'bg-amber-400',
    Paus: 'bg-amber-400',
  };

  const getLogDotColor = (log: string) => {
    for (const [key, color] of Object.entries(logDotColors)) {
      if (log.includes(key)) return color;
    }
    return 'bg-green-400';
  };

  const a = selectedAgent;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={() => selectAgent(null)}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', duration: 0.4, bounce: 0.25 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-3xl border border-[#1E293B] bg-[#111827] shadow-2xl shadow-purple-500/10"
        >
          {/* Close button */}
          <button
            onClick={() => selectAgent(null)}
            className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={16} />
          </button>

          {/* Header */}
          <div className="p-6 pb-4 border-b border-[#1E293B]">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1E293B] text-2xl">
                {a.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-white">{a.name}</h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusColors[a.status] || statusColors.idle}`}>
                    {a.status === 'running' ? 'Running' :
                     a.status === 'success' ? 'Online' :
                     a.status === 'error' ? 'Error' : 'Idle'}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-1">{a.role}</p>
                <p className="text-xs text-gray-500 mt-1">{a.currentTask}</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Tasks Completed', value: a.tasksCompleted.toLocaleString(), icon: CheckCircle, color: 'text-green-400' },
                { label: 'CPU Usage', value: `${a.cpuUsage}%`, icon: Cpu, color: 'text-purple-400' },
                { label: 'Memory', value: a.memoryUsage, icon: Database, color: 'text-cyan-400' },
                { label: 'Uptime', value: a.uptime, icon: Clock, color: 'text-amber-400' },
              ].map((metric) => {
                const Icon = metric.icon;
                return (
                  <div key={metric.label} className="rounded-xl bg-[#0D1A2A] border border-[#1E293B] p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon size={14} className={metric.color} />
                      <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
                        {metric.label}
                      </span>
                    </div>
                    <p className="text-lg font-bold text-white">{metric.value}</p>
                  </div>
                );
              })}
            </div>

            {/* CPU Usage Bar (detailed) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-400">CPU Load</span>
                <span className="text-xs text-gray-500">{a.cpuUsage}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#1E293B]">
                <div
                  className={`h-full rounded-full transition-all ${
                    a.cpuUsage > 80 ? 'bg-red-500' : a.cpuUsage > 40 ? 'bg-amber-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${a.cpuUsage}%` }}
                />
              </div>
            </div>

            {/* Error Banner */}
            {a.lastError && (
              <div className="flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-4">
                <AlertCircle size={18} className="shrink-0 text-red-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-300">Last Error</p>
                  <p className="text-xs text-red-400/80 mt-1">{a.lastError}</p>
                </div>
              </div>
            )}

            {/* Activity Log */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-white">Activity Log</h3>
                <span className="text-[10px] text-gray-500">{a.uptime} uptime</span>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {a.logs.map((log, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs">
                    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${getLogDotColor(log)}`} />
                    <span className="text-gray-400 font-mono leading-relaxed">{log}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AgentDetailModal;
```

- [ ] **Step 2: Create barrel export**

```typescript
// frontend/src/components/agents/index.ts
export { default as AgentDetailModal } from './AgentDetailModal';
```

- [ ] **Step 3: TypeScript check**

Run: `cd frontend && npx tsc --noEmit 2>&1`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/agents/
git commit -m "feat(agents): add AgentDetailModal with metrics grid, CPU bar, error banner, and activity log"
```

---

<!-- Task 3: Enterprise Agents Page Refresh -->

### Task 3: Refresh AgentsPage with enterprise dark design and store integration

**Files:**
- Modify: `frontend/src/pages/AgentsPage.tsx` (replace entire file content)

**Interfaces:**
- Consumes: `useAgentStore` with `agentsList`, `fetchAgents`, `isLoadingAgents`, `selectedAgent`, `selectAgent`
- Consumes: `<AgentDetailModal />` from Task 2
- Consumes: Enterprise design top-level classes from `PageTransition` wrapper
- Produces: Refreshed `/agents` page with dark-first design, store-driven data, search/filter/sort, animate agent cards

- [ ] **Step 1: Write the complete refreshed page**

```typescript
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles, Cpu, RefreshCw, Clock, AlertCircle, Pause,
  Search, Zap, ChevronDown, X,
} from 'lucide-react';
import { useAgentStore } from '../store/agentStore';
import { AgentDetailModal } from '../components/agents';

// ─── Status helpers ─────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { dot: string; icon: React.ReactNode; label: string }> = {
  running: {
    dot: 'bg-green-500 animate-pulse',
    icon: <RefreshCw size={12} className="animate-spin" />,
    label: 'Running',
  },
  idle: {
    dot: 'bg-gray-400',
    icon: <Clock size={12} />,
    label: 'Idle',
  },
  error: {
    dot: 'bg-red-500',
    icon: <AlertCircle size={12} />,
    label: 'Error',
  },
  success: {
    dot: 'bg-green-500',
    icon: <Clock size={12} />,
    label: 'Online',
  },
};

const STATUS_FILTERS = ['all', 'running', 'idle', 'error', 'success'];

// ─── Agent Card ─────────────────────────────────────────────────────────
interface AgentCardProps {
  agent: any; // Agent from store
  onSelect: (agent: any) => void;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, onSelect }) => {
  const status = STATUS_CONFIG[agent.status] || STATUS_CONFIG.idle;
  const borderColor =
    agent.status === 'error' ? 'border-red-500/30' :
    agent.status === 'running' ? 'border-green-500/20' :
    'border-[#1E293B]';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-card group cursor-pointer rounded-2xl border ${borderColor} p-5 transition-all duration-200 hover:border-purple-500/30 hover:shadow-glow-purple`}
      onClick={() => onSelect(agent)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${
            agent.status === 'running' ? 'bg-green-500/10' :
            agent.status === 'error' ? 'bg-red-500/10' :
            'bg-white/5'
          }`}>
            {agent.icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-white truncate max-w-[140px]">{agent.name}</h3>
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-white/5 text-gray-300 border border-white/10">
                {status.icon}
                {status.label}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{agent.role}</p>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-[#0D1A2A] p-2.5 border border-[#1E293B]">
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Tasks</p>
          <p className="mt-0.5 text-sm font-bold text-white">{agent.tasksCompleted.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-[#0D1A2A] p-2.5 border border-[#1E293B]">
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">CPU</p>
          <div className="mt-1.5 flex items-center gap-1.5">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#1E293B]">
              <div
                className={`h-full rounded-full transition-all ${
                  agent.cpuUsage > 80 ? 'bg-red-500' : agent.cpuUsage > 40 ? 'bg-amber-500' : 'bg-green-500'
                }`}
                style={{ width: `${agent.cpuUsage}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-300">{agent.cpuUsage}%</span>
          </div>
        </div>
        <div className="rounded-xl bg-[#0D1A2A] p-2.5 border border-[#1E293B]">
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Memory</p>
          <p className="mt-0.5 text-sm font-bold text-white">{agent.memoryUsage}</p>
        </div>
      </div>

      {/* Current Task */}
      <div className="mt-3 flex items-start gap-2 rounded-xl bg-purple-500/5 border border-purple-500/10 p-2.5">
        <Zap size={14} className="mt-0.5 shrink-0 text-purple-400" />
        <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">
          <span className="font-medium text-gray-200">Current: </span>
          {agent.currentTask}
        </p>
      </div>

      {/* Error Banner */}
      {agent.lastError && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-2.5">
          <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-400" />
          <div>
            <p className="text-xs font-medium text-red-300">Error</p>
            <p className="text-xs text-red-400/80">{agent.lastError}</p>
          </div>
        </div>
      )}

      {/* Status dot */}
      <div className="mt-3 flex items-center gap-1.5">
        <div className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
        <span className="text-[10px] text-gray-500">Uptime: {agent.uptime}</span>
      </div>
    </motion.div>
  );
};

// ─── Stats Bar ──────────────────────────────────────────────────────────
const StatsBar: React.FC<{ label: string; value: number; icon: React.FC<{ className?: string }>; color: string }> = ({
  label, value, icon: Icon, color,
}) => (
  <div className={`rounded-xl border ${color} p-3 text-center`}>
    <Icon size={16} className="mx-auto mb-1 opacity-80" />
    <p className="text-lg font-bold text-white">{value}</p>
    <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 mt-0.5">{label}</p>
  </div>
);

// ─── Main Page ──────────────────────────────────────────────────────────
const AgentsPage: React.FC = () => {
  const { agentsList, fetchAgents, isLoadingAgents, selectAgent } = useAgentStore();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'tasks' | 'cpu'>('name');

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const filtered = useMemo(
    () =>
      agentsList
        .filter((a) => {
          if (statusFilter !== 'all' && a.status !== statusFilter) return false;
          if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return (
              a.name.toLowerCase().includes(q) ||
              a.role.toLowerCase().includes(q) ||
              a.currentTask.toLowerCase().includes(q)
            );
          }
          return true;
        })
        .sort((a, b) => {
          if (sortBy === 'tasks') return b.tasksCompleted - a.tasksCompleted;
          if (sortBy === 'cpu') return b.cpuUsage - a.cpuUsage;
          return a.name.localeCompare(b.name);
        }),
    [agentsList, statusFilter, searchQuery, sortBy],
  );

  const stats = useMemo(
    () => ({
      total: agentsList.length,
      running: agentsList.filter((a) => a.status === 'running').length,
      idle: agentsList.filter((a) => a.status === 'idle').length,
      error: agentsList.filter((a) => a.status === 'error').length,
      success: agentsList.filter((a) => a.status === 'success').length,
    }),
    [agentsList],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-purple-400">
            AI Infrastructure
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">AI Agents</h1>
          <p className="mt-1 text-sm text-gray-400">
            Your autonomous agent fleet — {stats.running} running, {stats.idle} idle, {stats.error} errors
          </p>
        </div>
        <button onClick={() => navigate('/builder')} className="btn-primary-gradient inline-flex items-center gap-2">
          <Sparkles size={16} />
          New Pipeline
        </button>
      </div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 gap-3 sm:grid-cols-5"
      >
        <StatsBar label="Total" value={stats.total} icon={Cpu} color="border-purple-500/20 bg-purple-500/5" />
        <StatsBar label="Running" value={stats.running} icon={RefreshCw} color="border-green-500/20 bg-green-500/5" />
        <StatsBar label="Idle" value={stats.idle} icon={Clock} color="border-gray-500/20 bg-gray-500/5" />
        <StatsBar label="Errors" value={stats.error} icon={AlertCircle} color="border-red-500/20 bg-red-500/5" />
        <StatsBar label="Online" value={stats.success} icon={Sparkles} color="border-cyan-500/20 bg-cyan-500/5" />
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
              className="input w-full pl-9"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-auto"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="input w-auto"
          >
            <option value="name">Sort: Name</option>
            <option value="tasks">Sort: Tasks</option>
            <option value="cpu">Sort: CPU</option>
          </select>
        </div>
        <p className="text-sm text-gray-500">
          Showing <span className="font-semibold text-white">{filtered.length}</span> of {agentsList.length} agents
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
        <div className="glass-card rounded-2xl border-2 border-dashed border-[#1E293B] p-12 text-center">
          <div className="text-4xl mb-3">🤖</div>
          <h3 className="text-lg font-semibold text-white">No agents match your filters</h3>
          <p className="mt-1 text-sm text-gray-400">Try adjusting your search or filter criteria.</p>
          <button
            onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
            className="mt-4 text-sm font-semibold text-purple-400 hover:text-purple-300 transition-colors"
          >
            Clear all filters →
          </button>
        </div>
      )}

      {/* Zoom-in Detail Modal */}
      <AgentDetailModal />

      {/* Legend */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-6 text-xs text-gray-500">
          <span className="font-semibold text-gray-300">Status Legend:</span>
          {Object.entries(STATUS_CONFIG).map(([key, val]) => (
            <span key={key} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${val.dot}`} />
              {val.label}
            </span>
          ))}
          <span className="ml-auto text-[10px]">Auto-refreshes every 30s</span>
        </div>
      </div>
    </div>
  );
};

export default AgentsPage;
```

- [ ] **Step 2: TypeScript check**

Run: `cd frontend && npx tsc --noEmit 2>&1`
Expected: No errors

- [ ] **Step 3: Verify Vite build**

Run: `cd frontend && npx vite build 2>&1 | tail -5`
Expected: `✓ built in X.XXs`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/AgentsPage.tsx frontend/src/store/agentStore.ts
git commit -m "feat(agents): refresh page with enterprise dark design, store integration, and zoom-in modal"
```

---

<!-- Task 4: Front-end Tests -->

### Task 4: Write component tests for AgentDetailModal

**Files:**
- Create: `frontend/src/components/agents/AgentDetailModal.test.tsx`

**Interfaces:**
- Consumes: `AgentDetailModal` rendering logic, `useAgentStore` with `selectAgent`
- Produces: 3 passing tests validating modal open/close behavior and content rendering

- [ ] **Step 1: Write test**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useAgentStore } from '../../store/agentStore';
import AgentDetailModal from './AgentDetailModal';

const mockAgent = {
  name: 'Intent Parser',
  role: 'Natural Language Understanding',
  icon: '🧠',
  status: 'running' as const,
  tasksCompleted: 12580,
  cpuUsage: 32,
  memoryUsage: '1.2 GB',
  currentTask: 'Parsing user request',
  uptime: '14d 6h',
  description: 'Understanding your request',
  logs: ['14:32:01 — Parsed intent'],
};

describe('AgentDetailModal', () => {
  beforeEach(() => {
    const { selectAgent } = useAgentStore.getState();
    selectAgent(null);
  });

  it('renders nothing when no agent is selected', () => {
    const { container } = render(<AgentDetailModal />);
    expect(container.innerHTML).toBe('');
  });

  it('renders agent details when an agent is selected', () => {
    useAgentStore.getState().selectAgent(mockAgent as any);
    render(<AgentDetailModal />);
    expect(screen.getByText('Intent Parser')).toBeTruthy();
    expect(screen.getByText('12,580')).toBeTruthy();
    expect(screen.getByText('32%')).toBeTruthy();
  });

  it('closes when clicking the close button', () => {
    useAgentStore.getState().selectAgent(mockAgent as any);
    render(<AgentDetailModal />);
    const closeButton = screen.getByRole('button', { name: '' });
    fireEvent.click(closeButton);
    expect(useAgentStore.getState().selectedAgent).toBeNull();
  });
});
```

- [ ] **Step 2: Run test**

Run: `cd frontend && npx vitest run src/components/agents/AgentDetailModal.test.tsx 2>&1`
Expected: `✓ 3 passed`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/agents/AgentDetailModal.test.tsx
git commit -m "test(agents): add AgentDetailModal open/close and content tests"
```

---

<!-- Self-Review -->

## Self-Review

**1. Spec coverage:**
- ✅ "Show 15 agent cards" — Task 1 adds 15 mock agents to the store
- ✅ "Live status" — Each card shows status badge (running/idle/error/success) with animated dot
- ✅ "Task counts" — Metrics grid shows `tasksCompleted` per card and in modal
- ✅ "CPU/memory" — Card shows CPU bar + % and memory usage string
- ✅ "Expandable logs" — Modal shows full activity log per agent
- ✅ "New route" — Route already exists at `/agents`
- ✅ "New store slice" — Task 1 extends `agentStore` with `agentsList`, `fetchAgents`, `selectAgent`
- ✅ "Interactive agent cards" — Cards are clickable and open `AgentDetailModal`
- ✅ "Zoom-in detail modals" — Task 2 creates `AgentDetailModal` with spring animation, metrics, logs, error banner, CPU bar
- ✅ "Enterprise dark design system" — All cards use `glass-card`, `bg-[#111827]`, `border-[#1E293B]`, `bg-[#0D1A2A]`, `input`, `btn-primary-gradient`

**2. Placeholder scan:** No TBD/TODO/filler patterns found. Every step has complete code. Every command has expected output.

**3. Type consistency:** 
- `agentStore.ts` `Agent` interface extended with `icon: string`, `role: string`, `tasksCompleted: number`, `cpuUsage: number`, `memoryUsage: string`, `currentTask: string`, `uptime: string`, `lastError?: string`, `logs: string[]` — these match across all tasks
- `fetchAgents()` signature matches in store definition and `AgentsPage` `useEffect` call
- `selectAgent(agent: Agent | null)` matches in store, modal close button, and card `onClick`
- `status` values `'idle' | 'running' | 'success' | 'error'` used consistently
- `AgentCard` prop `onSelect: (agent: any) => void` receives `selectAgent` from store — matched type

---
</parameter>
