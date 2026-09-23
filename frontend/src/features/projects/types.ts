/* ------------------------------------------------------------------ */
/* Projects — TypeScript types matching backend app/schemas/project.py */
/* ------------------------------------------------------------------ */

export type ProjectStatus = 'draft' | 'active' | 'archived';

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  // child-resource counts (populated server-side)
  requirementCount: number;
  architectureCount: number;
  pipelineCount: number;
  incidentCount: number;
}

export interface ProjectCreate {
  workspace_id: string;
  name: string;
  description?: string;
}

export interface ProjectUpdate {
  name?: string;
  description?: string;
  status?: ProjectStatus;
}

export interface ProjectListResponse {
  items: Project[];
  total: number;
  skip: number;
  limit: number;
}
