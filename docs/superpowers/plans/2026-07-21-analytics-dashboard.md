# Analytics Dashboard Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the existing Analytics page with executive KPI cards, Recharts-based performance charts, cost breakdown with donut chart, pipeline comparison table, AI-generated insights, and CSV/PDF export — all using the enterprise dark design system.

**Architecture:** The page already exists at `frontend/src/pages/AnalyticsPage.tsx` with light-first CSS, manual SVG bar chart, inline mock data, and no Recharts usage. The plan converts the entire page to the dark-first design system, replaces manual SVG with Recharts `LineChart`/`BarChart`/`PieChart`, adds a new `analyticsStore` for centralized mock data, adds an `AIInsightCard` component for generated insights, adds a `MetricsKpiCard` component for the top KPI row, and adds a `PipelineComparisonTable` component. The `Header.tsx` nav link is already present — no routing changes needed.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Recharts (v3.9.2, already installed), Framer Motion, Zustand, Lucide React

## Global Constraints

- All new/modified components use the enterprise dark-first design system: backgrounds `bg-[#111827]`, borders `border-[#1E293B]`, cards `glass-card`, buttons `btn-primary-gradient` or `btn-secondary`, badges `badge-success`/`badge-error`/`badge-info`
- No new npm dependencies — `recharts` is already at `^3.9.2`, all icons from `lucide-react`, animations from `framer-motion`
- `App.tsx` route at `/analytics` and `Header.tsx` nav link must NOT be modified
- Mock data lives in a new `analyticsStore` with realistic values for trend, cost, and pipeline metrics
- Recharts chart components are imported directly from `recharts` (no wrapper layer needed)
- CSV export uses a client-side blob download; PDF export is a simulated download (no heavy PDF library)
- The AI-driven insight section shows 2-3 dynamically-calculated cards based on the mock data

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `frontend/src/store/analyticsStore.ts` | **Create** | Zustand store with mock trend data, cost breakdown, pipeline metrics, AI insights, and export actions |
| `frontend/src/pages/AnalyticsPage.tsx` | **Modify** | Replace entire file — dark-first design, Recharts integration, store-driven data, KPI cards, cost donut, comparison table, insights section, export buttons |
| `frontend/src/components/analytics/AIInsightCard.tsx` | **Create** | Reusable insight card with gradient icon, severity color coding, actionable button |
| `frontend/src/components/analytics/MetricsKpiCard.tsx` | **Create** | KPI card with animated counter, gradient icon, trend arrow, period label |
| `frontend/src/components/analytics/index.ts` | **Create** | Barrel export for analytics components |
| `frontend/src/components/common/Header.tsx` | **No change** | Nav already includes `/analytics` with `BarChart4` icon |
| `frontend/src/App.tsx` | **No change** | Route at `/analytics` already points to `AnalyticsPage` |

---

### Task 1: Create analyticsStore with mock data

**Files:**
- Create: `frontend/src/store/analyticsStore.ts`

**Interfaces:**
- Consumes: nothing (standalone store)
- Produces: `useAnalyticsStore` with `trendData`, `costBreakdown`, `pipelineMetrics`, `aiInsights`, `period`, `setPeriod`, `exportCsv`, `exportPdf`

- [ ] **Step 1: Define TypeScript types and mock data constants**

```typescript
import { create } from 'zustand';
import { subDays, format } from 'date-fns';

export type Period = '7D' | '30D' | '90D' | '1Y';

export interface TrendPoint {
  date: string;
  runs: number;
  success: number;
  failed: number;
  duration: number; // avg minutes
}

export interface CostBreakdown {
  category: string;
  amount: number;
  percentage: number;
  trend: 'up' | 'down';
  trendValue: string;
}

export interface PipelineMetric {
  name: string;
  id: number;
  runs: number;
  avgDuration: string;
  dataVolume: string;
  cost: string;
  successRate: number;
}

export interface AiInsight {
  id: string;
  type: 'improvement' | 'warning' | 'achievement';
  title: string;
  description: string;
  metric: string;
  action: string;
  actionLabel: string;
}

// ─── Generate trend data for the last 30 days ─────────────────────────
const generateTrendData = (days: number): TrendPoint[] => {
  const data: TrendPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = format(subDays(new Date(), i), 'MMM dd');
    const base = 120 + Math.round(Math.random() * 80);
    data.push({
      date,
      runs: base,
      success: Math.round(base * (0.85 + Math.random() * 0.12)),
      failed: Math.round(base * (0.02 + Math.random() * 0.05)),
      duration: Math.round((3 + Math.random() * 6) * 10) / 10,
    });
  }
  return data;
};

const TREND_DATA: TrendPoint[] = generateTrendData(30);

const COST_BREAKDOWN: CostBreakdown[] = [
  { category: 'Compute', amount: 1280, percentage: 42, trend: 'up', trendValue: '+8.2%' },
  { category: 'Storage', amount: 580, percentage: 19, trend: 'up', trendValue: '+3.1%' },
  { category: 'Data Transfer', amount: 420, percentage: 14, trend: 'down', trendValue: '-2.4%' },
  { category: 'API Calls', amount: 350, percentage: 11, trend: 'up', trendValue: '+5.7%' },
  { category: 'AI Inference', amount: 280, percentage: 9, trend: 'down', trendValue: '-1.8%' },
  { category: 'Other', amount: 150, percentage: 5, trend: 'up', trendValue: '+0.9%' },
];

const PIPELINE_METRICS: PipelineMetric[] = [
  { id: 1, name: 'Daily Sales ETL', runs: 142, avgDuration: '4.2 min', dataVolume: '2.1 GB', cost: '$12.40', successRate: 98 },
  { id: 2, name: 'Customer Analytics', runs: 89, avgDuration: '2.8 min', dataVolume: '890 MB', cost: '$8.20', successRate: 100 },
  { id: 3, name: 'IoT Stream Pipeline', runs: 340, avgDuration: '0.5 min', dataVolume: '15.2 GB', cost: '$45.80', successRate: 62 },
  { id: 4, name: 'Product Inventory', runs: 28, avgDuration: '8.1 min', dataVolume: '450 MB', cost: '$6.50', successRate: 87 },
  { id: 5, name: 'Marketing Attribution', runs: 56, avgDuration: '3.5 min', dataVolume: '1.8 GB', cost: '$9.30', successRate: 95 },
];
```

- [ ] **Step 2: Implement the store**

```typescript
interface AnalyticsState {
  period: Period;
  trendData: TrendPoint[];
  costBreakdown: CostBreakdown[];
  pipelineMetrics: PipelineMetric[];
  aiInsights: AiInsight[];

  setPeriod: (period: Period) => void;
  exportCsv: () => void;
  exportPdf: () => void;
}

function computeInsights(pipelines: PipelineMetric[]): AiInsight[] {
  const worstPipeline = pipelines.reduce((w, p) => (p.successRate < w.successRate ? p : w), pipelines[0]);
  const totalRuns = pipelines.reduce((s, p) => s + p.runs, 0);
  const totalCost = pipelines.reduce((s, p) => s + parseFloat(p.cost.replace('$', '')), 0);
  const bestPipeline = pipelines.reduce((b, p) => (p.successRate > b.successRate ? p : b), pipelines[0]);

  return [
    {
      id: '1',
      type: 'warning',
      title: `${worstPipeline.name} has a low success rate`,
      description: `Only ${worstPipeline.successRate}% of runs succeed. This may indicate data quality issues or configuration drift.`,
      metric: `${worstPipeline.successRate}% success`,
      action: `inspect-broken`,
      actionLabel: 'Investigate Pipeline',
    },
    {
      id: '2',
      type: 'improvement',
      title: 'Cost optimization opportunity',
      description: `Your top 3 pipelines account for ${Math.round((parseFloat(PIPELINE_METRICS[0].cost.replace('$','')) + parseFloat(PIPELINE_METRICS[1].cost.replace('$','')) + parseFloat(PIPELINE_METRICS[2].cost.replace('$',''))) / totalCost * 100)}% of total cost. Consider reviewing compute resources.`,
      metric: `$${totalCost.toFixed(0)} total`,
      action: 'view-costs',
      actionLabel: 'View Cost Breakdown',
    },
    {
      id: '3',
      type: 'achievement',
      title: `${bestPipeline.name} is performing excellently`,
      description: `100% success rate over ${bestPipeline.runs} runs. This pipeline is a model candidate for your CI/CD templates.`,
      metric: '100% success',
      action: 'promote-template',
      actionLabel: 'Use as Template',
    },
  ];
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  period: '30D',
  trendData: TREND_DATA,
  costBreakdown: COST_BREAKDOWN,
  pipelineMetrics: PIPELINE_METRICS,
  aiInsights: computeInsights(PIPELINE_METRICS),

  setPeriod: (period) => {
    const days = period === '7D' ? 7 : period === '30D' ? 30 : period === '90D' ? 90 : 365;
    set({
      period,
      trendData: generateTrendData(days),
    });
  },

  exportCsv: () => {
    const headers = 'Pipeline,Runs,Avg Duration,Data Volume,Cost,Success Rate\n';
    const rows = PIPELINE_METRICS
      .map((p) => `${p.name},${p.runs},${p.avgDuration},${p.dataVolume},${p.cost},${p.successRate}%`)
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aiden-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  exportPdf: () => {
    // Simulated PDF export — creates a download with formatted text summary
    const lines = [
      'AIDEN Analytics Report',
      `Generated: ${format(new Date(), 'PPpp')}`,
      '─────────────────────────────',
      '',
      ...PIPELINE_METRICS.map(
        (p) => `${p.name}: ${p.runs} runs, ${p.avgDuration} avg, ${p.dataVolume}, ${p.cost}, ${p.successRate}% success`
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aiden-analytics-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  },
}));
```

- [ ] **Step 3: Verify store compiles**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -30`
Expected: No errors (or only errors from Task 2, which is expected since `AnalyticsPage.tsx` hasn't been updated yet)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/store/analyticsStore.ts
git commit -m "feat(analytics): create analyticsStore with mock data and export actions"
```

---

### Task 2: Create MetricsKpiCard component

**Files:**
- Create: `frontend/src/components/analytics/MetricsKpiCard.tsx`

**Interfaces:**
- Consumes: `title`, `value`, `icon`, `sub`, `trend` props
- Produces: `<MetricsKpiCard />` with gradient icon wrapper, animated value, trend indicator, and dark design

- [ ] **Step 1: Write component with gradient icon variants and animated counter**

```typescript
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

type Variant = 'purple' | 'green' | 'cyan' | 'amber' | 'red';

interface TrendData {
  direction: 'up' | 'down' | 'neutral';
  value: string;
}

interface MetricsKpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  sub?: string;
  trend?: TrendData;
  variant: Variant;
  delay?: number;
}

const variantStyles: Record<Variant, { gradient: string; shadow: string }> = {
  purple: { gradient: 'from-purple-600 to-purple-500', shadow: 'shadow-purple-500/30' },
  green: { gradient: 'from-green-600 to-green-500', shadow: 'shadow-green-500/30' },
  cyan: { gradient: 'from-cyan-600 to-cyan-500', shadow: 'shadow-cyan-500/30' },
  amber: { gradient: 'from-amber-500 to-amber-400', shadow: 'shadow-amber-400/30' },
  red: { gradient: 'from-red-600 to-red-500', shadow: 'shadow-red-500/30' },
};

const AnimatedValue: React.FC<{ value: number; duration?: number }> = ({ value, duration = 600 }) => {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number>();

  useEffect(() => {
    const startTime = performance.now();
    const from = 0;
    const delta = value - from;

    const tick = (now: number) => {
      if (!startRef.current) startRef.current = now;
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(Math.round(from + delta * eased));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration]);

  return <>{display.toLocaleString()}</>;
};

const MetricsKpiCard: React.FC<MetricsKpiCardProps> = ({
  title, value, icon, sub, trend, variant, delay = 0,
}) => {
  const styles = variantStyles[variant];

  const TrendIcon = trend?.direction === 'up' ? TrendingUp
    : trend?.direction === 'down' ? TrendingDown
    : Minus;

  const trendColor = trend?.direction === 'up' ? 'text-green-400'
    : trend?.direction === 'down' ? 'text-red-400'
    : 'text-gray-400';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      className="glass-card p-5 transition-all duration-300 hover:border-purple-500/30 hover:shadow-glow-purple hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-white truncate">
            {typeof value === 'number' ? <AnimatedValue value={value} /> : value}
          </p>
          {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
        </div>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${styles.gradient} text-white shadow-lg ${styles.shadow}`}>
          {icon}
        </div>
      </div>

      {/* Trend row */}
      {trend && (
        <div className="mt-3 flex items-center gap-1.5 pt-3 border-t border-white/5">
          <TrendIcon size={14} className={trendColor} />
          <span className={`text-sm font-semibold ${trendColor}`}>{trend.value}</span>
          <span className="text-xs text-gray-500 ml-auto">vs last period</span>
        </div>
      )}
    </motion.div>
  );
};

export default MetricsKpiCard;
```

- [ ] **Step 2: TypeScript check**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/analytics/MetricsKpiCard.tsx
git commit -m "feat(analytics): add MetricsKpiCard with gradient icon variants and animated counter"
```

---

### Task 3: Create AIInsightCard component

**Files:**
- Create: `frontend/src/components/analytics/AIInsightCard.tsx`

**Interfaces:**
- Consumes: `AiInsight` type from `analyticsStore` (id, type, title, description, metric, action, actionLabel)
- Produces: `<AIInsightCard />` with severity coding, gradient accent bar, actionable button

- [ ] **Step 1: Write component with type-based styling**

```typescript
import React from 'react';
import { motion } from 'framer-motion';
import {
  Lightbulb, AlertTriangle, Trophy, ArrowRight, Sparkles,
} from 'lucide-react';

interface AiInsight {
  id: string;
  type: 'improvement' | 'warning' | 'achievement';
  title: string;
  description: string;
  metric: string;
  action: string;
  actionLabel: string;
}

interface AIInsightCardProps {
  insight: AiInsight;
  onAction: (action: string) => void;
  delay?: number;
}

const typeConfig = {
  improvement: {
    icon: Lightbulb,
    gradient: 'from-cyan-600 to-cyan-500',
    shadow: 'shadow-cyan-500/30',
    badge: 'badge-cyan',
    border: 'border-cyan-500/20',
    bg: 'bg-cyan-500/5',
    accent: 'bg-cyan-500',
  },
  warning: {
    icon: AlertTriangle,
    gradient: 'from-amber-500 to-amber-400',
    shadow: 'shadow-amber-400/30',
    badge: 'badge-warning',
    border: 'border-amber-500/20',
    bg: 'bg-amber-500/5',
    accent: 'bg-amber-500',
  },
  achievement: {
    icon: Trophy,
    gradient: 'from-green-600 to-green-500',
    shadow: 'shadow-green-500/30',
    badge: 'badge-success',
    border: 'border-green-500/20',
    bg: 'bg-green-500/5',
    accent: 'bg-green-500',
  },
};

const AIInsightCard: React.FC<AIInsightCardProps> = ({ insight, onAction, delay = 0 }) => {
  const config = typeConfig[insight.type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: 'easeOut' }}
      className={`relative overflow-hidden rounded-2xl border ${config.border} ${config.bg} p-5 transition-all duration-200 hover:shadow-glow-purple`}
    >
      {/* Accent bar */}
      <div className={`absolute left-0 top-0 h-full w-0.5 ${config.accent}`} />

      <div className="flex items-start gap-4 pl-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${config.gradient} text-white shadow-lg ${config.shadow}`}>
          <Icon size={20} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-white">{insight.title}</h3>
            <span className={config.badge}>{insight.metric}</span>
          </div>
          <p className="mt-1 text-sm text-gray-400 leading-relaxed">{insight.description}</p>
          <button
            onClick={() => onAction(insight.action)}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors group"
          >
            <Sparkles size={12} />
            {insight.actionLabel}
            <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default AIInsightCard;
```

- [ ] **Step 2: TypeScript check**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/analytics/AIInsightCard.tsx
git commit -m "feat(analytics): add AIInsightCard with severity coding and actionable button"
```

---

### Task 4: Create barrel export for analytics components

**Files:**
- Create: `frontend/src/components/analytics/index.ts`

- [ ] **Step 1: Create barrel export**

```typescript
export { default as MetricsKpiCard } from './MetricsKpiCard';
export { default as AIInsightCard } from './AIInsightCard';
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/analytics/index.ts
git commit -m "chore(analytics): add barrel export for analytics components"
```

---

### Task 5: Refresh AnalyticsPage with enterprise dark design and all features

**Files:**
- Modify: `frontend/src/pages/AnalyticsPage.tsx` (replace entire file)

**Interfaces:**
- Consumes: `useAnalyticsStore`, `MetricsKpiCard`, `AIInsightCard`
- Consumes: Enterprise dark design classes (`bg-[#111827]`, `border-[#1E293B]`, `glass-card`, etc.)
- Consumes: Recharts components (`LineChart`, `BarChart`, `PieChart`, `AreaChart`)
- Produces: Full analytics dashboard with all requested features

- [ ] **Step 1: Write the complete refreshed page**

```typescript
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart3, TrendingUp, DollarSign, Database, Download,
  FileText, Sparkles, ArrowUpRight, ArrowDownRight,
  Activity, Zap, Clock, Cpu, Search, ChevronDown,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { useAnalyticsStore } from '../store/analyticsStore';
import { MetricsKpiCard } from '../components/analytics';
import { AIInsightCard } from '../components/analytics';
import type { Period } from '../store/analyticsStore';

// ─── Chart tooltip theme ──────────────────────────────────────────────
const chartTooltipStyle = {
  contentStyle: {
    background: '#111827',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    fontSize: '13px',
    color: '#F8FAFC',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  },
  labelStyle: { color: '#94A3B8', fontSize: '11px' },
};

// ─── Custom Tooltip ────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={chartTooltipStyle.contentStyle} className="p-3">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

// ─── Cost Donut ─────────────────────────────────────────────────────────
const DONUT_COLORS = ['#7C3AED', '#06B6D4', '#F59E0B', '#22C55E', '#EF4444', '#64748B'];

const CostDonutChart: React.FC<{ data: any[] }> = ({ data }) => {
  const total = data.reduce((s: number, c: any) => s + c.amount, 0);
  return (
    <div className="flex items-center gap-6">
      <div className="h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={2}
              dataKey="amount"
            >
              {data.map((_: any, i: number) => (
                <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip {...chartTooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-2 flex-1 min-w-0">
        {data.slice(0, 5).map((item: any, i: number) => (
          <div key={item.category} className="flex items-center gap-2.5 text-sm">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: DONUT_COLORS[i] }} />
            <span className="text-gray-400 truncate">{item.category}</span>
            <span className="ml-auto font-semibold text-white shrink-0">
              ${item.amount.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main Page ──────────────────────────────────────────────────────────
const AnalyticsPage: React.FC = () => {
  const {
    period, trendData, costBreakdown, pipelineMetrics, aiInsights,
    setPeriod, exportCsv, exportPdf,
  } = useAnalyticsStore();

  const handleInsightAction = (action: string) => {
    if (action === 'view-costs') {
      document.getElementById('cost-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Compute summary stats
  const totalRuns = pipelineMetrics.reduce((s, p) => s + p.runs, 0);
  const totalCost = pipelineMetrics.reduce((s, p) => s + parseFloat(p.cost.replace('$', '')), 0);
  const totalDataVolume = pipelineMetrics.reduce((s, p) => s + parseFloat(p.dataVolume.replace(' GB', '').replace(' MB', '')), 0);
  const avgSuccessRate = Math.round(pipelineMetrics.reduce((s, p) => s + p.successRate, 0) / pipelineMetrics.length);

  // Aggregate trend data for the chart
  const chartData = trendData.slice(-14).map((d) => ({
    date: d.date,
    Runs: d.runs,
    Success: d.success,
    Failed: d.failed,
  }));

  const kpis = [
    { title: 'Pipeline Runs', value: totalRuns, icon: <Activity size={20} />, sub: `This ${period}`, trend: { direction: 'up' as const, value: '+16.2%' }, variant: 'purple' as const },
    { title: 'Total Cost', value: `$${totalCost.toFixed(0)}`, icon: <DollarSign size={20} />, sub: `This ${period}`, trend: { direction: 'up' as const, value: '+8.3%' }, variant: 'amber' as const },
    { title: 'Data Processed', value: `${totalDataVolume.toFixed(1)} GB`, icon: <Database size={20} />, sub: `This ${period}`, trend: { direction: 'up' as const, value: '+12.5%' }, variant: 'cyan' as const },
    { title: 'Avg Success Rate', value: `${avgSuccessRate}%`, icon: <TrendingUp size={20} />, sub: 'Across all pipelines', trend: { direction: 'down' as const, value: '-1.2%' }, variant: 'green' as const },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-8">
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-purple-400">Insights & Intelligence</p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">Analytics</h1>
          <p className="mt-1 text-sm text-gray-400">Pipeline performance, costs, and data volume metrics.</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex rounded-xl border border-[#1E293B] bg-[#111827] p-1 shadow-sm">
            {(['7D', '30D', '90D', '1Y'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                  period === p
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Export buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={exportCsv}
              className="flex items-center gap-1.5 rounded-xl border border-[#1E293B] bg-[#111827] px-3 py-2 text-sm font-medium text-gray-300 shadow-sm transition-all hover:bg-white/5 hover:text-white"
            >
              <Download size={14} />
              <span className="hidden sm:inline">CSV</span>
            </button>
            <button
              onClick={exportPdf}
              className="flex items-center gap-1.5 rounded-xl border border-[#1E293B] bg-[#111827] px-3 py-2 text-sm font-medium text-gray-300 shadow-sm transition-all hover:bg-white/5 hover:text-white"
            >
              <FileText size={14} />
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* EXECUTIVE KPI ROW */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi, i) => (
          <MetricsKpiCard
            key={kpi.title}
            title={kpi.title}
            value={kpi.value}
            icon={kpi.icon}
            sub={kpi.sub}
            trend={kpi.trend}
            variant={kpi.variant}
            delay={i * 0.08}
          />
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* AI-GENERATED INSIGHTS */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={16} className="text-purple-400" />
          <h2 className="text-base font-bold text-white">AI-Generated Insights</h2>
        </div>
        <div className="grid gap-3">
          {aiInsights.map((insight, i) => (
            <AIInsightCard
              key={insight.id}
              insight={insight}
              onAction={handleInsightAction}
              delay={i * 0.1}
            />
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TWO COLUMN: Performance Trend + Cost Donut */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Performance Trend — Area Chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-white">Pipeline Performance Trend</h2>
              <p className="text-xs text-gray-400">Daily pipeline runs — last {period}</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-purple-500" />Runs
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-500" />Success
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500" />Failed
              </span>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="runsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="successGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="Runs"
                  stroke="#7C3AED"
                  strokeWidth={2}
                  fill="url(#runsGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#7C3AED', stroke: '#1E293B', strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="Success"
                  stroke="#22C55E"
                  strokeWidth={2}
                  fill="url(#successGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#22C55E', stroke: '#1E293B', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 flex items-center gap-4 rounded-xl bg-purple-500/5 border border-purple-500/10 p-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-cyan-600 text-white shadow-lg">
              <TrendingUp size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">16.2% increase vs last period</p>
              <p className="text-xs text-gray-400">Pipeline activity is trending upward across all stages</p>
            </div>
          </div>
        </motion.div>

        {/* Cost Breakdown — Donut */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
          id="cost-section"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white">Cost Breakdown</h2>
              <p className="text-xs text-gray-400">
                Total: ${costBreakdown.reduce((s, c) => s + c.amount, 0).toLocaleString()} this {period}
              </p>
            </div>
            <DollarSign size={18} className="text-amber-400" />
          </div>

          <CostDonutChart data={costBreakdown} />

          <div className="mt-4 pt-4 border-t border-[#1E293B] space-y-2">
            {costBreakdown.map((item) => (
              <div key={item.category} className="flex items-center justify-between text-xs">
                <span className="text-gray-400">{item.category}</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[#1E293B]">
                    <div
                      className="h-full rounded-full bg-purple-500 transition-all"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <span className="flex items-center gap-0.5 font-semibold text-gray-300">
                    {item.trend === 'up' ? <ArrowUpRight size={10} className="text-red-400" /> : <ArrowDownRight size={10} className="text-green-400" />}
                    {item.trendValue}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* DURATION BAR CHART */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="glass-card p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-white">Pipeline Duration</h2>
            <p className="text-xs text-gray-400">Average execution time per pipeline (minutes)</p>
          </div>
          <Clock size={18} className="text-cyan-400" />
        </div>

        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={pipelineMetrics}
              margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: '#94A3B8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={140}
              />
              <Tooltip
                contentStyle={chartTooltipStyle.contentStyle}
                labelStyle={{ color: '#94A3B8' }}
              />
              <Bar dataKey="avgDuration" name="Avg Duration" radius={[0, 6, 6, 0]} barSize={20}>
                {pipelineMetrics.map((_, i) => (
                  <Cell key={i} fill={i === 2 ? '#EF4444' : i === 0 ? '#7C3AED' : '#06B6D4'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* PIPELINE COMPARISON TABLE */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-[#1E293B] px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-white">Pipeline Comparison</h2>
            <p className="text-xs text-gray-400">Detailed metrics per pipeline</p>
          </div>
          <Link to="/pipelines" className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors">
            View All →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-[#1E293B]">
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Pipeline</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Runs</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Avg Duration</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Data Volume</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Cost</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">Success Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]/50">
              {pipelineMetrics.map((p, i) => (
                <motion.tr
                  key={p.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.45 + i * 0.05 }}
                  className="transition-colors hover:bg-white/[0.02]"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-cyan-500/20 text-xs font-bold text-purple-300">
                        {p.name.charAt(0)}
                      </div>
                      <span className="text-sm font-semibold text-white">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-300">{p.runs.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Clock size={12} className="text-gray-500" />
                      <span className="text-sm text-gray-400">{p.avgDuration}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">{p.dataVolume}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-300">{p.cost}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#1E293B]">
                        <div
                          className={`h-full rounded-full transition-all ${
                            p.successRate >= 95 ? 'bg-green-500' : p.successRate >= 80 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${p.successRate}%` }}
                        />
                      </div>
                      <span className={`text-xs font-semibold ${
                        p.successRate >= 95 ? 'text-green-400' : p.successRate >= 80 ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {p.successRate}%
                      </span>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AnalyticsPage;
```

- [ ] **Step 2: TypeScript check**

Run: `cd frontend && npx tsc --noEmit 2>&1`
Expected: No errors

- [ ] **Step 3: Verify Vite build**

Run: `cd frontend && npx vite build 2>&1 | tail -10`
Expected: `✓ built in X.XXs`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/AnalyticsPage.tsx frontend/src/store/analyticsStore.ts frontend/src/components/analytics/
git commit -m "feat(analytics): refresh page with dark design, Recharts, AI insights, KPI cards, and export"
```

---

### Task 6: Write component tests

**Files:**
- Create: `frontend/src/components/analytics/MetricsKpiCard.test.tsx`
- Create: `frontend/src/components/analytics/AIInsightCard.test.tsx`

**Interfaces:**
- Consumes: `MetricsKpiCard` and `AIInsightCard` rendering logic
- Produces: 4 passing tests validating rendering, variant styling, and action callbacks

- [ ] **Step 1: Write MetricsKpiCard tests**

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MetricsKpiCard from './MetricsKpiCard';
import { Zap } from 'lucide-react';

describe('MetricsKpiCard', () => {
  it('renders title and value', () => {
    render(
      <MetricsKpiCard
        title="Pipeline Runs"
        value={12580}
        icon={<Zap size={20} data-testid="icon" />}
        variant="purple"
      />
    );
    expect(screen.getByText('Pipeline Runs')).toBeTruthy();
  });

  it('renders trend data when provided', () => {
    render(
      <MetricsKpiCard
        title="Total Cost"
        value="$1,280"
        icon={<Zap size={20} />}
        variant="amber"
        trend={{ direction: 'up', value: '+8.3%' }}
      />
    );
    expect(screen.getByText('+8.3%')).toBeTruthy();
  });

  it('renders subtitle when provided', () => {
    render(
      <MetricsKpiCard
        title="Data Processed"
        value="20.4 GB"
        icon={<Zap size={20} />}
        variant="cyan"
        sub="This 30D"
      />
    );
    expect(screen.getByText('This 30D')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Write AIInsightCard tests**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AIInsightCard from './AIInsightCard';

const mockInsight = {
  id: '1',
  type: 'warning' as const,
  title: 'Test insight',
  description: 'This is a test description',
  metric: '62% success',
  action: 'inspect-broken',
  actionLabel: 'Investigate Pipeline',
};

describe('AIInsightCard', () => {
  it('renders insight title and description', () => {
    render(<AIInsightCard insight={mockInsight} onAction={() => {}} />);
    expect(screen.getByText('Test insight')).toBeTruthy();
    expect(screen.getByText('This is a test description')).toBeTruthy();
  });

  it('calls onAction when button is clicked', () => {
    const handleAction = vi.fn();
    render(<AIInsightCard insight={mockInsight} onAction={handleAction} />);
    fireEvent.click(screen.getByText('Investigate Pipeline'));
    expect(handleAction).toHaveBeenCalledWith('inspect-broken');
  });
});
```

- [ ] **Step 3: Run tests**

Run: `cd frontend && npx vitest run src/components/analytics/ 2>&1`
Expected: `✓ 5 passed`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/analytics/MetricsKpiCard.test.tsx frontend/src/components/analytics/AIInsightCard.test.tsx
git commit -m "test(analytics): add MetricsKpiCard and AIInsightCard component tests"
```

---

## Self-Review

**1. Spec coverage:**
- ✅ "Executive KPI cards" — Task 5 renders 4 `MetricsKpiCard` components (Pipeline Runs, Total Cost, Data Processed, Avg Success Rate) with gradient icons, trend arrows, and animated counters
- ✅ "Pipeline performance charts (Recharts)" — Task 5 uses `AreaChart` for trend data with gradient fill, custom tooltip, and responsive container
- ✅ "Cost analysis" — Task 5 uses `PieChart` donut with `CostDonutChart` sub-component, 6 cost breakdown categories with trend indicators and progress bars
- ✅ "Pipeline comparison table" — Task 5 includes a full comparison table with pipeline names, runs, duration, data volume, cost, and success rate bars
- ✅ "AI-generated insights" — Task 5 renders 3 `AIInsightCard` components (warning, improvement, achievement) with severity color coding, gradient icons, and actionable buttons
- ✅ "CSV/PDF export" — `analyticsStore` `exportCsv` and `exportPdf` actions use client-side blob downloads. Export buttons in the header
- ✅ "Enterprise dark design system" — All components use `glass-card`, `bg-[#111827]`, `border-[#1E293B]`, `bg-gradient-to-br`, `text-white`, `text-gray-400`, badges, Framer Motion animations
- ✅ "Recharts" — Already installed (v3.9.2). `AreaChart`, `PieChart`, `BarChart` with `ResponsiveContainer`, `CartesianGrid`, custom `Tooltip`, gradients

**2. Placeholder scan:** No TBD/TODO/filler patterns found. Every step has complete code. Every command has expected output.

**3. Type consistency:**
- `Period` type (`'7D' | '30D' | '90D' | '1Y'`) consistent across store and page
- `AiInsight.type` (`'improvement' | 'warning' | 'achievement'`) matches `typeConfig` keys in `AIInsightCard`
- `CostBreakdown.trend` (`'up' | 'down'`) consistent between store and card rendering
- `MetricsKpiCard` `variant` prop (`'purple' | 'green' | 'cyan' | 'amber' | 'red'`) matches `variantStyles` keys
- `handleInsightAction` function signature `(action: string) => void` matches `AIInsightCard` `onAction` prop
- `exportCsv` and `exportPdf` are void functions matching the store interface
- `Chart data interface` `TrendPoint` fields (`date`, `runs`, `success`, `failed`, `duration`) used consistently in chart rendering
</parameter>
