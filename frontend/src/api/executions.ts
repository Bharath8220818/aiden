import { api } from './index';

export interface Execution {
  id: number;
  pipeline_id: number;
  user_id: number;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  triggered_by: string;
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
  error_message?: string;
  logs?: string;
  records_processed?: number;
}

export const executionsApi = {
  getExecution: (id: number) =>
    api.get<Execution>(`/api/v1/executions/${id}`).then(r => r.data),

  getPipelineExecutions: (pipelineId: number, limit = 50) =>
    api.get<Execution[]>(`/api/v1/pipelines/${pipelineId}/executions`, { params: { limit } }).then(r => r.data),

  getLogs: (executionId: number) =>
    api.get<string>(`/api/v1/executions/${executionId}/logs`).then(r => r.data),

  cancel: (executionId: number) =>
    api.post(`/api/v1/executions/${executionId}/cancel`).then(r => r.data),
};
