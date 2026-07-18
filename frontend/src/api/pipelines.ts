import api from './index';
import type { Pipeline, PipelineExecution, PipelineCreateRequest } from '../types/pipeline';

export const pipelineApi = {
  // Create pipeline from prompt
  createFromPrompt: async (prompt: string): Promise<Pipeline> => {
    const response = await api.post('/api/v1/pipelines/from-prompt', { prompt });
    return response.data;
  },

  // Get all pipelines
  getAll: async (skip = 0, limit = 100): Promise<Pipeline[]> => {
    const response = await api.get(`/api/v1/pipelines?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  // Get single pipeline
  getById: async (id: number): Promise<Pipeline> => {
    const response = await api.get(`/api/v1/pipelines/${id}`);
    return response.data;
  },

  // Create pipeline
  create: async (data: PipelineCreateRequest): Promise<Pipeline> => {
    const response = await api.post('/api/v1/pipelines', data);
    return response.data;
  },

  // Update pipeline
  update: async (id: number, data: Partial<PipelineCreateRequest>): Promise<Pipeline> => {
    const response = await api.put(`/api/v1/pipelines/${id}`, data);
    return response.data;
  },

  // Delete pipeline
  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/v1/pipelines/${id}`);
  },

  // Run pipeline
  run: async (id: number): Promise<PipelineExecution> => {
    const response = await api.post(`/api/v1/pipelines/${id}/run`);
    return response.data;
  },

  // Get executions
  getExecutions: async (id: number, limit = 50): Promise<PipelineExecution[]> => {
    const response = await api.get(`/api/v1/pipelines/${id}/executions?limit=${limit}`);
    return response.data;
  },

  // Get execution logs
  getExecutionLogs: async (executionId: number): Promise<string[]> => {
    const response = await api.get(`/api/v1/executions/${executionId}/logs`);
    return response.data;
  },
};