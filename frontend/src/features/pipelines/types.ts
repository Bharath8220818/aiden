/* ------------------------------------------------------------------ */
/* Code generation targets                                             */
/* ------------------------------------------------------------------ */

export type CodeTarget = 'pyspark' | 'sql' | 'airflow_dag' | 'kafka_config' | 'tests';

export interface GeneratedFile {
  target: CodeTarget;
  fileName: string;
  language: 'python' | 'sql' | 'yaml' | 'markdown';
  content: string;
  lineCount: number;
}

/* ------------------------------------------------------------------ */
/* Pipeline configuration                                              */
/* ------------------------------------------------------------------ */

export type ExecutionMode = 'streaming' | 'micro_batch' | 'scheduled_batch';
export type ScheduleCadence = 'continuous' | 'hourly' | 'daily' | 'weekly';
export type WriteStrategy = 'append' | 'merge_upsert' | 'full_refresh' | 'scd2';

export interface PipelineConfig {
  pipelineName: string;
  executionMode: ExecutionMode;
  schedule: ScheduleCadence;
  sourceSystem: string;
  targetSystem: string;
  writeStrategy: WriteStrategy;
  batchSize: string;
  retryPolicy: {
    maxRetries: number;
    backoff: 'linear' | 'exponential';
    timeoutMinutes: number;
  };
  qualityChecksEnabled: boolean;
  piiMaskingEnabled: boolean;
  alertingChannel: 'slack' | 'pagerduty' | 'email' | 'none';
  slaFreshnessMinutes: number;
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

export type CodeValidationSeverity = 'error' | 'warning' | 'passed';

export interface CodeValidationCheck {
  id: string;
  severity: CodeValidationSeverity;
  category: 'Syntax' | 'Schema' | 'Performance' | 'Governance' | 'Reliability';
  title: string;
  message: string;
}

export interface CodeValidationReport {
  passed: boolean;
  checkedAt: string;
  checks: CodeValidationCheck[];
  estimatedCostPerMonth: number;
  estimatedRuntimeMinutes: number;
}

/* ------------------------------------------------------------------ */
/* Deployment                                                          */
/* ------------------------------------------------------------------ */

export type DeploymentStage =
  | 'idle'
  | 'compiling'
  | 'running_tests'
  | 'provisioning'
  | 'deploying'
  | 'verifying'
  | 'deployed'
  | 'failed';

export interface DeploymentStep {
  id: string;
  label: string;
  detail: string;
}

export interface DeploymentRun {
  stage: DeploymentStage;
  currentStepIndex: number;
  steps: DeploymentStep[];
  startedAt: string | null;
  finishedAt: string | null;
  deployedVersion: string | null;
  error?: string;
}

/* ------------------------------------------------------------------ */
/* Builder state                                                       */
/* ------------------------------------------------------------------ */

export interface PipelineSpecSummary {
  nodeCount: number;
  edgeCount: number;
  sources: string[];
  sinks: string[];
  hasQualityGate: boolean;
}
