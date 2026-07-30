export interface Agent {
  id: number;
  name: string;
  status: 'ready' | 'training' | 'error';
  accuracy: number;
  latency: string;
  requests: number;
  color: string;
  description?: string;
  version?: string;
  lastTrained?: string;
}

export interface AgentMetrics {
  agentId: number;
  responseTime: number[];
  successRate: number;
  errorRate: number;
  totalInferences: number;
  avgTokensUsed: number;
}

export interface TrainingConfig {
  agentId: number;
  epochs: number;
  batchSize: number;
  learningRate: number;
  datasetPath: string;
  use4bit?: boolean;
}

export interface TrainingJob {
  id: string;
  agentId: number;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  startedAt: string;
  completedAt?: string;
  loss?: number;
  accuracy?: number;
  error?: string;
}
