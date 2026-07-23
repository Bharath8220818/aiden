import api from './index';
import type { AnalyticsKPI, PerformancePoint, CostCategory, PipelinePerformance } from '../types/analytics';

export const analyticsApi = {
  getDashboard: async (period: string = '30D'): Promise<{
    kpis: AnalyticsKPI;
    performance: PerformancePoint[];
    costs: CostCategory[];
    pipelines: PipelinePerformance[];
  }> => {
    const response = await api.get(`/api/v1/analytics/dashboard?period=${period}`);
    return response.data;
  },

  getPipelineMetrics: async (pipelineId: number): Promise<any> => {
    const response = await api.get(`/api/v1/analytics/pipelines/${pipelineId}`);
    return response.data;
  },

  exportReport: async (format: 'csv' | 'pdf', period: string): Promise<Blob> => {
    const response = await api.get(`/api/v1/analytics/export?format=${format}&period=${period}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};
