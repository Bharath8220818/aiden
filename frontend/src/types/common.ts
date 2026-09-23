export type StatusType = 'healthy' | 'warning' | 'error' | 'info' | 'active' | 'inactive';

export type Environment = 'development' | 'staging' | 'production';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: string;
  pipelinesCount: number;
}

/** Lightweight project reference for the shell's global project context.
 *  The active project scopes Ask AIDEN prompts and project-aware list queries. */
export interface ProjectRef {
  id: string;
  name: string;
  workspaceId: string;
}

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  total?: number;
}
