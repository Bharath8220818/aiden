/* ------------------------------------------------------------------ */
/* Incidents                                                           */
/* ------------------------------------------------------------------ */

export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';

export type IncidentStatus =
  | 'detected'
  | 'investigating'
  | 'fix_proposed'
  | 'awaiting_approval'
  | 'healing'
  | 'resolved'
  | 'dismissed';

export interface Incident {
  id: string;
  title: string;
  pipelineName: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  detectedAt: string;
  detectedBy: 'anomaly_detector' | 'quality_gate' | 'task_failure' | 'schema_drift_watcher';
  affectedDownstream: string[];
  mttrMinutes: number | null;
  errorSignature: string;
  errorMessage: string;
  occurrences: number;
}

/* ------------------------------------------------------------------ */
/* Diagnosis (Detect → Investigate → Root Cause)                       */
/* ------------------------------------------------------------------ */

export interface DiagnosisStep {
  id: string;
  agent: string;
  action: string;
  finding: string;
  status: 'completed' | 'running' | 'queued';
  durationMs: number;
}

export interface RootCause {
  title: string;
  confidence: number; // 0-100
  category: 'schema_drift' | 'data_volume' | 'dependency' | 'infra_resource' | 'code_defect' | 'credentials';
  explanation: string;
  evidence: { source: string; detail: string }[];
}

export interface Diagnosis {
  incidentId: string;
  steps: DiagnosisStep[];
  rootCause: RootCause;
  blastRadius: {
    downstreamPipelines: string[];
    dashboardsAffected: string[];
    estimatedStaleDataMinutes: number;
  };
}

/* ------------------------------------------------------------------ */
/* Generated fix                                                       */
/* ------------------------------------------------------------------ */

export type FixStrategy = 'code_patch' | 'config_change' | 'schema_migration' | 'scale_resources' | 'backfill';

export interface FixPatch {
  fileName: string;
  language: 'python' | 'sql' | 'yaml';
  before: string;
  after: string;
}

export interface ProposedFix {
  id: string;
  strategy: FixStrategy;
  strategyLabel: string;
  summary: string;
  patches: FixPatch[];
  riskLevel: 'low' | 'medium' | 'high';
  estimatedFixMinutes: number;
  requiresBackfill: boolean;
  backfillWindow: string | null;
}

/* ------------------------------------------------------------------ */
/* Sandbox verification                                                */
/* ------------------------------------------------------------------ */

export type SandboxStage = 'idle' | 'cloning' | 'replaying' | 'regression' | 'passed' | 'failed';

export interface SandboxTest {
  stage: SandboxStage;
  replaysProcessed: number;
  assertions: { name: string; passed: boolean; detail: string }[];
  productionSnapshot: boolean;
  logTail: string[];
}

/* ------------------------------------------------------------------ */
/* Healing workflow state machine                                      */
/* ------------------------------------------------------------------ */

export type HealingStage =
  | 'detected'
  | 'investigating'
  | 'root_cause'
  | 'generating_fix'
  | 'sandbox_testing'
  | 'awaiting_approval'
  | 'deploying'
  | 'rerunning'
  | 'monitoring'
  | 'learned'
  | 'failed';

export interface HealingTimelineEvent {
  id: string;
  stage: Exclude<HealingStage, 'detected'> | HealingStage;
  label: string;
  detail: string;
  at: string;
  actor: 'AIDEN' | 'human';
}

export interface HealingRun {
  id: string;
  incidentId: string;
  stage: HealingStage;
  timeline: HealingTimelineEvent[];
  startedAt: string;
  autonomyLevel: 'full_auto' | 'approval_required' | 'manual_only';
}
