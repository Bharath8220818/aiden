import { api } from '@/services/api';
import { OverviewDashboardData } from '../types';
import { mockOverviewData } from '../mockData';

export const overviewService = {
  async getDashboardData(): Promise<OverviewDashboardData> {
    const isMockEnabled = import.meta.env.VITE_ENABLE_MOCK_DATA !== 'false';

    try {
      if (!isMockEnabled) {
        return await api.get<OverviewDashboardData>('/overview');
      }
    } catch (err) {
      console.warn('[Overview Service] Falling back to mock dataset:', err);
    }

    // Simulate minor network latency for realistic feel
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockOverviewData);
      }, 250);
    });
  },
};
