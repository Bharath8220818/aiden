# Backend Integration Plan — Frontend (Revised)

> **Date:** 2026-07-22
> **Scope:** Frontend-only. No backend changes.
> **Approach:** Follow spec exactly — rewrite existing files to match spec shapes, even when working code exists.

---

## Context

The codebase has partial implementations that diverge from the spec. The user chose to follow the spec exactly, meaning we rewrite working code to match the target shapes. This plan documents every file change with before/after diffs.

---

## Phase 1 — Type Rewrites (Zero Runtime Impact)

### 1.1 `src/types/analytics.ts`

**Current state:** Has `AnalyticsKPI` with `dataProcessed: string`, `trend` sub-object, `avgSuccessRate`. Uses `CostCategory` (not `CostBreakdown`). Missing `AnalyticsTrend`.

**Action:** Full rewrite to match spec.

```ts
// BEFORE (current)
export interface AnalyticsKPI {
  totalRuns: number; totalPipelines: number; totalCost: number;
  dataProcessed: string; avgSuccessRate: number;
  trend: { runs: number; cost: number; successRate: number; dataVolume: number; };
}

// AFTER (spec)
export interface AnalyticsKPI {
  totalPipelines: number;
  runningPipelines: number;
  failedPipelines: number;
  successRate: number;
  totalRuns?: number;
  totalCost?: number;
  dataProcessed?: number;
}
```

Other changes:
- `CostCategory` → rename to `CostBreakdown`, add `trend: 'neutral'` union member
- Add `AnalyticsTrend` interface
- `PerformancePoint` → keep but rename `runs`/`success`/`failed`/`avgDuration` to `date`/`value`/`baseline?`
- `AiInsight` → no change (already matches)
- `PipelinePerformance` → keep as-is (spec doesn't define this differently)
- `Period` type → keep as-is

### 1.2 `src/types/approval.ts`

**Current state:** Uses `created_by`/`created_by_name`, has `title`, `change`, `resource_type`, `resource_name` fields. Also has separate `ApprovalAction` type.

**Action:** Full rewrite to match spec.

```ts
// BEFORE (current)
export interface Approval {
  id: number; title: string; description: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  risk: 'low' | 'medium' | 'high' | 'critical';
  created_by: number; created_by_name: string;
  change: string; resource_type: string; resource_name: string;
  created_at: string; updated_at?: string;
  reviewed_by?: number; reviewed_by_name?: string;
  review_comment?: string; reviewed_at?: string;
}

// AFTER (spec)
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type ApprovalSeverity = 'critical' | 'high' | 'medium' | 'low';
export type ApprovalAction = 'restart' | 'schema_update' | 'threshold_breach' | 'cost_optimization' | 'key_rotation';

export interface Approval {
  id: number; pipeline_id: number; action: ApprovalAction;
  description: string; severity: ApprovalSeverity; status: ApprovalStatus;
  requested_by: number; requested_by_name: string;
  requested_at: string; details: string; risk_score?: number;
}

export interface ApprovalComment {
  id: number; user_id: number; username: string;
  content: string; created_at: string;
}

export interface ApprovalActionRequest {
  comment?: string;
}
```

### 1.3 `src/types/audit.ts`

**Current state:** Has `user_name`, `resource_type`+`resource_id`, `severity`, `created_at`. Missing `username`, `resource`, `status`, `timestamp`.

**Action:** Full rewrite to match spec.

```ts
// BEFORE (current)
export interface AuditLog {
  id: number; user_id: number; user_name: string;
  action: string; resource_type: string; resource_id: string;
  details: string; severity: 'info' | 'warning' | 'error';
  ip_address?: string; created_at: string;
}

// AFTER (spec)
export type AuditAction = 'login' | 'logout' | 'create' | 'update' | 'delete' | 'run' | 'approve' | 'reject' | 'cancel';
export type AuditStatus = 'success' | 'failure';

export interface AuditLog {
  id: number; user_id: number; username: string;
  action: AuditAction; resource: string; ip_address: string;
  status: AuditStatus; timestamp: string; details: string;
}

export interface AuditFilter {
  search?: string; action?: AuditAction; status?: AuditStatus;
  from_date?: string; to_date?: string;
  limit?: number; offset?: number; sort?: 'newest' | 'oldest';
}

export interface AuditStats {
  total_events: number; creates: number;
  failures: number; auto_actions: number;
}
```

---

## Phase 2 — API Modules (Mock Fallback)

### 2.1 `src/api/analytics.ts` — Full rewrite

**Current state:** Single `getDashboard(period)` function that calls `api.get()`. No mock fallback — throws on backend 404.

**Action:** Full rewrite. Individual fetch functions with mock fallback per the spec.

- `fetchKPIs()` → GET `/api/v1/analytics/kpis`, fallback to `MOCK_KPIS`
- `fetchTrends(period)` → GET `/api/v1/analytics/trends?period=`, fallback to `MOCK_TRENDS`
- `fetchCostBreakdown()` → GET `/api/v1/analytics/costs`, fallback to `MOCK_COSTS`
- `fetchInsights()` → GET `/api/v1/analytics/insights`, fallback to `MOCK_INSIGHTS`
- `fetchPipelineMetrics(id)` → GET `/api/v1/analytics/pipelines/:id`, fallback to `MOCK_PIPELINES`
- `exportReport(format, period)` → GET `/api/v1/analytics/export`, fallback to CSV blob

**Breaking change:** The existing `analyticsStore.ts` calls `analyticsApi.getDashboard()`. This function will no longer exist. The store must be rewritten (Phase 3).

### 2.2 `src/api/approvals.ts` — New file

**Does not exist yet.** `src/api/index.ts:40` already has `export { approvalsApi } from './approvals'` — this will fail at build time until this file exists.

- `fetchAll(status?)` → GET `/api/v1/approvals`, fallback to `MOCK_APPROVALS`
- `fetchById(id)` → GET `/api/v1/approvals/:id`
- `approve(id, comment?)` → POST `/api/v1/approvals/:id/approve`
- `reject(id, comment?)` → POST `/api/v1/approvals/:id/reject`

### 2.3 `src/api/audit.ts` — New file

**Does not exist yet.** `src/api/index.ts:41` already has `export { auditApi } from './audit'` — this will fail at build time.

- `fetchLogs(filters)` → GET `/api/v1/audit`, fallback to `MOCK_LOGS` with client-side filtering
- `exportCSV(filters)` → GET `/api/v1/audit/export`, fallback to CSV blob

### 2.4 `src/api/index.ts` — No changes needed

Already has correct barrel exports at lines 37-41. Once the new API files exist, these will resolve.

---

## Phase 3 — Store + Page Rewrites

### 3.1 `src/store/analyticsStore.ts` — Full rewrite

**Current state (194 lines):** Imports `analyticsApi.getDashboard()` which will no longer exist after Phase 2.1. Uses `PerformancePoint`, `CostCategory`, `PipelinePerformance` types. Has inline mock data generators and `computeInsights()`.

**Action:** Full rewrite to spec. Uses new `analyticsApi.fetchKPIs()`, `fetchTrends()`, etc. The new store shape:

```ts
interface AnalyticsState {
  period: Period;
  kpis: AnalyticsKPI | null;
  trends: AnalyticsTrend[];       // was: performance: PerformancePoint[]
  costs: CostBreakdown[];         // was: costs: CostCategory[]
  insights: AiInsight[];          // was: aiInsights: AiInsight[]
  pipelines: PipelinePerformance[];
  isLoading: boolean;
  error: string | null;

  setPeriod: (period: Period) => Promise<void>;
  fetchDashboard: () => Promise<void>;
  exportReport: (format: 'csv' | 'pdf') => Promise<void>;
  clearError: () => void;
}
```

Key differences from current:
- Remove `useMockData` flag (mock fallback now lives in API module)
- Remove `performance` field, add `trends`
- Remove `aiInsights`, rename to `insights`
- `fetchDashboard()` calls individual API functions via `Promise.all`
- Remove `generateTrendData()` and `computeInsights()` (moved to API module)

### 3.2 `src/pages/PipelineBuilderPage.tsx` — Full rewrite

**Current state (331 lines):** Already uses `createFromPrompt()` + WebSocket + `PipelineCanvas`. Has floating chat panel, floating controls, message streaming simulation.

**Action:** Full rewrite to spec version (simplified, ~170 lines). The spec version:
- Uses `pipelineStore.createFromPrompt()` ✅ (same as current)
- Uses `useWebSocket` ✅ (same as current)
- Removes floating chat panel animation — uses simpler `AgentChatPanel` component reference
- Removes `pipelineData` state (canvas gets `pipelineId` prop directly)
- Simpler message handling

### 3.3 `src/pages/ApprovalsPage.tsx` — Full rewrite

**Current state (333 lines):** 100% hardcoded `APPROVALS` array with local `Approval` interface. All filtering/approve/reject is local state.

**Action:** Full rewrite to spec. Key changes:
- Import `approvalsApi` from `../api/approvals`
- Import `Approval` from `../types/approval` (no local interface)
- `useEffect` → `approvalsApi.fetchAll()` on mount and filter change
- `handleApprove()` → `approvalsApi.approve(id)`
- `handleReject()` → `approvalsApi.reject(id)`
- Use `useNotificationStore` for success/error notifications
- Different field names: `requested_by_name` instead of `requestedBy`, `risk_score` instead of inline risk display

### 3.4 `src/pages/AuditLogsPage.tsx` — Full rewrite

**Current state (252 lines):** 100% hardcoded `AUDIT_LOGS` array with local `AuditEntry` interface.

**Action:** Full rewrite to spec. Key changes:
- Import `auditApi` from `../api/audit`
- Import `AuditLog`, `AuditFilter` from `../types/audit` (no local interface)
- `useEffect` → `auditApi.fetchLogs()` on mount and filter change
- `handleExport()` → `auditApi.exportCSV()`
- Use `useNotificationStore` for notifications
- Different field names: `username` instead of `user`, `resource` instead of `resource`+`resource_type`, `timestamp` instead of `formatted timestamp`
- Add stat cards (Total Events, Creates, Failures, Auto Actions)

### 3.5 `src/store/index.ts` — Add themeStore export

**Current state:** Exports `authStore`, `pipelineStore`, `notificationStore`, `agentStore`, `analyticsStore`.

**Action:** Add `export { useThemeStore } from './themeStore';`

---

## Phase 4 — Component Updates

### 4.1 `src/components/dashboard/RecentActivity.tsx` — Rewrite signature

**Current state:** Takes `{ pipelines: Pipeline[]; isLoading?: boolean }`.

**Action:** Rewrite to spec. Takes `{ executions: PipelineExecution[]; limit?: number; className?: string }`. Uses `formatDistanceToNow` from `date-fns`. Shows execution status icons, duration, records processed.

### 4.3 `src/components/builder/AgentChatPanel.tsx` — New component

**Does not exist yet.** Required by spec's `PipelineBuilderPage.tsx`.

Props: `{ isOpen, onToggle, messages, onSendMessage, isGenerating }`

Renders: collapsible chat panel with message list, input field, send button. Uses framer-motion for open/close animation.

### 4.4 `src/pages/DashboardPage.tsx` — Update RecentActivity usage

**Current state (line 451):** `<RecentActivity pipelines={recentActivity} isLoading={isLoading} />`

**Action:** Update to `<RecentActivity executions={executions} limit={5} />`. The `executions` data comes from `usePipelineStore().executions`.

---

## Execution Order

| Step | Files | Risk | Build Impact |
|------|-------|------|-------------|
| 1 | `types/analytics.ts`, `types/approval.ts`, `types/audit.ts` | Zero | Types only |
| 2 | `api/analytics.ts` (rewrite), `api/approvals.ts` (new), `api/audit.ts` (new) | Low | Fixes broken barrel exports |
| 3 | `store/analyticsStore.ts` (rewrite), `store/index.ts` (add export) | Medium | Must match new API signatures |
| 4 | `pages/PipelineBuilderPage.tsx` (rewrite) | Medium | Must match new store |
| 5 | `pages/ApprovalsPage.tsx` (rewrite), `pages/AuditLogsPage.tsx` (rewrite) | Medium | Must match new types + API |
| 6 | `components/dashboard/RecentActivity.tsx` (rewrite), `components/builder/AgentChatPanel.tsx` (new), `pages/DashboardPage.tsx` (update) | Low | Signature change + new component |
| 7 | Build verification (`npx tsc --noEmit && npm run build`) | — | — |

Each step depends on the previous. Steps within a step are independent and can be done in parallel.

---

## Risks

1. **Circular dependency** in `api/index.ts` — the barrel exports import from modules that import `api` from `./index`. This works because the modules use `import api from './index'` (default import) and the barrel uses named `export {}`. Verified: no actual cycle at runtime.

2. **`PipelineBuilderPage` rewrite** — the spec version imports `AgentChatPanel` which **does not exist** (`src/components/builder/` has `AgentManagerPanel.tsx`, not `AgentChatPanel.tsx`). `CanvasControls.tsx` does exist. **Resolution:** Create `src/components/builder/AgentChatPanel.tsx` as a new component wrapping the chat interface (messages, input, send), or adapt the spec to use the current inline chat approach. Recommend creating the component to match the spec's intent.

3. **`date-fns` dependency** — `RecentActivity` spec uses `formatDistanceToNow`. Need to verify `date-fns` is in `package.json` (it is — already used in `analyticsStore.ts`).
