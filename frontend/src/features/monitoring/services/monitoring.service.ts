import { api } from '@/services/api';
import { InfraService, MetricSeries, KafkaTopic, QualityCheck, MonitoringAlert } from '../types';
import {
  MOCK_SERVICES,
  MOCK_SERIES,
  MOCK_TOPICS,
  MOCK_QUALITY_CHECKS,
  MOCK_ALERTS,
} from '../mockData';

const isMockEnabled = () => import.meta.env.VITE_ENABLE_MOCK_DATA !== 'false';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchServices(): Promise<InfraService[]> {
  if (!isMockEnabled()) return api.get('/monitoring/services');
  await delay(250);
  return MOCK_SERVICES.map((s) => ({ ...s }));
}

export async function fetchSeries(): Promise<MetricSeries[]> {
  if (!isMockEnabled()) return api.get('/monitoring/series');
  await delay(200);
  return MOCK_SERIES.map((s) => ({ ...s, points: [...s.points] }));
}

export async function fetchTopics(): Promise<KafkaTopic[]> {
  if (!isMockEnabled()) return api.get('/monitoring/kafka/topics');
  await delay(220);
  return MOCK_TOPICS.map((t) => ({ ...t }));
}

export async function fetchQualityChecks(): Promise<QualityCheck[]> {
  if (!isMockEnabled()) return api.get('/monitoring/quality');
  await delay(200);
  return MOCK_QUALITY_CHECKS.map((q) => ({ ...q }));
}

export async function fetchAlerts(): Promise<MonitoringAlert[]> {
  if (!isMockEnabled()) return api.get('/monitoring/alerts');
  await delay(180);
  return MOCK_ALERTS.map((a) => ({ ...a }));
}

export async function acknowledgeAlertApi(alertId: string): Promise<void> {
  if (!isMockEnabled()) {
    await api.post(`/monitoring/alerts/${alertId}/acknowledge`);
    return;
  }
  await delay(250);
}
