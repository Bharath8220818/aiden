export type PipelineStatus = 'draft' | 'pending' | 'running' | 'success' | 'failed' | 'paused' | 'cancelled';

export interface Pipeline {
  id: number;
  name: string;
  description: string;
  status: PipelineStatus;
  schedule: string;
  progress?: number;
  config: Record<string, any>;
  source_type: string;
  destination_type: string;
  created_by: number;
  created_at: string;
  updated_at?: string;
  last_run_at?: string;
  code?: string;
  dbt_code?: string;
  tests?: string[];
}

export interface PipelineExecution {
  id: number;
  pipeline_id: number;
  status: PipelineStatus;
  started_at: string;
  completed_at?: string;
  duration?: number;
  duration_seconds?: number;
  logs?: string[];
  error_message?: string;
  records_processed?: number;
  triggered_by?: string;
}

export interface PipelineCreateRequest {
  name: string;
  description: string;
  source_type: string;
  destination_type: string;
  schedule: string;
  config: Record<string, any>;
}

export interface RagSearchResult {
  query: string;
  parsed: Record<string, any>;
  score: number;
  pipeline_id: number | null;
}

export interface RagSearchResponse {
  results: RagSearchResult[];
  total: number;
}

export interface TestConnectionRequest {
  connection_string: string;
  db_type?: string;
  timeout_seconds?: number;
}

export interface TestConnectionResponse {
  success: boolean;
  db_type: string;
  tables: string[];
  error?: string | null;
}