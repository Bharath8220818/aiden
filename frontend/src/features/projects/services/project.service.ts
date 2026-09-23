import { api } from '@/services/api';
import {
  Project,
  ProjectCreate,
  ProjectUpdate,
  ProjectListResponse,
} from '../types';

const isMockEnabled = () => import.meta.env.VITE_ENABLE_MOCK_DATA !== 'false';

/* ------------------------------------------------------------------ */
/* Endpoints — backend app/api/v1/projects.py                          */
/*   GET    /projects                  → ProjectListResponse           */
/*   POST   /projects                  → Project                       */
/*   GET    /projects/{id}             → Project                       */
/*   PATCH  /projects/{id}             → Project                       */
/*   DELETE /projects/{id}             → 204                           */
/* ------------------------------------------------------------------ */

/** Map the snake_case backend response to camelCase frontend shape. */
function mapProject(raw: Record<string, unknown>): Project {
  return {
    id: raw.id as string,
    workspaceId: (raw.workspace_id ?? raw.workspaceId) as string,
    name: raw.name as string,
    description: (raw.description ?? null) as string | null,
    status: (raw.status ?? 'active') as Project['status'],
    createdBy: (raw.created_by ?? raw.createdBy ?? null) as string | null,
    createdAt: (raw.created_at ?? raw.createdAt) as string,
    updatedAt: (raw.updated_at ?? raw.updatedAt) as string,
    requirementCount: ((raw.requirement_count ?? raw.requirementCount ?? 0) as number),
    architectureCount: ((raw.architecture_count ?? raw.architectureCount ?? 0) as number),
    pipelineCount: ((raw.pipeline_count ?? raw.pipelineCount ?? 0) as number),
    incidentCount: ((raw.incident_count ?? raw.incidentCount ?? 0) as number),
  };
}

/* -------- Mock data (used when VITE_ENABLE_MOCK_DATA !== 'false') -- */

const MOCK_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    workspaceId: 'ws-1',
    name: 'Acme Data Platform',
    description: 'Central data lake and analytics platform for Acme Corp.',
    status: 'active',
    createdBy: null,
    createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    requirementCount: 12,
    architectureCount: 4,
    pipelineCount: 18,
    incidentCount: 3,
  },
  {
    id: 'proj-2',
    workspaceId: 'ws-1',
    name: 'Customer 360',
    description: 'Unified customer view from CRM, support, and billing systems.',
    status: 'active',
    createdBy: null,
    createdAt: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    requirementCount: 8,
    architectureCount: 2,
    pipelineCount: 9,
    incidentCount: 1,
  },
  {
    id: 'proj-3',
    workspaceId: 'ws-1',
    name: 'Real-Time Fraud Detection',
    description: 'Kafka-based streaming pipeline for transaction anomaly detection.',
    status: 'active',
    createdBy: null,
    createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    requirementCount: 6,
    architectureCount: 3,
    pipelineCount: 5,
    incidentCount: 2,
  },
  {
    id: 'proj-4',
    workspaceId: 'ws-1',
    name: 'Retail Analytics',
    description: 'Sales, inventory and demand forecasting data warehouse.',
    status: 'active',
    createdBy: null,
    createdAt: new Date(Date.now() - 45 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    requirementCount: 15,
    architectureCount: 6,
    pipelineCount: 22,
    incidentCount: 0,
  },
];

/* -------- API calls ---------------------------------------------- */

export async function fetchProjects(workspaceId?: string): Promise<Project[]> {
  if (isMockEnabled()) {
    await new Promise((r) => setTimeout(r, 300));
    return MOCK_PROJECTS;
  }
  const params = workspaceId ? `?workspace_id=${workspaceId}` : '';
  const res = await api.get<ProjectListResponse>(`/projects${params}`);
  return res.items.map((item) => mapProject(item as unknown as Record<string, unknown>));
}

export async function fetchProject(projectId: string): Promise<Project> {
  if (isMockEnabled()) {
    await new Promise((r) => setTimeout(r, 200));
    const found = MOCK_PROJECTS.find((p) => p.id === projectId) ?? MOCK_PROJECTS[0];
    return { ...found };
  }
  const raw = await api.get<Record<string, unknown>>(`/projects/${projectId}`);
  return mapProject(raw);
}

export async function createProject(payload: ProjectCreate): Promise<Project> {
  if (isMockEnabled()) {
    await new Promise((r) => setTimeout(r, 400));
    const newProject: Project = {
      id: `proj-${Date.now()}`,
      workspaceId: payload.workspace_id,
      name: payload.name,
      description: payload.description ?? null,
      status: 'active',
      createdBy: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      requirementCount: 0,
      architectureCount: 0,
      pipelineCount: 0,
      incidentCount: 0,
    };
    MOCK_PROJECTS.unshift(newProject);
    return newProject;
  }
  const raw = await api.post<Record<string, unknown>>('/projects', payload);
  return mapProject(raw);
}

export async function updateProject(projectId: string, payload: ProjectUpdate): Promise<Project> {
  if (isMockEnabled()) {
    await new Promise((r) => setTimeout(r, 300));
    const idx = MOCK_PROJECTS.findIndex((p) => p.id === projectId);
    if (idx !== -1) {
      MOCK_PROJECTS[idx] = {
        ...MOCK_PROJECTS[idx],
        ...payload,
        updatedAt: new Date().toISOString(),
      };
      return { ...MOCK_PROJECTS[idx] };
    }
    return MOCK_PROJECTS[0];
  }
  const raw = await api.patch<Record<string, unknown>>(`/projects/${projectId}`, payload);
  return mapProject(raw);
}

export async function deleteProject(projectId: string): Promise<void> {
  if (isMockEnabled()) {
    await new Promise((r) => setTimeout(r, 300));
    const idx = MOCK_PROJECTS.findIndex((p) => p.id === projectId);
    if (idx !== -1) MOCK_PROJECTS.splice(idx, 1);
    return;
  }
  await api.delete(`/projects/${projectId}`);
}
