# Audit Logs Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the existing Audit Logs page with the enterprise dark design system, add pagination, functional CSV export, a date range picker, and an Audit Logs nav link in the header.

**Architecture:** The page already exists at `frontend/src/pages/AuditLogsPage.tsx` with light-first CSS, inline mock data, expandable rows, basic search/action-filter, and a non-functional export button. The plan converts all classes to the dark-first design system, centralizes mock data into an `auditStore`, adds proper pagination (following `PipelinesPage`'s pattern), implements CSV export as a client-side blob download, adds a date-range filter using native `<input type="date">` paired inputs, pulls stats from the filtered data, and adds an `/audit-logs` nav item to `Header.tsx`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Framer Motion, Zustand, Lucide React, date-fns

## Global Constraints

- All modified components use the enterprise dark-first design system: backgrounds `bg-[#111827]`, borders `border-[#1E293B]`, cards `glass-card`, buttons `btn-primary-gradient`/`btn-secondary`, badges `badge-success`/`badge-error`/`badge-info`/`badge-cyan`/`badge-warning`
- No new npm dependencies — all icons from `lucide-react`, animations from `framer-motion`, date formatting from `date-fns` (already installed)
- `App.tsx` route at `/audit-logs` already exists — do not modify it
- `Header.tsx` `navItems` array must get a new entry for Audit Logs with the `ScrollText` icon
- The `auditStore` provides mock data, filtering, sorting, and export actions — no backend API calls
- Page size for pagination is 10 entries per page
- The date range picker uses two native `<input type="date">` elements styled with the `input` class, not an external date picker library

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `frontend/src/store/auditStore.ts` | **Create** | Zustand store with 50 mock audit entries, `AuditEntry` type, `ActionType` type, filtering/sorting/pagination logic, `exportCsv()` action |
| `frontend/src/pages/AuditLogsPage.tsx` | **Modify** | Replace entire file — dark-first design, store-driven data, pagination, date range picker, expandable rows, stats bar, retention info bar |
| `frontend/src/components/common/Header.tsx` | **Modify** | Add `/audit-logs` entry to `navItems` with `ScrollText` icon |
| `frontend/src/components/common/Header.tsx` | **No change** | Nav already follows the dark design system — only the new nav item is added |
| `frontend/src/App.tsx` | **No change** | Route at `/audit-logs` already exists |

---

### Task 1: Create auditStore with mock data, filtering, pagination, and export

**Files:**
- Create: `frontend/src/store/auditStore.ts`

**Interfaces:**
- Consumes: nothing (standalone store)
- Produces: `useAuditStore` with `entries`, `filteredEntries`, `stats`, `searchQuery`, `actionFilter`, `dateRange`, `timeSort`, `currentPage`, `pageCount`, `setSearch`, `setActionFilter`, `setDateRange`, `setTimeSort`, `setPage`, `exportCsv`

- [ ] **Step 1: Define TypeScript types and 50 mock audit entries**

```typescript
import { create } from 'zustand';
import { subDays, format } from 'date-fns';

export type ActionType = 'all' | 'login' | 'create' | 'update' | 'delete' | 'run' | 'approve';

export interface AuditEntry {
  id: number;
  user: string;
  userRole: string;
  action: string;
  actionType: Exclude<ActionType, 'all'>;
  resource: string;
  details: string;
  ip: string;
  timestamp: string;
  status: 'success' | 'failure' | 'pending';
}

// ─── Generate 50 mock entries ─────────────────────────────────────────
const USERS = [
  { name: 'Bharath K.', role: 'Admin' },
  { name: 'Femi F.', role: 'Engineer' },
  { name: 'Sarah L.', role: 'Engineer' },
  { name: 'Mike R.', role: 'Admin' },
  { name: 'AIDEN Auto', role: 'System' },
  { name: 'Priya M.', role: 'Analyst' },
  { name: 'James W.', role: 'Engineer' },
];

const ACTIONS: { action: string; type: Exclude<ActionType, 'all'>; detailsTemplate: string }[] = [
  { action: 'Login', type: 'login', detailsTemplate: 'Login from {browser}' },
  { action: 'Create Pipeline', type: 'create', detailsTemplate: 'Created pipeline from prompt: "{resource}"' },
  { action: 'Update Pipeline', type: 'update', detailsTemplate: 'Modified schedule/config for {resource}' },
  { action: 'Delete Pipeline', type: 'delete', detailsTemplate: 'Deleted pipeline: {resource} (reason: deprecation)' },
  { action: 'Run Pipeline', type: 'run', detailsTemplate: 'Triggered execution of {resource}' },
  { action: 'Approve Action', type: 'approve', detailsTemplate: 'Approved {resource} (threshold review)' },
  { action: 'Reject Action', type: 'approve', detailsTemplate: 'Rejected {resource} (reason: policy violation)' },
  { action: 'Self-Heal', type: 'run', detailsTemplate: 'Auto-recovery: restarted {resource} with exponential backoff' },
  { action: 'Update Settings', type: 'update', detailsTemplate: 'Changed alert threshold for {resource}' },
  { action: 'Export Report', type: 'create', detailsTemplate: 'Exported analytics report for {resource}' },
];

const BROWSERS = ['Chrome 126, Windows', 'Firefox 128, macOS', 'Safari 17, iOS', 'Edge 125, Windows', 'Chrome 125, Linux'];
const RESOURCES = [
  'Daily Sales ETL', 'Customer Analytics', 'IoT Stream Pipeline', 'Product Inventory',
  'Marketing Attribution', 'AIDEN Platform', 'Alert Configuration', 'Schema Update #2',
  'API Key Rotation #5', 'Data Quality Check',
];
const IPS = ['192.168.1.100', '192.168.1.101', '192.168.1.102', '192.168.1.103', '192.168.1.104', '10.0.0.1', '10.0.0.2', '172.16.0.1'];

function generateMockEntries(count: number): AuditEntry[] {
  const entries: AuditEntry[] = [];
  for (let i = 1; i <= count; i++) {
    const user = USERS[Math.floor(Math.random() * USERS.length)];
    const actionDef = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
    const resource = RESOURCES[Math.floor(Math.random() * RESOURCES.length)];
    const browser = BROWSERS[Math.floor(Math.random() * BROWSERS.length)];
    const ip = IPS[Math.floor(Math.random() * IPS.length)];
    const daysAgo = Math.floor(Math.random() * 30);
    const hoursAgo = Math.floor(Math.random() * 24);
    const minutesAgo = Math.floor(Math.random() * 60);
    const date = subDays(new Date(), daysAgo);
    date.setHours(date.getHours() - hoursAgo);
    date.setMinutes(date.getMinutes() - minutesAgo);
    const statuses: AuditEntry['status'][] = ['success', 'success', 'success', 'success', 'failure', 'pending'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    entries.push({
      id: i,
      user: user.name,
      userRole: user.role,
      action: actionDef.action,
      actionType: actionDef.type,
      resource,
      details: actionDef.detailsTemplate.replace('{resource}', resource).replace('{browser}', browser),
      ip,
      timestamp: format(date, 'yyyy-MM-dd HH:mm:ss'),
      status,
    });
  }
  return entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

const MOCK_ENTRIES = generateMockEntries(50);

// ─── Action badge config ──────────────────────────────────────────────
export const ACTION_CONFIG: Record<string, { badge: string; label: string }> = {
  login:   { badge: 'badge-info', label: 'Login' },
  create:  { badge: 'badge-success', label: 'Create' },
  update:  { badge: 'badge-warning', label: 'Update' },
  delete:  { badge: 'badge-error', label: 'Delete' },
  run:     { badge: 'badge-info', label: 'Run' },
  approve: { badge: 'badge-cyan', label: 'Approve' },
};

export const STATUS_CONFIG: Record<string, { dot: string; label: string }> = {
  success: { dot: 'bg-green-500', label: 'Success' },
  failure: { dot: 'bg-red-500', label: 'Failure' },
  pending: { dot: 'bg-yellow-500', label: 'Pending' },
};
```

- [ ] **Step 2: Implement the store with filtering, pagination, and export**

```typescript
interface AuditFilterState {
  searchQuery: string;
  actionFilter: ActionType;
  dateFrom: string;
  dateTo: string;
  timeSort: 'newest' | 'oldest';
  currentPage: number;
}

const PAGE_SIZE = 10;

function filterEntries(entries: AuditEntry[], state: AuditFilterState): AuditEntry[] {
  let result = [...entries];

  // Action filter
  if (state.actionFilter !== 'all') {
    result = result.filter((e) => e.actionType === state.actionFilter);
  }

  // Search
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    result = result.filter(
      (e) =>
        e.user.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q) ||
        e.resource.toLowerCase().includes(q) ||
        e.details.toLowerCase().includes(q) ||
        e.ip.includes(q)
    );
  }

  // Date range
  if (state.dateFrom) {
    result = result.filter((e) => e.timestamp >= state.dateFrom);
  }
  if (state.dateTo) {
    result = result.filter((e) => e.timestamp <= state.dateTo + ' 23:59:59');
  }

  // Sort
  result.sort((a, b) =>
    state.timeSort === 'newest'
      ? b.timestamp.localeCompare(a.timestamp)
      : a.timestamp.localeCompare(b.timestamp)
  );

  return result;
}

function computeStats(entries: AuditEntry[]) {
  return {
    total: entries.length,
    creates: entries.filter((e) => e.actionType === 'create').length,
    failures: entries.filter((e) => e.status === 'failure').length,
    autoActions: entries.filter((e) => e.user === 'AIDEN Auto').length,
  };
}

interface AuditStore extends AuditFilterState {
  entries: AuditEntry[];

  // Computed
  filteredEntries: AuditEntry[];
  stats: { total: number; creates: number; failures: number; autoActions: number };
  pageCount: number;

  // Actions
  setSearchQuery: (q: string) => void;
  setActionFilter: (f: ActionType) => void;
  setDateFrom: (d: string) => void;
  setDateTo: (d: string) => void;
  setTimeSort: (s: 'newest' | 'oldest') => void;
  setPage: (p: number) => void;
  exportCsv: () => void;
}

export const useAuditStore = create<AuditStore>((set, get) => ({
  entries: MOCK_ENTRIES,
  searchQuery: '',
  actionFilter: 'all',
  dateFrom: '',
  dateTo: '',
  timeSort: 'newest',
  currentPage: 1,

  // Computed via getter pattern — recalculated on every state change via explicit set
  filteredEntries: MOCK_ENTRIES,
  stats: computeStats(MOCK_ENTRIES),
  pageCount: Math.ceil(MOCK_ENTRIES.length / PAGE_SIZE),

  setSearchQuery: (searchQuery) => {
    set((s) => {
      const partial = { ...s, searchQuery, currentPage: 1 };
      const filteredEntries = filterEntries(s.entries, partial);
      return {
        ...partial,
        filteredEntries,
        stats: computeStats(filteredEntries),
        pageCount: Math.ceil(filteredEntries.length / PAGE_SIZE),
      };
    });
  },

  setActionFilter: (actionFilter) => {
    set((s) => {
      const partial = { ...s, actionFilter, currentPage: 1 };
      const filteredEntries = filterEntries(s.entries, partial);
      return {
        ...partial,
        filteredEntries,
        stats: computeStats(filteredEntries),
        pageCount: Math.ceil(filteredEntries.length / PAGE_SIZE),
      };
    });
  },

  setDateFrom: (dateFrom) => {
    set((s) => {
      const partial = { ...s, dateFrom, currentPage: 1 };
      const filteredEntries = filterEntries(s.entries, partial);
      return {
        ...partial,
        filteredEntries,
        stats: computeStats(filteredEntries),
        pageCount: Math.ceil(filteredEntries.length / PAGE_SIZE),
      };
    });
  },

  setDateTo: (dateTo) => {
    set((s) => {
      const partial = { ...s, dateTo, currentPage: 1 };
      const filteredEntries = filterEntries(s.entries, partial);
      return {
        ...partial,
        filteredEntries,
        stats: computeStats(filteredEntries),
        pageCount: Math.ceil(filteredEntries.length / PAGE_SIZE),
      };
    });
  },

  setTimeSort: (timeSort) => {
    set((s) => {
      const partial = { ...s, timeSort };
      const filteredEntries = filterEntries(s.entries, partial);
      return {
        ...partial,
        filteredEntries,
      };
    });
  },

  setPage: (currentPage) => set({ currentPage }),

  exportCsv: () => {
    const { entries, searchQuery, actionFilter, dateFrom, dateTo, timeSort } = get();
    const partial = { searchQuery, actionFilter, dateFrom, dateTo, timeSort, currentPage: 1 };
    const filtered = filterEntries(entries, partial);

    const headers = 'ID,User,Role,Action,Resource,Details,IP,Timestamp,Status\n';
    const rows = filtered
      .map((e) =>
        [
          e.id,
          `"${e.user}"`,
          `"${e.userRole}"`,
          `"${e.action}"`,
          `"${e.resource}"`,
          `"${e.details.replace(/"/g, '""')}"`,
          e.ip,
          e.timestamp,
          e.status,
        ].join(',')
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aiden-audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
}));
```

- [ ] **Step 3: Verify store compiles**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors (or only errors from Task 2, expected since page hasn't been updated)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/store/auditStore.ts
git commit -m "feat(audit): create auditStore with 50 mock entries, filtering, pagination, and CSV export"
```

---

### Task 2: Add Audit Logs nav link to Header

**Files:**
- Modify: `frontend/src/components/common/Header.tsx`

- [ ] **Step 1: Add `ScrollText` icon to the import and add `/audit-logs` nav item**

Add `ScrollText` to the lucide-react import:
```typescript
import { 
  User, Settings, LogOut, Command, Cpu,
  Bell, Menu, X, GitBranch, Monitor, 
  Activity, BarChart4, ShieldCheck, LayoutDashboard, ScrollText
} from 'lucide-react';
```

Add nav item between `/approvals` and the end of the array:
```typescript
const navItems = [
  { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
  { to: '/pipelines', label: 'Pipelines', icon: <GitBranch size={16} /> },
  { to: '/builder', label: 'Builder', icon: <Monitor size={16} /> },
  { to: '/agents', label: 'Agents', icon: <Cpu size={16} /> },
  { to: '/monitoring', label: 'Monitoring', icon: <Activity size={16} /> },
  { to: '/analytics', label: 'Analytics', icon: <BarChart4 size={16} /> },
  { to: '/approvals', label: 'Approvals', icon: <ShieldCheck size={16} /> },
  { to: '/audit-logs', label: 'Audit Logs', icon: <ScrollText size={16} /> },  // NEW
];
```

- [ ] **Step 2: TypeScript check**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/common/Header.tsx
git commit -m "feat(audit): add Audit Logs nav item to header with ScrollText icon"
```

---

### Task 3: Refresh AuditLogsPage with dark design, pagination, date range, and export

**Files:**
- Modify: `frontend/src/pages/AuditLogsPage.tsx` (replace entire file)

**Interfaces:**
- Consumes: `useAuditStore` with all state and actions from Task 1
- Consumes: `ACTION_CONFIG` and `STATUS_CONFIG` from the store
- Consumes: Enterprise dark design classes
- Produces: Full audit logs page with all requested features

- [ ] **Step 1: Write the complete refreshed page**

```typescript
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Download, ChevronDown, Globe, Clock, ArrowUpDown,
  ScrollText, Calendar, X, Filter,
} from 'lucide-react';
import { useAuditStore, ACTION_CONFIG, STATUS_CONFIG } from '../store/auditStore';
import type { ActionType } from '../store/auditStore';

const ACTION_FILTERS: ActionType[] = ['all', 'login', 'create', 'update', 'delete', 'run', 'approve'];

const AuditLogsPage: React.FC = () => {
  const {
    filteredEntries, stats, searchQuery, actionFilter, dateFrom, dateTo,
    timeSort, currentPage, pageCount,
    setSearchQuery, setActionFilter, setDateFrom, setDateTo, setTimeSort,
    setPage, exportCsv,
  } = useAuditStore();

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const paginated = filteredEntries.slice(
    (currentPage - 1) * 10,
    currentPage * 10
  );

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  const getInitialsBg = (user: string) => {
    if (user === 'AIDEN Auto') return 'bg-purple-500/20 text-purple-300';
    return 'bg-purple-500/20 text-purple-300';
  };

  const hasActiveFilters = searchQuery || actionFilter !== 'all' || dateFrom || dateTo;

  const clearFilters = () => {
    setSearchQuery('');
    setActionFilter('all');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const statusDotColors: Record<string, string> = {
    success: 'bg-green-500',
    failure: 'bg-red-500',
    pending: 'bg-yellow-500',
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-purple-400">Compliance & Governance</p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">Audit Logs</h1>
          <p className="mt-1 text-sm text-gray-400">
            Complete audit trail of all user and system actions.
          </p>
        </div>

        <button
          onClick={exportCsv}
          className="btn-secondary inline-flex items-center gap-2"
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* STATS BAR */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {[
          { label: 'Total Events', value: stats.total, icon: ScrollText, color: 'border-purple-500/20 bg-purple-500/5 text-purple-400' },
          { label: 'Creates', value: stats.creates, icon: Calendar, color: 'border-green-500/20 bg-green-500/5 text-green-400' },
          { label: 'Failures', value: stats.failures, icon: X, color: 'border-red-500/20 bg-red-500/5 text-red-400' },
          { label: 'Auto Actions', value: stats.autoActions, icon: Clock, color: 'border-cyan-500/20 bg-cyan-500/5 text-cyan-400' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className={`rounded-xl border ${s.color} p-3 text-center transition-all hover:-translate-y-0.5`}
            >
              <Icon size={16} className="mx-auto mb-1 opacity-80" />
              <p className="text-lg font-bold text-white">{s.value}</p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 mt-0.5">{s.label}</p>
            </div>
          );
        })}
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* FILTERS */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col gap-3">
        {/* Top row: search + action filter + sort + date toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search logs..."
              className="input w-full pl-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Action filter */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value as ActionType)}
            className="input w-auto min-w-[130px]"
          >
            {ACTION_FILTERS.map((f) => (
              <option key={f} value={f}>
                {f === 'all' ? 'All Actions' : f.charAt(0).toUpperCase() + f.slice(1)}
              </option>
            ))}
          </select>

          {/* Sort toggle */}
          <button
            onClick={() => setTimeSort(timeSort === 'newest' ? 'oldest' : 'newest')}
            className="btn-secondary inline-flex items-center gap-1.5 px-3 py-2.5 text-sm"
          >
            <ArrowUpDown size={14} />
            <span className="hidden sm:inline">{timeSort === 'newest' ? 'Newest' : 'Oldest'}</span>
          </button>

          {/* Date range toggle */}
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className={`btn-secondary inline-flex items-center gap-1.5 px-3 py-2.5 text-sm ${
              showDatePicker || dateFrom ? 'border-purple-500/30' : ''
            }`}
          >
            <Calendar size={14} />
            <span className="hidden sm:inline">Date Range</span>
          </button>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors"
            >
              <Filter size={14} />
              Clear
            </button>
          )}
        </div>

        {/* Date range picker */}
        {showDatePicker && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-[#1E293B] bg-[#111827] p-3"
          >
            <span className="text-xs font-medium text-gray-400">From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input w-auto"
            />
            <span className="text-xs text-gray-500">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input w-auto"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
              >
                Clear dates
              </button>
            )}
          </motion.div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TABLE */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-[#1E293B]">
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">User</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Action</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Resource</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 hidden md:table-cell">IP Address</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Timestamp</th>
                <th className="px-5 py-3.5 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]/50">
              {paginated.map((entry) => {
                const actionCfg = ACTION_CONFIG[entry.actionType] || ACTION_CONFIG.login;
                const statusCfg = STATUS_CONFIG[entry.status] || STATUS_CONFIG.success;
                return (
                  <React.Fragment key={entry.id}>
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="transition-colors hover:bg-white/[0.02] cursor-pointer"
                      onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${getInitialsBg(entry.user)}`}>
                            {getInitials(entry.user)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{entry.user}</p>
                            <p className="text-[10px] text-gray-500">{entry.userRole}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`badge ${actionCfg.badge}`}>{entry.action}</span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-300">{entry.resource}</td>
                      <td className="px-5 py-4 text-xs text-gray-500 hidden md:table-cell font-mono">{entry.ip}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
                          <span className="text-xs text-gray-400">{statusCfg.label}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-400 whitespace-nowrap font-mono">{entry.timestamp}</td>
                      <td className="px-5 py-4">
                        <ChevronDown
                          size={14}
                          className={`text-gray-500 transition-transform duration-200 ${
                            expandedId === entry.id ? 'rotate-180' : ''
                          }`}
                        />
                      </td>
                    </motion.tr>

                    {/* Expandable details row */}
                    {expandedId === entry.id && (
                      <motion.tr
                        key={`${entry.id}-details`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <td colSpan={7} className="px-5 py-4 bg-white/[0.02] border-b border-[#1E293B]/50">
                          <div className="flex items-start gap-3 pl-12">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
                              <Clock size={14} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">Action Details</p>
                              <p className="mt-0.5 text-sm text-gray-400 leading-relaxed">{entry.details}</p>
                            </div>
                          </div>
                        </td>
                      </motion.tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {filteredEntries.length === 0 && (
          <div className="p-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1E293B] text-3xl mb-4">
              🔍
            </div>
            <h3 className="text-lg font-semibold text-white">No log entries found</h3>
            <p className="mt-1 text-sm text-gray-400">
              {hasActiveFilters ? 'Try adjusting your search or filters.' : 'No audit events have been recorded yet.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-4 text-sm font-semibold text-purple-400 hover:text-purple-300 transition-colors"
              >
                Clear all filters →
              </button>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* PAGINATION */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-[#1E293B] bg-[#111827] px-4 py-3 shadow-sm">
          <p className="text-xs text-gray-500">
            Showing {(currentPage - 1) * 10 + 1}–
            {Math.min(currentPage * 10, filteredEntries.length)} of {filteredEntries.length} events
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-all hover:bg-white/5 disabled:opacity-40"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {Array.from({ length: Math.min(pageCount, 7) }, (_, i) => {
              // Smart page range: show pages around current
              let pageNum: number;
              if (pageCount <= 7) {
                pageNum = i + 1;
              } else if (currentPage <= 4) {
                pageNum = i + 1;
              } else if (currentPage >= pageCount - 3) {
                pageNum = pageCount - 6 + i;
              } else {
                pageNum = currentPage - 3 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-all ${
                    currentPage === pageNum
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setPage(Math.min(pageCount, currentPage + 1))}
              disabled={currentPage === pageCount}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-all hover:bg-white/5 disabled:opacity-40"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* INFO BAR */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-3 rounded-xl border border-[#1E293B] bg-[#111827] p-4 text-sm">
        <Globe size={16} className="text-purple-400 shrink-0" />
        <p className="text-gray-400">
          <span className="font-semibold text-gray-200">Retention policy:</span> Audit logs are retained for 90 days.{' '}
          Export logs for long-term archival. Last exported: 2 days ago.
        </p>
      </div>
    </motion.div>
  );
};

export default AuditLogsPage;
```

- [ ] **Step 2: TypeScript check**

Run: `cd frontend && npx tsc --noEmit 2>&1`
Expected: No errors

- [ ] **Step 3: Verify Vite build**

Run: `cd frontend && npx vite build 2>&1 | tail -10`
Expected: `✓ built in X.XXs`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/AuditLogsPage.tsx frontend/src/store/auditStore.ts frontend/src/components/common/Header.tsx
git commit -m "feat(audit): refresh page with dark design, pagination, date range picker, and CSV export"
```

---

## Self-Review

**1. Spec coverage:**
- ✅ "Searchable" — Search input with real-time filtering across user, action, resource, details, and IP
- ✅ "Filterable" — Action type select dropdown (login/create/update/delete/run/approve) + date range picker
- ✅ "User/action/timestamp/IP columns" — All present in the table with user avatar initials, action badges, font-mono IP display
- ✅ "Date range picker" — Toggle-able date picker with from/to `<input type="date">` paired inputs, clear button
- ✅ "Export to CSV" — `exportCsv()` function generates a proper CSV with headers and quote-escaped fields, triggers browser download
- ✅ "Pagination" — Smart pagination with windowed page numbers (showing 7 at a time around current page), prev/next buttons, disabled states, "Showing X–Y of Z" text
- ✅ "Enterprise dark design system" — All classes use `bg-[#111827]`, `border-[#1E293B]`, `glass-card`, `input`, `btn-secondary`, `badge-*`, `text-gray-400`/`text-white`

**2. Placeholder scan:** No TBD/TODO/filler patterns found. Every step has complete code. Every command has expected output.

**3. Type consistency:**
- `ActionType` (`'all' | 'login' | 'create' | 'update' | 'delete' | 'run' | 'approve'`) consistent between store and page
- `AuditEntry.status` (`'success' | 'failure' | 'pending'`) matches `STATUS_CONFIG` keys
- `ACTION_CONFIG` keys match `actionType` values from `AuditEntry`
- `computeStats()` returns `{ total, creates, failures, autoActions }` matching the stats bar in the page
- `useAuditStore` actions (`setSearchQuery`, `setActionFilter`, `setDateFrom`, `setDateTo`, `setTimeSort`, `setPage`, `exportCsv`) all called correctly in the page
- `currentPage` / `pageCount` / `filteredEntries` types match pagination logic
- `getInitials` handles both single-word and multi-word user names
