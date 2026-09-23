import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MonitoringAlert } from '../types';
import {
  fetchServices,
  fetchSeries,
  fetchTopics,
  fetchQualityChecks,
  fetchAlerts,
  acknowledgeAlertApi,
} from '../services/monitoring.service';

export function useMonitoring() {
  const queryClient = useQueryClient();
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  const servicesQuery = useQuery({ queryKey: ['monitoring-services'], queryFn: fetchServices, refetchInterval: 15_000 });
  const seriesQuery = useQuery({ queryKey: ['monitoring-series'], queryFn: fetchSeries, refetchInterval: 15_000 });
  const topicsQuery = useQuery({ queryKey: ['monitoring-topics'], queryFn: fetchTopics, refetchInterval: 15_000 });
  const qualityQuery = useQuery({ queryKey: ['monitoring-quality'], queryFn: fetchQualityChecks, refetchInterval: 30_000 });
  const alertsQuery = useQuery({ queryKey: ['monitoring-alerts'], queryFn: fetchAlerts, refetchInterval: 15_000 });

  const services = servicesQuery.data ?? [];
  const alerts = alertsQuery.data ?? [];

  const acknowledgeAlert = useCallback(
    async (alertId: string) => {
      setAcknowledgingId(alertId);
      try {
        await acknowledgeAlertApi(alertId);
        queryClient.setQueryData<MonitoringAlert[]>(['monitoring-alerts'], (current) =>
          (current ?? []).map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a))
        );
        queryClient.invalidateQueries({ queryKey: ['monitoring-alerts'] });
      } finally {
        setAcknowledgingId(null);
      }
    },
    [queryClient]
  );

  const healthSummary = {
    overall: services.some((s) => s.status === 'down')
      ? 'down'
      : services.some((s) => s.status === 'degraded')
      ? 'degraded'
      : 'healthy',
    healthy: services.filter((s) => s.status === 'healthy').length,
    degraded: services.filter((s) => s.status === 'degraded').length,
    down: services.filter((s) => s.status === 'down').length,
    unacknowledgedAlerts: alerts.filter((a) => !a.acknowledged).length,
    criticalAlerts: alerts.filter((a) => a.severity === 'critical' && !a.acknowledged).length,
  };

  return {
    services,
    series: seriesQuery.data ?? [],
    topics: topicsQuery.data ?? [],
    qualityChecks: qualityQuery.data ?? [],
    alerts,
    healthSummary,
    isLoading:
      servicesQuery.isLoading ||
      seriesQuery.isLoading ||
      topicsQuery.isLoading ||
      qualityQuery.isLoading ||
      alertsQuery.isLoading,
    acknowledgingId,
    acknowledgeAlert,
  };
}
