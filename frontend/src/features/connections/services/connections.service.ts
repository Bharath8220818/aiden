import { api } from '@/services/api';
import {
  ConnectionProvider,
  DataConnection,
  TestConnectionResult,
  HealthCheckStep,
} from '../types';
import { PROVIDERS, SEED_CONNECTIONS } from '../mockData';

const isMockEnabled = () => import.meta.env.VITE_ENABLE_MOCK_DATA !== 'false';

/* ------------------------------------------------------------------ */
/* Catalog & CRUD                                                      */
/* ------------------------------------------------------------------ */

export async function fetchProviders(): Promise<ConnectionProvider[]> {
  if (!isMockEnabled()) return api.get('/connections/providers');
  await new Promise((r) => setTimeout(r, 150));
  return PROVIDERS;
}

export async function fetchConnections(): Promise<DataConnection[]> {
  if (!isMockEnabled()) return api.get('/connections');
  await new Promise((r) => setTimeout(r, 250));
  return SEED_CONNECTIONS.map((c) => ({ ...c, credentials: { ...c.credentials } }));
}

function maskCredentials(credentials: DataConnection['credentials']): DataConnection['credentials'] {
  const masked: DataConnection['credentials'] = {};
  Object.entries(credentials).forEach(([k, v]) => {
    masked[k] = /password|secret|token|json|key/i.test(k) ? '•••••••• (vault)' : v;
  });
  return masked;
}

export async function saveConnection(connection: DataConnection): Promise<DataConnection> {
  if (!isMockEnabled()) return api.post('/connections', connection);
  await new Promise((r) => setTimeout(r, 400));
  // Secrets would be vaulted server-side; mask before returning
  return { ...connection, credentials: maskCredentials(connection.credentials) };
}

export function deleteConnectionId(id: string): Promise<void> {
  if (!isMockEnabled()) return api.delete(`/connections/${id}`);
  return new Promise((resolve) => setTimeout(resolve, 300));
}

/* ------------------------------------------------------------------ */
/* Health check simulation                                             */
/* ------------------------------------------------------------------ */

function buildCheckSteps(connection: Partial<DataConnection>): HealthCheckStep[] {
  return [
    { id: 'dns', label: 'Resolve host & network path', status: 'pending' },
    { id: 'tls', label: `TLS ${connection.sslEnabled ? '(encrypted)' : '(disabled — not recommended)'}`, status: 'pending' },
    { id: 'auth', label: `Authenticate via ${connection.authType?.replace('_', ' ') ?? 'credentials'}`, status: 'pending' },
    { id: 'query', label: 'Execute validation query', status: 'pending' },
    { id: 'introspect', label: 'Introspect schemas & tables', status: 'pending' },
  ];
}

export async function testConnection(connection: Partial<DataConnection>): Promise<TestConnectionResult> {
  if (!isMockEnabled()) return api.post('/connections/test', connection);

  const steps = buildCheckSteps(connection);
  const startedAt = Date.now();
  const stepDelays = [260, 340, 520, 480, 620];
  const latencyBase = 12 + Math.round(Math.random() * 80);

  for (let i = 0; i < steps.length; i += 1) {
    steps[i] = { ...steps[i], status: 'running' };
    await new Promise((r) => setTimeout(r, stepDelays[i]));
    // Simulate a 1-in-6 chance of auth failure for demo realism
    const authFailed = steps[i].id === 'auth' && connection.id === 'conn-bq-marketing';
    if (authFailed) {
      steps[i] = { ...steps[i], status: 'failed', detail: 'Invalid or expired service-account credentials (401 Unauthorized).' };
      return {
        success: false,
        steps,
        latencyMs: Date.now() - startedAt,
        testedAt: new Date().toISOString(),
      };
    }
    steps[i] = {
      ...steps[i],
      status: 'passed',
      detail:
        steps[i].id === 'query'
          ? `SELECT 1 → 1 row (${latencyBase} ms)`
          : steps[i].id === 'introspect'
          ? `${3 + Math.floor(Math.random() * 40)} schemas / ${12 + Math.floor(Math.random() * 300)} tables`
          : undefined,
    };
  }

  return {
    success: true,
    steps,
    latencyMs: latencyBase,
    testedAt: new Date().toISOString(),
  };
}

export function connectionSummaryStats(connections: DataConnection[]) {
  return {
    total: connections.length,
    connected: connections.filter((c) => c.status === 'connected').length,
    degraded: connections.filter((c) => c.status === 'degraded').length,
    disconnected: connections.filter((c) => c.status === 'disconnected').length,
    pipelines: connections.reduce((sum, c) => sum + c.stats.pipelinesUsing, 0),
  };
}
