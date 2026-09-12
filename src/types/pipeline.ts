export type PipelineStatus = 'running' | 'successful' | 'failed' | 'queued' | 'paused' | 'auto_healed';

export interface PipelineSummary {
  id: string;
  name: string;
  status: PipelineStatus;
  schedule: string;
  lastRunTime: string;
  duration: string;
  owner: string;
  environment: string;
}
