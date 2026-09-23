import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useProjectsList, useCreateProject, useDeleteProject } from '@/features/projects/hooks/useProjects';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { usePermission } from '@/features/auth/hooks/useAuth';
import { Project, ProjectCreate } from '@/features/projects/types';
import { ImportFolderModal } from '@/features/projects/components/ImportFolderModal';
import { cn } from '@/lib/utils';
import {
  Plus,
  FolderOpen,
  FolderUp,
  GitBranch,
  AlertTriangle,
  ChevronRight,
  Layers,
  MessagesSquare,
  Network,
  FileText,
  Sparkles,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* New Project Modal (inline, no external dep)                         */
/* ------------------------------------------------------------------ */

interface NewProjectModalProps {
  workspaceId: string;
  onClose: () => void;
  onCreate: (payload: ProjectCreate) => Promise<void>;
  isPending: boolean;
}

const NewProjectModal: React.FC<NewProjectModalProps> = ({
  workspaceId,
  onClose,
  onCreate,
  isPending,
}) => {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onCreate({ workspace_id: workspaceId, name: name.trim(), description: desc.trim() || undefined });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <form
        className="w-full max-w-md bg-card border border-border rounded-xl p-6 space-y-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
            <FolderOpen className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <h2 className="text-sm font-bold text-text-primary">New Project</h2>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide">
            Project Name <span className="text-red-600">*</span>
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Customer 360"
            maxLength={255}
            className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg text-text-primary placeholder-[#6B7280] focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Description</label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="What data engineering goal does this project serve?"
            rows={3}
            maxLength={2000}
            className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg text-text-primary placeholder-[#6B7280] focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-border text-text-secondary hover:text-text-primary transition"
          >
            Cancel
          </button>
          <Button
            type="submit"
            size="sm"
            isLoading={isPending}
            disabled={!name.trim() || isPending}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Create Project
          </Button>
        </div>
      </form>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Project Card                                                         */
/* ------------------------------------------------------------------ */

const STATUS_BADGE: Record<Project['status'], { variant: 'success' | 'neutral' | 'warning'; label: string }> = {
  active:   { variant: 'success', label: 'Active' },
  draft:    { variant: 'neutral', label: 'Draft' },
  archived: { variant: 'warning', label: 'Archived' },
};

interface ProjectCardProps {
  project: Project;
  onOpen: () => void;
  onDelete: (id: string) => void;
  canDelete: boolean;
  onWorkWithAiden: (project: Project) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onOpen, onDelete, canDelete, onWorkWithAiden }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const badge = STATUS_BADGE[project.status];

  const stats = [
    { icon: <FileText className="w-3 h-3" />, value: project.requirementCount, label: 'requirements' },
    { icon: <Network className="w-3 h-3" />, value: project.architectureCount, label: 'architectures' },
    { icon: <GitBranch className="w-3 h-3" />, value: project.pipelineCount, label: 'pipelines' },
    { icon: <AlertTriangle className="w-3 h-3" />, value: project.incidentCount, label: 'incidents', warn: project.incidentCount > 0 },
  ];

  return (
    <div
      className="group relative p-5 rounded-xl bg-card border border-border hover:border-indigo-500/40 transition-all cursor-pointer space-y-3"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      aria-label={`Open project ${project.name}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0 group-hover:bg-indigo-500/25 transition">
            <FolderOpen className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-text-primary truncate group-hover:text-indigo-600">
              {project.name}
            </h3>
            <p className="text-[10px] text-text-muted font-mono">
              {new Date(project.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant={badge.variant} size="sm">{badge.label}</Badge>
          {canDelete && (
            <div className="relative">
              <button
                className="opacity-0 group-hover:opacity-100 p-1 rounded text-text-muted hover:text-text-primary hover:bg-card-hover transition-all"
                onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                aria-label="Project actions"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 top-7 z-20 w-40 bg-card border border-border rounded-lg shadow-xl py-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-indigo-600 hover:bg-indigo-500/10 transition"
                    onClick={() => { setMenuOpen(false); onWorkWithAiden(project); }}
                  >
                    <MessagesSquare className="w-3 h-3" /> Work with AIDEN
                  </button>
                  <button
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-red-600 hover:bg-red-500/10 transition"
                    onClick={() => { setMenuOpen(false); onDelete(project.id); }}
                  >
                    <Trash2 className="w-3 h-3" /> Delete project
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-[11px] text-text-secondary leading-relaxed line-clamp-2">
          {project.description}
        </p>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-3 flex-wrap pt-0.5">
        {stats.map((s) => (
          <span
            key={s.label}
            className={cn(
              'flex items-center gap-1 text-[10px] font-mono',
              s.warn && s.value > 0 ? 'text-amber-600' : 'text-text-muted'
            )}
          >
            {s.icon}
            {s.value} {s.label}
          </span>
        ))}
        <ChevronRight className="w-3.5 h-3.5 text-text-muted ml-auto opacity-0 group-hover:opacity-100 transition" />
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Projects Page                                                        */
/* ------------------------------------------------------------------ */

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspaceStore();
  const canCreate = usePermission('requirements.create'); // engineer+
  const canDelete = usePermission('pipelines.deploy');    // lead+
  const [showCreate, setShowCreate] = useState(false);
  const [importTarget, setImportTarget] = useState<Project | null>(null);
  const [search, setSearch] = useState('');

  const { data: projects = [], isLoading, isError, error, refetch } = useProjectsList(currentWorkspace.id);
  const createMutation = useCreateProject();
  const deleteMutation = useDeleteProject();

  const filtered = projects.filter(
    (p) =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (payload: ProjectCreate) => {
    await createMutation.mutateAsync(payload);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this project? This cannot be undone.')) {
      deleteMutation.mutate(id);
    }
  };

  const actions = (
    <div className="flex items-center gap-2">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search projects…"
        className="h-8 px-3 text-xs bg-card border border-border rounded-lg text-text-primary placeholder-[#6B7280] focus:outline-none focus:border-indigo-500/60 transition w-44"
      />
      {canCreate && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            const first = projects[0];
            if (first) setImportTarget(first);
            else setShowCreate(true);
          }}
          leftIcon={<FolderUp className="w-3.5 h-3.5" />}
        >
          Import Existing Project
        </Button>
      )}
      {canCreate && (
        <Button
          size="sm"
          onClick={() => setShowCreate(true)}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          New Project
        </Button>
      )}
    </div>
  );

  return (
    <PageContainer
      title="Projects"
      description={`${filtered.length} project${filtered.length !== 1 ? 's' : ''} in ${currentWorkspace.name} — each project is an isolated AI context boundary`}
      actions={actions}
      breadcrumbs={[
        { label: 'AIDEN' },
        { label: currentWorkspace.name, path: '/dashboard' },
        { label: 'Projects' },
      ]}
    >
      {/* Context boundary explainer */}
      <div className="p-3.5 rounded-lg bg-indigo-500/5 border border-indigo-500/20 flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <p className="text-[11px] text-indigo-600/80 leading-relaxed">
          Each project is AIDEN's <span className="font-semibold text-indigo-600">AI context boundary</span> — schemas,
          pipelines, architectures, incidents, runbooks, and previous fixes are all scoped here. This makes agent
          retrieval (RAG) and diagnosis significantly more accurate.
        </p>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="p-6 rounded-xl border border-red-500/30 bg-red-500/10 text-center space-y-2">
          <AlertTriangle className="w-7 h-7 text-red-600 mx-auto" />
          <p className="text-sm text-text-primary font-semibold">Failed to load projects</p>
          <p className="text-xs text-text-secondary">{(error as Error)?.message ?? 'Unknown error'}</p>
          <Button size="sm" variant="secondary" onClick={() => refetch()}>Retry</Button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && filtered.length === 0 && (
        <EmptyState
          icon={<FolderOpen className="w-6 h-6" />}
          title={search ? `No projects match "${search}"` : 'No projects yet'}
          description={
            search
              ? 'Try adjusting your search term.'
              : 'Create your first project to start defining data engineering requirements and architectures.'
          }
          actionLabel={canCreate && !search ? 'Create First Project' : undefined}
          onAction={canCreate && !search ? () => setShowCreate(true) : undefined}
        />
      )}

      {/* Grid */}
      {!isLoading && !isError && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onOpen={() => navigate(`/projects/${project.id}`)}
              onDelete={handleDelete}
              canDelete={canDelete}
              onWorkWithAiden={(p) =>
                navigate(`/workspace?p=${encodeURIComponent(`/projects/${p.id}`)}&projectId=${p.id}&projectName=${encodeURIComponent(p.name)}`)
              }
            />
          ))}
        </div>
      )}

      {/* Stats footer */}
      {!isLoading && projects.length > 0 && (
        <div className="flex items-center gap-4 pt-2 border-t border-border">
          {[
            { icon: <Layers className="w-3.5 h-3.5" />, label: 'Total pipelines', value: projects.reduce((s, p) => s + p.pipelineCount, 0) },
            { icon: <FileText className="w-3.5 h-3.5" />, label: 'Requirements', value: projects.reduce((s, p) => s + p.requirementCount, 0) },
            { icon: <AlertTriangle className="w-3.5 h-3.5" />, label: 'Open incidents', value: projects.reduce((s, p) => s + p.incidentCount, 0) },
          ].map((s) => (
            <span key={s.label} className="flex items-center gap-1.5 text-[11px] text-text-muted">
              {s.icon}
              <span className="font-mono text-text-secondary">{s.value}</span> {s.label} across all projects
            </span>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <NewProjectModal
          workspaceId={currentWorkspace.id}
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
          isPending={createMutation.isPending}
        />
      )}

      {/* Import Existing Project modal (folder → RAG knowledge) */}
      {importTarget && (
        <ImportFolderModal
          projectId={importTarget.id}
          projectName={importTarget.name}
          onClose={() => setImportTarget(null)}
        />
      )}
    </PageContainer>
  );
};

export default ProjectsPage;
