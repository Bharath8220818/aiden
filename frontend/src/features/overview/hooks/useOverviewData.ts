import { useQuery } from '@tanstack/react-query';
import { overviewService } from '../services/overview.service';
import { OverviewDashboardData } from '../types';

export function useOverviewData() {
  return useQuery<OverviewDashboardData, Error>({
    queryKey: ['overview-dashboard'],
    queryFn: () => overviewService.getDashboardData(),
    refetchInterval: 30000, // Background refresh every 30s
    staleTime: 10000,
  });
}
