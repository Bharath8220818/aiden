import api from './index';
import type { AuditFilter, AuditResponse } from '../types/audit';

export const auditApi = {
  list: async (filters: AuditFilter): Promise<AuditResponse> => {
    const response = await api.get('/api/v1/audit', { params: filters });
    return response.data;
  },

  exportCSV: async (filters: AuditFilter): Promise<Blob> => {
    const response = await api.get('/api/v1/audit/export', {
      params: filters,
      responseType: 'blob',
    });
    return response.data;
  },
};
