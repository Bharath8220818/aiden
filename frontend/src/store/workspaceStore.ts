import { create } from 'zustand';
import { api } from '@/services/api';
import { Workspace, Environment, ProjectRef } from '@/types/common';
import { WORKSPACES } from '@/lib/constants';

interface WorkspaceState {
  currentWorkspace: Workspace;
  currentEnvironment: Environment;
  workspaces: Workspace[];
  /** Active project — the AI context boundary (spec §4/§20/§21).
   *  `null` = workspace-wide scope (no project selected). */
  currentProject: ProjectRef | null;
  setWorkspace: (workspace: Workspace) => void;
  setEnvironment: (env: Environment) => void;
  setActiveProject: (project: ProjectRef | null) => void;
  /** Load real workspaces from the backend; keeps the mock constant only as
   *  an offline fallback so demo mode never breaks. */
  hydrateWorkspaces: () => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  currentWorkspace: WORKSPACES[0],
  currentEnvironment: 'development',
  workspaces: WORKSPACES,
  currentProject: null,
  setWorkspace: (workspace) =>
    // A project belongs to exactly one workspace — switching workspaces invalidates it.
    set({ currentWorkspace: workspace, currentProject: null }),
  setEnvironment: (env) => set({ currentEnvironment: env }),
  setActiveProject: (project) => set({ currentProject: project }),
  hydrateWorkspaces: async () => {
    // Skip on public surfaces (landing, auth popup) — the request would
    // 401 and only add console noise for signed-out visitors.
    try {
      const rawAuth = localStorage.getItem('aiden-auth');
      if (!rawAuth) return;
    } catch {
      return;
    }
    try {
      const res = await api.get<{ items?: Array<Record<string, unknown>> }>('/workspaces?limit=100');
      const items = res.items ?? [];
      if (!items.length) return; // keep fallback
      const real: Workspace[] = items.map((w) => ({
        id: String(w.id),
        name: String(w.name),
        slug: String(w.slug ?? ''),
        role: String(w.role ?? 'Member'),
        pipelinesCount: Number(w.member_count ?? w.pipelinesCount ?? 0),
      }));
      const current = get().currentWorkspace;
      const next = real.find((w) => w.id === current.id) ?? real[0];
      const project = get().currentProject;
      set({
        workspaces: real,
        currentWorkspace: next,
        // A stale mock-workspace project ref is meaningless once the real
        // workspace lands — clear it unless the project's workspace matches.
        currentProject: project && project.workspaceId === next.id ? project : null,
      });
    } catch {
      /* offline / mock mode — constants already in place */
    }
  },
}));
