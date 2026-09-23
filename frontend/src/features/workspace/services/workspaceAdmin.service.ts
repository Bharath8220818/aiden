import { api } from '@/services/api';

export interface CreatedWorkspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

/** POST /workspaces — create a workspace (lead/admin). */
export async function createWorkspace(name: string, description?: string): Promise<CreatedWorkspace> {
  return api.post<CreatedWorkspace>('/workspaces', {
    name,
    description: description || undefined,
  });
}
