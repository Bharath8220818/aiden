import React, { useState } from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { Dropdown } from '@/components/ui/Dropdown';
import { ChevronDown, Check, Plus, FolderKanban, Loader2 } from 'lucide-react';
import { createWorkspace } from '@/features/workspace/services/workspaceAdmin.service';
import { usePermission } from '@/features/auth/hooks/useAuth';

export const WorkspaceSelector: React.FC = () => {
  const { currentWorkspace, workspaces, setWorkspace, hydrateWorkspaces } = useWorkspaceStore();
  const canCreate = usePermission('workspace.create');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trigger = (
    <button className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-card-hover text-left transition-colors border border-transparent hover:border-border">
      <div className="w-5 h-5 rounded bg-indigo-500/20 text-indigo-600 flex items-center justify-center font-bold text-xs">
        <FolderKanban className="w-3.5 h-3.5" />
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-text-primary leading-none max-w-[140px] truncate">
          {currentWorkspace.name}
        </span>
      </div>
      <ChevronDown className="w-3.5 h-3.5 text-text-secondary" />
    </button>
  );

  return (
    <Dropdown trigger={trigger} align="left" className="w-64">
      <div className="p-2 border-b border-border">
        <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
          Workspaces
        </p>
      </div>
      <div className="p-1 space-y-1">
        {workspaces.map((ws) => (
          <button
            key={ws.id}
            onClick={() => setWorkspace(ws)}
            className="w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-md text-text-primary hover:bg-card-active transition-colors text-left"
          >
            <div className="flex flex-col">
              <span className="font-medium text-sm text-text-primary">{ws.name}</span>
              <span className="text-[11px] text-text-secondary">
                {ws.pipelinesCount} pipelines • {ws.role}
              </span>
            </div>
            {ws.id === currentWorkspace.id && (
              <Check className="w-4 h-4 text-indigo-600" />
            )}
          </button>
        ))}
      </div>
      <div className="p-1 border-t border-border">
        {canCreate ? (
          <button
            disabled={creating}
            onClick={async () => {
              const name = window.prompt('New workspace name');
              if (!name || !name.trim()) return;
              setCreating(true);
              setError(null);
              try {
                await createWorkspace(name.trim());
                await hydrateWorkspaces();
              } catch (e) {
                setError((e as Error)?.message ?? 'Could not create workspace');
              } finally {
                setCreating(false);
              }
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-indigo-600 hover:text-indigo-600 hover:bg-card-active rounded-md transition-colors disabled:opacity-50"
          >
            {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{creating ? 'Creating…' : 'New Workspace'}</span>
          </button>
        ) : (
          <p className="px-2.5 py-1.5 text-[11px] text-text-muted">Lead or admin can create workspaces</p>
        )}
        {error && <p className="px-2.5 py-1 text-[11px] text-red-600">{error}</p>}
      </div>
    </Dropdown>
  );
};
