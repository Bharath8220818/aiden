/* ------------------------------------------------------------------ */
/* Pipelines                                                           */
/* ------------------------------------------------------------------ */

export type PipelineStatus = 'running' | 'healthy' | 'degraded' | 'paused' | 'failed' | 'draft';
export type PipelineCadence = 'continuous' | 'hourly' | 'daily' | 'weekly' | 'manual';

export interface Pipeline {
  id: string;
  name: string;
  description: string;
  status: PipelineStatus;
  cadence: PipelineCadence;
  source: string;
  target: string;
  owner: string;
  tags: string[];
  slaMinutes: number;
  lastRunAt: string;
  nextRunAt: string | null;
  stats: {
    successRate24h: number; // percent
    avgDurationMin: number;
    runsToday: number;
    rowsProcessed24h: number;
  };
}

/* ------------------------------------------------------------------ */
/* Runs                                                                */
/* ------------------------------------------------------------------ */

export type RunStatus = 'success' | 'running' | 'failed' | 'queued' | 'skipped';

export interface PipelineRun {
  id: string;
  pipelineId: string;
  status: RunStatus;
  startedAt: string;
  finishedAt: string | null;
  durationMin: number | null;
  trigger: 'schedule' | 'manual' | 'backfill' | 'retry' | 'event';
  rowsProcessed: number;
  bytesProcessed: string;
  warehouse: string;
  costUsd: number;
  attempt: number;
}

/* ------------------------------------------------------------------ */
/* Tasks within a run                                                  */
/* ------------------------------------------------------------------ */

export type TaskStatus = 'success' | 'running' | 'failed' | 'queued' | 'skipped' | 'up_for_retry';

export interface RunTask {
  id: string;
  name: string;
  status: TaskStatus;
  durationSec: number | null;
  startedAt: string | null;
  taskType: 'extract' | 'transform' | 'load' | 'quality_check' | 'notify';
  retryCount: number;
  error?: { type: string; message: string };
}

/* ------------------------------------------------------------------ */
/* Logs                                                                */
/* ------------------------------------------------------------------ */

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface RunLogEntry {
  id: string;
  ts: string;
  level: LogLevel;
  task: string;
  message: string;
}

/* ------------------------------------------------------------------ */
/* Detail bundle                                                       */
/* ------------------------------------------------------------------ */

export interface PipelineDetail {
  pipeline: Pipeline;
  runs: PipelineRun[];
  latestTasks: RunTask[];
  logs: RunLogEntry[];
}
