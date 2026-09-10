import { api } from './index';

// ── Monitoring ───────────────────────────────────────────────────────────

export interface MonitoringOverview {
  pipelines: { total: number; healthy: number; warning: number; failed: number; draft: number };
  executions_24h: { total: number; success: number; failed: number; success_rate: number };
  incidents: { open: number; critical: number; error: number; warning: number; info: number };
  data_quality: { pass_rate: number; samples: number };
  generated_at: string;
}

export interface QualityResult {
  id: number;
  pipeline_id?: number;
  rule_name: string;
  status: 'passed' | 'warning' | 'failed';
  severity: string;
  metrics: Record<string, unknown>;
  details?: string;
  pass_rate: number;
  evaluated_at: string;
}

export const monitoringApi = {
  overview: () => api.get<MonitoringOverview>('/api/v1/monitoring/overview').then(r => r.data),
  quality: (params?: { project_id?: number; status?: string; limit?: number }) =>
    api.get<QualityResult[]>('/api/v1/monitoring/quality', { params }).then(r => r.data),
};

// ── Incidents ────────────────────────────────────────────────────────────

export interface Incident {
  id: number;
  incident_key: string;
  title: string;
  description?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  status: 'open' | 'investigating' | 'identified' | 'resolved' | 'closed';
  root_cause?: string;
  confidence: number;
  suggested_fix?: string;
  created_at: string;
  resolved_at?: string;
}

export const incidentsApi = {
  list: (params?: { status?: string; severity?: string; limit?: number }) =>
    api.get<Incident[]>('/api/v1/incidents', { params }).then(r => r.data),
  analyze: (id: number) => api.post(`/api/v1/incidents/${id}/analyze`).then(r => r.data),
  resolve: (id: number, notes: string, fix?: string) =>
    api.post(`/api/v1/incidents/${id}/resolve`, null, { params: { resolution_notes: notes, fix_applied: fix } }).then(r => r.data),
};

// ── Projects ─────────────────────────────────────────────────────────────

export interface Project {
  id: number;
  name: string;
  slug: string;
  description?: string;
  created_at: string;
}

export const projectsApi = {
  list: () => api.get<Project[]>('/api/v1/projects/').then(r => r.data),
  create: (data: { name: string; description?: string }) =>
    api.post<Project>('/api/v1/projects/', data).then(r => r.data),
};

// ── Connections ──────────────────────────────────────────────────────────

export interface Connection {
  id: number;
  project_id: number;
  name: string;
  tool_type: string;
  status: string;
  last_health_check?: { status: string; latency_ms: number };
  created_at: string;
}

export const connectionsApi = {
  list: (projectId: number) =>
    api.get<Connection[]>('/api/v1/connections/', { params: { project_id: projectId } }).then(r => r.data),
  test: (id: number) => api.post(`/api/v1/connections/${id}/test`).then(r => r.data),
};

// ── Memory ───────────────────────────────────────────────────────────────

export interface MemoryStats {
  conversation?: Record<string, unknown>;
  project?: Record<string, unknown>;
  knowledge?: Record<string, unknown>;
  vector_store?: Record<string, unknown>;
}

export interface KnowledgeResult {
  score: number;
  payload: { content: string; source_type: string; source_ref?: string };
}

export const memoryApi = {
  stats: () => api.get<MemoryStats>('/api/v1/memory/stats').then(r => r.data),
  search: (query: string, topK = 5) =>
    api.post<{ results: KnowledgeResult[] }>('/api/v1/memory/knowledge/search', { query, top_k: topK }).then(r => r.data),
};
