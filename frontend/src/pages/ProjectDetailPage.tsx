import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useProject, useUpdateProject, useDeleteProject } from '@/features/projects/hooks/useProjects';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { usePermission } from '@/features/auth/hooks/useAuth';
import { Project } from '@/features/projects/types';
import { cn } from '@/lib/utils';
import {
  FolderOpen,
  MessageSquare,
  Network,
  GitBranch,
  AlertTriangle,
  Layers,
  Users,
  BookOpen,
  Bot,
  ShieldCheck,
  ClipboardList,
  ChevronLeft,
  Edit2,
  Trash2,
  Save,
  X,
  Sparkles,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Tab definitions                                                      */
/* ------------------------------------------------------------------ */

type TabId =
  | 'overview'
  | 'workspace'
  | 'architecture'
  | 'pipelines'
  | 'incidents'
  | 'knowledge'
  | 'agents'
  | 'team'
  | 'audit';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  href?: string;
  badge?: number;
}

function buildTabs(project: Project): Tab[] {
  const wsHref = `/workspace?p=${encodeURIComponent(`/projects/${project.id}`)}&projectId=${project.id}&projectName=${encodeURIComponent(project.name)}`;
  return [
    { id: 'overview',      label: 'Overview',      icon: <FolderOpen className="w-3.5 h-3.5" /> },
    { id: 'workspace',     label: 'AIDEN Workspace', icon: <MessageSquare className="w-3.5 h-3.5" />, href: wsHref, badge: project.requirementCount },
    { id: 'architecture',  label: 'Architecture',  icon: <Network className="w-3.5 h-3.5" />,   href: '/architecture',  badge: project.architectureCount },
    { id: 'pipelines',     label: 'Pipelines',     icon: <GitBranch className="w-3.5 h-3.5" />, href: '/pipelines',     badge: project.pipelineCount },
    { id: 'incidents',     label: 'Incidents',     icon: <AlertTriangle className="w-3.5 h-3.5" />, href: '/incidents', badge: project.incidentCount },
    { id: 'knowledge',     label: 'Knowledge',     icon: <BookOpen className="w-3.5 h-3.5" />,  href: '/knowledge' },
    { id: 'agents',        label: 'Agents',        icon: <Bot className="w-3.5 h-3.5" />,       href: '/agents' },
    { id: 'team',          label: 'Team',          icon: <Users className="w-3.5 h-3.5" />,     href: '/team' },
    { id: 'audit',         label: 'Audit',         icon: <ClipboardList className="w-3.5 h-3.5" /> },
  ];
}

/* ------------------------------------------------------------------ */
/* Overview tab content                                                 */
/* ------------------------------------------------------------------ */

const STATUS_BADGE: Record<Project['status'], { variant: 'success' | 'neutral' | 'warning'; label: string }> = {
  active:   { variant: 'success', label: 'Active' },
  draft:    { variant: 'neutral', label: 'Draft' },
  archived: { variant: 'warning', label: 'Archived' },
};

interface OverviewTabProps {
  project: Project;
  canEdit: boolean;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ project, canEdit }) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [desc, setDesc] = useState(project.description ?? '');
  const updateMutation = useUpdateProject(project.id);

  const handleSave = async () => {
    await updateMutation.mutateAsync({ name: name.trim(), description: desc.trim() || undefined });
    setEditing(false);
  };

  const statCards = [
    { icon: <MessageSquare className="w-4 h-4 text-indigo-600" />, label: 'AIDEN Workspace', value: project.requirementCount, href: `/workspace?p=${encodeURIComponent(`/projects/${project.id}`)}&projectId=${project.id}&projectName=${encodeURIComponent(project.name)}` },
    { icon: <Network className="w-4 h-4 text-cyan-600" />,    label: 'Architectures', value: project.architectureCount, href: '/architecture' },
    { icon: <GitBranch className="w-4 h-4 text-emerald-600" />, label: 'Pipelines', value: project.pipelineCount, href: '/pipelines' },
    { icon: <AlertTriangle className="w-4 h-4 text-amber-600" />, label: 'Open Incidents', value: project.incidentCount, href: '/incidents' },
  ];

  return (
    <div className="space-y-6">
      {/* Project metadata */}
      <div className="p-5 rounded-xl bg-card border border-border space-y-4">
        {editing ? (
          <div className="space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm font-bold bg-card border border-indigo-500/60 rounded-lg text-text-primary focus:outline-none"
            />
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              placeholder="Project description…"
              className="w-full px-3 py-2 text-xs bg-card border border-border rounded-lg text-text-primary placeholder-[#6B7280] focus:outline-none focus:border-indigo-500/60 resize-none"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} isLoading={updateMutation.isPending} leftIcon={<Save className="w-3.5 h-3.5" />}>
                Save
              </Button>
              <Button size="sm" variant="secondary" onClick={() => { setEditing(false); setName(project.name); setDesc(project.description ?? ''); }} leftIcon={<X className="w-3.5 h-3.5" />}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-base font-bold text-text-primary">{project.name}</h2>
                <Badge variant={STATUS_BADGE[project.status].variant} size="sm">
                  {STATUS_BADGE[project.status].label}
                </Badge>
              </div>
              {project.description ? (
                <p className="text-xs text-text-secondary leading-relaxed max-w-2xl">{project.description}</p>
              ) : (
                <p className="text-xs text-text-muted italic">No description — click Edit to add one.</p>
              )}
              <div className="flex items-center gap-3 mt-2 text-[10px] text-text-muted font-mono">
                <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                <span>·</span>
                <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
            {canEdit && (
              <Button size="sm" variant="secondary" onClick={() => setEditing(true)} leftIcon={<Edit2 className="w-3.5 h-3.5" />}>
                Edit
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Child resource stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <Link
            key={s.label}
            to={s.href}
            className="p-4 rounded-xl bg-card border border-border hover:border-border-highlight transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              {s.icon}
              <span className="text-2xl font-bold font-mono text-text-primary group-hover:text-indigo-600">{s.value}</span>
            </div>
            <p className="text-[10px] uppercase tracking-wide text-text-muted">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* AI context boundary explanation */}
      <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 flex gap-3">
        <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-xs font-semibold text-indigo-600">AI Context Boundary</p>
          <p className="text-[11px] text-indigo-600/70 leading-relaxed">
            AIDEN agents scoped to this project have access to all its schemas, pipeline definitions,
            architectures, incidents, runbooks, and previous fixes. Use the <strong>Ask AIDEN</strong> panel
            (Ctrl+Shift+A) while inside this project for contextually accurate responses.
          </p>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Redirect tab content — navigates to the full feature page           */
/* ------------------------------------------------------------------ */

const RedirectTab: React.FC<{ href: string; label: string; icon: React.ReactNode }> = ({ href, label, icon }) => (
  <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
    <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center text-indigo-600">
      {icon}
    </div>
    <div>
      <p className="text-sm font-semibold text-text-primary mb-1">{label}</p>
      <p className="text-xs text-text-secondary">This section lives in the global {label} page, filtered to this project.</p>
    </div>
    <Link
      to={href}
      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-indigo-500/15 border border-indigo-500/40 text-indigo-600 hover:bg-indigo-500/25 transition"
    >
      Open {label} <Layers className="w-3.5 h-3.5" />
    </Link>
  </div>
);

const AuditTab: React.FC = () => (
  <div className="space-y-2">
    <p className="text-[11px] text-text-muted px-1">Recent project-scoped actions (last 30 days)</p>
    {[
      { actor: 'Bharath', action: 'Deployed customer_360_etl pipeline', at: '2h ago', icon: <GitBranch className="w-3 h-3 text-emerald-600" /> },
      { actor: 'Akash',   action: 'Updated architecture blueprint',       at: '5h ago', icon: <Network className="w-3 h-3 text-cyan-600" /> },
      { actor: 'AIDEN',   action: 'Auto-resolved schema drift incident',  at: '8h ago', icon: <ShieldCheck className="w-3 h-3 text-indigo-600" /> },
      { actor: 'Dinesh',  action: 'Added PostgreSQL connection',          at: '1d ago', icon: <Layers className="w-3 h-3 text-amber-600" /> },
    ].map((entry, i) => (
      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
        <div className="w-7 h-7 rounded-md bg-card border border-border flex items-center justify-center shrink-0">
          {entry.icon}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-semibold text-text-primary">{entry.actor}</span>
          <span className="text-[11px] text-text-secondary"> — {entry.action}</span>
        </div>
        <span className="text-[10px] font-mono text-text-muted shrink-0">{entry.at}</span>
      </div>
    ))}
  </div>
);

/* ------------------------------------------------------------------ */
/* Project Detail Page                                                  */
/* ------------------------------------------------------------------ */

export const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  // Global project context (spec §21) — called before any early return so the
  // hook order stays stable across loading/error states.
  const { currentProject, setActiveProject } = useWorkspaceStore();
  const canEdit   = usePermission('requirements.create');
  const canDelete = usePermission('pipelines.deploy');

  const { data: project, isLoading, isError, error } = useProject(projectId);
  const deleteMutation = useDeleteProject();

  const handleDelete = async () => {
    if (!project) return;
    if (window.confirm(`Delete "${project.name}"? This cannot be undone.`)) {
      await deleteMutation.mutateAsync(project.id);
      navigate('/projects');
    }
  };

  if (isLoading) {
    return (
      <PageContainer
        breadcrumbs={[{ label: 'AIDEN' }, { label: 'Projects', path: '/projects' }, { label: '…' }]}
      >
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-40" />
        </div>
      </PageContainer>
    );
  }

  if (isError || !project) {
    return (
      <PageContainer breadcrumbs={[{ label: 'AIDEN' }, { label: 'Projects', path: '/projects' }, { label: 'Error' }]}>
        <div className="p-6 rounded-xl border border-red-500/30 bg-red-500/10 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-red-600 mx-auto" />
          <p className="text-sm font-semibold text-text-primary">Project not found</p>
          <p className="text-xs text-text-secondary">{(error as Error)?.message ?? 'The project may have been deleted.'}</p>
          <Button size="sm" variant="secondary" onClick={() => navigate('/projects')}>
            <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Back to Projects
          </Button>
        </div>
      </PageContainer>
    );
  }

  const tabs = buildTabs(project);

  const isActiveContext = currentProject?.id === project.id;

  const actions = (
    <div className="flex items-center gap-2">
      {isActiveContext ? (
        <Badge variant="ai" size="sm">
          <Sparkles className="w-3 h-3 mr-1" /> Active AI Context
        </Badge>
      ) : (
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            setActiveProject({ id: project.id, name: project.name, workspaceId: project.workspaceId })
          }
          leftIcon={<Sparkles className="w-3.5 h-3.5 text-indigo-600" />}
          title="Scope Ask AIDEN and project-aware lists to this project"
        >
          Set as AI Context
        </Button>
      )}
      {canDelete && (
        <Button
          size="sm"
          variant="secondary"
          onClick={handleDelete}
          isLoading={deleteMutation.isPending}
          leftIcon={<Trash2 className="w-3.5 h-3.5 text-red-600" />}
          className="text-red-600 hover:text-red-600"
        >
          Delete
        </Button>
      )}
      <Badge variant={STATUS_BADGE[project.status].variant} size="sm">
        {STATUS_BADGE[project.status].label}
      </Badge>
    </div>
  );

  return (
    <PageContainer
      title={project.name}
      description={project.description ?? 'Data engineering project context'}
      actions={actions}
      breadcrumbs={[
        { label: 'AIDEN' },
        { label: 'Projects', path: '/projects' },
        { label: project.name },
      ]}
    >
      {/* Tab bar */}
      <div className="flex items-center gap-0.5 border-b border-border -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-2.5 text-[11px] font-medium border-b-2 transition-all whitespace-nowrap shrink-0',
              activeTab === tab.id
                ? 'border-indigo-500 text-text-primary'
                : 'border-transparent text-text-muted hover:text-text-secondary hover:border-border-highlight'
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-indigo-500/20 text-indigo-600 font-mono">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="pt-2">
        {activeTab === 'overview'     && <OverviewTab project={project} canEdit={canEdit} />}
        {activeTab === 'workspace'    && <RedirectTab href="/workspace"      label="AIDEN Command Workspace" icon={<MessageSquare className="w-5 h-5" />} />}   
        {activeTab === 'architecture' && <RedirectTab href="/architecture"  label="Architecture Studio" icon={<Network className="w-5 h-5" />} />}
        {activeTab === 'pipelines'    && <RedirectTab href="/pipelines"     label="Pipeline Builder" icon={<GitBranch className="w-5 h-5" />} />}
        {activeTab === 'incidents'    && <RedirectTab href="/incidents"     label="Incidents" icon={<AlertTriangle className="w-5 h-5" />} />}
        {activeTab === 'knowledge'    && <RedirectTab href="/knowledge"     label="Knowledge / RAG" icon={<BookOpen className="w-5 h-5" />} />}
        {activeTab === 'agents'       && <RedirectTab href="/agents"        label="Agent Control Center" icon={<Bot className="w-5 h-5" />} />}
        {activeTab === 'team'         && <RedirectTab href="/team"          label="Team" icon={<Users className="w-5 h-5" />} />}
        {activeTab === 'audit'        && <AuditTab />}
      </div>
    </PageContainer>
  );
};

export default ProjectDetailPage;
