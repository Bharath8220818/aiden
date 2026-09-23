import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Bot,
  CheckSquare,
  Database,
  FolderOpen,
  GitBranch,
  Layers,
  LayoutGrid,
  Network,
  Plug,
  ShieldCheck,
  Terminal,
  Users,
  Cpu,
  ChevronDown,
  LayoutDashboard,
} from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { Permission } from '@/features/auth/permissions';
import { cn } from '@/lib/utils';

/**
 * Quick Launch (universal-page WI-1): every routed page as a one-click card
 * inside the Command Workspace. Filtered by the signed-in role's permissions
 * so the grid always matches what the user can actually open.
 */

interface LaunchTarget {
  path: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  permission?: Permission;
}

const TARGETS: LaunchTarget[] = [
  { path: '/dashboard', label: 'Dashboard', description: 'Platform overview & KPIs', icon: <LayoutDashboard className="w-4 h-4" /> },
  { path: '/projects', label: 'Projects', description: 'Create, import, and browse projects', icon: <FolderOpen className="w-4 h-4" /> },
  { path: '/architecture', label: 'Architecture', description: 'Design and validate blueprints', icon: <Network className="w-4 h-4" /> },
  { path: '/pipelines', label: 'Pipeline Builder', description: 'Compose new pipelines', icon: <GitBranch className="w-4 h-4" /> },
  { path: '/pipelines/manage', label: 'Pipeline Manager', description: 'Run, pause, and inspect pipelines', icon: <Layers className="w-4 h-4" /> },
  { path: '/sql', label: 'SQL Workspace', description: 'Query and explore data', icon: <Terminal className="w-4 h-4" />, permission: 'sql.read' },
  { path: '/connections', label: 'Connections', description: 'Warehouses and sources', icon: <Database className="w-4 h-4" />, permission: 'connections.read' },
  { path: '/monitoring', label: 'Monitoring', description: 'Services, metrics, and alerts', icon: <Activity className="w-4 h-4" />, permission: 'monitoring.read' },
  { path: '/incidents', label: 'Incidents', description: 'Failures and their timelines', icon: <AlertTriangle className="w-4 h-4" />, permission: 'incidents.read' },
  { path: '/self-healing', label: 'Self-Healing', description: 'Autonomous recovery loop', icon: <Cpu className="w-4 h-4" />, permission: 'incidents.read' },
  { path: '/agents', label: 'Agent Control', description: 'Orchestrate the 11-agent swarm', icon: <Bot className="w-4 h-4" />, permission: 'agents.read' },
  { path: '/knowledge', label: 'Knowledge / RAG', description: 'The memory agents retrieve from', icon: <BookOpen className="w-4 h-4" />, permission: 'knowledge.read' },
  { path: '/integrations', label: 'Integrations', description: 'MCP servers and tools', icon: <Plug className="w-4 h-4" />, permission: 'knowledge.read' },
  { path: '/approvals', label: 'Approvals', description: 'Sign off pending actions', icon: <CheckSquare className="w-4 h-4" />, permission: 'approvals.read' },
  { path: '/governance', label: 'Governance', description: 'Audit log and policy', icon: <ShieldCheck className="w-4 h-4" />, permission: 'approvals.read' },
  { path: '/team', label: 'Team', description: 'Members and roles', icon: <Users className="w-4 h-4" /> },
];

export const QuickLaunch: React.FC<{ highlightPath?: string | null }> = ({ highlightPath }) => {
  const navigate = useNavigate();
  // A deep-linked ?p= page must be visible on arrival — start expanded when set.
  const [expanded, setExpanded] = useState(() => Boolean(highlightPath));
  const { can } = useAuth();

  const visible = TARGETS.filter((t) => !t.permission || can(t.permission));
  const shown = expanded ? visible : visible.slice(0, 8);

  return (
    <div data-testid="quick-launch" className="mb-1">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted hover:text-text-secondary transition-colors"
      >
        <LayoutGrid className="w-3 h-3" />
        Quick Launch — every page, one click
        <ChevronDown className={cn('w-3 h-3 transition-transform', expanded && 'rotate-180')} />
      </button>
      <div className={cn('mt-2 grid gap-1.5 stagger-children', expanded ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'grid-flow-col auto-cols-max overflow-x-auto pb-1')}>
        {shown.map((t) => (
          <button
            key={t.path}
            onClick={() => navigate(t.path)}
            data-testid={`quick-launch-${t.path.replace(/\//g, '-')}`}
            className={cn(
              'group flex items-start gap-2 rounded-lg border p-2 text-left transition-colors',
              highlightPath === t.path
                ? 'border-indigo-500/50 bg-indigo-500/10'
                : 'border-border bg-card hover:border-indigo-500/40 hover:bg-card-hover'
            )}
          >
            <span className="mt-0.5 text-text-secondary group-hover:text-indigo-600 transition-colors">{t.icon}</span>
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold text-text-primary truncate">{t.label}</span>
              {expanded && <span className="block text-[10px] text-text-muted leading-snug">{t.description}</span>}
            </span>
          </button>
        ))}
        {!expanded && visible.length > 8 && (
          <button
            onClick={() => setExpanded(true)}
            className="flex items-center rounded-lg border border-border bg-card px-2.5 text-[11px] text-text-secondary hover:text-text-primary transition-colors"
          >
            +{visible.length - 8} more
          </button>
        )}
      </div>
    </div>
  );
};
