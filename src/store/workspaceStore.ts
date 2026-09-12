import { create } from 'zustand';
import { Workspace, Environment } from '@/types/common';
import { WORKSPACES } from '@/lib/constants';

interface WorkspaceState {
  currentWorkspace: Workspace;
  currentEnvironment: Environment;
  workspaces: Workspace[];
  setWorkspace: (workspace: Workspace) => void;
  setEnvironment: (env: Environment) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  currentWorkspace: WORKSPACES[0],
  currentEnvironment: 'development',
  workspaces: WORKSPACES,
  setWorkspace: (workspace) => set({ currentWorkspace: workspace }),
  setEnvironment: (env) => set({ currentEnvironment: env }),
}));
