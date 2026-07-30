import api from './index';
import type { Approval } from '../types/approval';

export const approvalsApi = {
  getAll: async (status?: string): Promise<Approval[]> => {
    const response = await api.get('/api/v1/approvals', { params: { status } });
    return response.data;
  },
  getById: async (id: number): Promise<Approval> => {
    const response = await api.get(`/api/v1/approvals/${id}`);
    return response.data;
  },
  approve: async (id: number, comment?: string): Promise<Approval> => {
    const response = await api.post(`/api/v1/approvals/${id}/approve`, { comment });
    return response.data;
  },
  reject: async (id: number, comment?: string): Promise<Approval> => {
    const response = await api.post(`/api/v1/approvals/${id}/reject`, { comment });
    return response.data;
  },
};
