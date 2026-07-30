import api from './index';

export const analyticsApi = {
  getDashboard: async (period: string = '30D') => {
    const response = await api.get(`/api/v1/analytics/dashboard?period=${period}`);
    return response.data;
  },
  getPipelineMetrics: async (pipelineId: number) => {
    const response = await api.get(`/api/v1/analytics/pipelines/${pipelineId}`);
    return response.data;
  },
  exportReport: async (format: 'csv' | 'pdf', period: string) => {
    const response = await api.get(`/api/v1/analytics/export?format=${format}&period=${period}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};
