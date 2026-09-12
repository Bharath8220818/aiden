export type StatusType = 'healthy' | 'warning' | 'error' | 'info' | 'active' | 'inactive';

export type Environment = 'development' | 'staging' | 'production';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: string;
  pipelinesCount: number;
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
