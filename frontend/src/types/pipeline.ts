export type PipelineStatus = 'draft' | 'pending' | 'running' | 'success' | 'failed' | 'paused';

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
}

export interface PipelineExecution {
  id: number;
  pipeline_id: number;
  status: PipelineStatus;
  started_at: string;
  completed_at?: string;
  duration?: number;
  logs?: string[];
  error_message?: string;
  records_processed?: number;
}

export interface PipelineCreateRequest {
  name: string;
  description: string;
  source_type: string;
  destination_type: string;
  schedule: string;
  config: Record<string, any>;
}