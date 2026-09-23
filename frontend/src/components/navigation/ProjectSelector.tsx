import React from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useProjectsList } from '@/features/projects/hooks/useProjects';
import { Dropdown } from '@/components/ui/Dropdown';
import { ChevronDown, Check, Plus, FolderOpen, MessagesSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Global project context selector (spec §21) — sits in the Topbar next to the
 * workspace/environment selectors. The chosen project becomes AIDEN's AI
 * context boundary: Ask AIDEN prompts carry it, and project-aware list
 * queries (requirements, architectures, pipelines fleet) filter to it.
 *
 * Header ↔ Command Workspace link: choosing a project here and hitting
 * "Work with AIDEN" jumps straight into the workspace with that project as
 * the conversation's context boundary (every chat request carries projectId).
 */
export const ProjectSelector: React.FC = () => {
  const navigate = useNavigate();
  const { currentProject, setActiveProject } = useWorkspaceStore();
  const { data: projects = [], isLoading } = useProjectsList();

  const trigger = (
    <button
      className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-card-hover text-left transition-colors border border-transparent hover:border-border"
      aria-label="Select project context"
    >
      <div className="w-5 h-5 rounded bg-indigo-500/20 text-indigo-600 flex items-center justify-center">
        <FolderOpen className="w-3.5 h-3.5" />
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-text-primary leading-none max-w-[140px] truncate">
          {currentProject ? currentProject.name : 'All Projects'}
        </span>
      </div>
      <ChevronDown className="w-3.5 h-3.5 text-text-secondary" />
    </button>
  );

  return (
    <Dropdown trigger={trigger} align="left" className="w-64">
      <div className="p-2 border-b border-border">
        <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
          Project Context
        </p>
      </div>
      <div className="p-1 space-y-1 max-h-72 overflow-y-auto">
        {/* Workspace-wide scope */}
        <button
          onClick={() => setActiveProject(null)}
          className="w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-md text-text-primary hover:bg-card-active transition-colors text-left"
        >
          <span className="font-medium text-sm text-text-primary">All Projects</span>
          {currentProject === null && <Check className="w-4 h-4 text-indigo-600" />}
        </button>

        {isLoading && (
          <p className="px-2.5 py-2 text-[11px] text-text-muted">Loading projects…</p>
        )}

        {projects.map((project) => (
          <button
            key={project.id}
            onClick={() =>
              setActiveProject({
                id: project.id,
                name: project.name,
                workspaceId: project.workspaceId,
              })
            }
            className="w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-md text-text-primary hover:bg-card-active transition-colors text-left"
          >
            <div className="flex flex-col min-w-0">
              <span className="font-medium text-sm text-text-primary truncate">
                {project.name}
              </span>
              {project.description && (
                <span className="text-[11px] text-text-secondary truncate">
                  {project.description}
                </span>
              )}
            </div>
            {currentProject?.id === project.id && (
              <Check className="w-4 h-4 text-indigo-600 shrink-0" />
            )}
          </button>
        ))}

        {projects.length === 0 && !isLoading && (
          <p className="px-2.5 py-2 text-[11px] text-text-muted">No projects yet.</p>
        )}
      </div>
      <div className="p-1 border-t border-border">
        <button
          onClick={() => {
            setActiveProject(null);
            navigate('/workspace');
          }}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-text-primary hover:bg-card-active rounded-md transition-colors"
        >
          <MessagesSquare className="w-3.5 h-3.5 text-indigo-600" />
          <span>Work with AIDEN — workspace-wide</span>
        </button>
        {currentProject && (
          <button
            onClick={() => navigate('/workspace')}
            data-testid="open-workspace-for-project"
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-indigo-600 hover:text-indigo-600 hover:bg-indigo-500/10 rounded-md transition-colors"
          >
            <MessagesSquare className="w-3.5 h-3.5" />
            <span className="truncate">Work with AIDEN on “{currentProject.name}”</span>
          </button>
        )}
        <button
          onClick={() => navigate('/projects')}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-indigo-600 hover:text-indigo-600 hover:bg-card-active rounded-md transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Manage Projects</span>
        </button>
      </div>
    </Dropdown>
  );
};
