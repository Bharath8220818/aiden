import { api } from './index';
import type { Agent, AgentMetrics, TrainingConfig, TrainingJob } from '../types/agents';

export const agentsApi = {
  list: () =>
    api.get<Agent[]>('/api/v1/agents').then(r => r.data),

  get: (id: number) =>
    api.get<Agent>(`/api/v1/agents/${id}`).then(r => r.data),

  getMetrics: (id: number, period = '7d') =>
    api.get<AgentMetrics>(`/api/v1/agents/${id}/metrics`, { params: { period } }).then(r => r.data),

  train: (config: TrainingConfig) =>
    api.post<TrainingJob>('/api/v1/agents/train', config).then(r => r.data),

  getTrainingJob: (jobId: string) =>
    api.get<TrainingJob>(`/api/v1/agents/training/${jobId}`).then(r => r.data),

  enable: (id: number) =>
    api.post(`/api/v1/agents/${id}/enable`).then(r => r.data),

  disable: (id: number) =>
    api.post(`/api/v1/agents/${id}/disable`).then(r => r.data),
};
