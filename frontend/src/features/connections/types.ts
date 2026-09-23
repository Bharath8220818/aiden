/* ------------------------------------------------------------------ */
/* Provider catalog                                                    */
/* ------------------------------------------------------------------ */

export type ConnectionCategory = 'warehouse' | 'database' | 'streaming' | 'compute' | 'cloud';

export type AuthType = 'user_password' | 'key_pair' | 'oauth' | 'service_account' | 'iam_role' | 'sasl';

export interface ProviderField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'number' | 'select';
  placeholder?: string;
  required: boolean;
  options?: string[];
  helper?: string;
}

export interface ConnectionProvider {
  id: string;
  name: string;
  category: ConnectionCategory;
  technology: string;
  description: string;
  authTypes: AuthType[];
  defaultPort?: number;
  fields: ProviderField[];
}

/* ------------------------------------------------------------------ */
/* Connections                                                         */
/* ------------------------------------------------------------------ */

export type ConnectionStatus = 'connected' | 'degraded' | 'disconnected' | 'testing';

export interface ConnectionCredentials {
  [key: string]: string;
}

export interface DataConnection {
  id: string;
  name: string;
  providerId: string;
  providerName: string;
  category: ConnectionCategory;
  environment: 'development' | 'staging' | 'production';
  status: ConnectionStatus;
  host: string;
  port?: number;
  database?: string;
  authType: AuthType;
  credentials: ConnectionCredentials;
  sslEnabled: boolean;
  createdAt: string;
  lastCheckedAt: string;
  latencyMs: number | null;
  stats: {
    pipelinesUsing: number;
    tablesIntrospected: number;
    monthlyQueryCount: number;
  };
  lastError?: string;
}

/* ------------------------------------------------------------------ */
/* Health check                                                        */
/* ------------------------------------------------------------------ */

export interface HealthCheckStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  detail?: string;
}

export interface TestConnectionResult {
  success: boolean;
  steps: HealthCheckStep[];
  latencyMs: number;
  testedAt: string;
}
