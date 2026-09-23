import { api } from '@/services/api';
import {
  PipelineConfig,
  CodeValidationReport,
  CodeValidationCheck,
  DeploymentRun,
  DeploymentStage,
  DeploymentStep,
  GeneratedFile,
} from '../types';
import {
  buildAllFiles,
  DEFAULT_PIPELINE_CONFIG,
  PIPELINE_NAME_REGEX,
} from '../mockData';

const isMockEnabled = () => import.meta.env.VITE_ENABLE_MOCK_DATA !== 'false';

/* ------------------------------------------------------------------ */
/* Code generation                                                     */
/* ------------------------------------------------------------------ */

export async function generatePipelineCode(
  config: PipelineConfig,
  graph: { nodeCount: number; edgeCount: number; sources: string[]; sinks: string[]; hasQualityGate: boolean }
): Promise<GeneratedFile[]> {
  if (!isMockEnabled()) {
    return api.post('/pipelines/generate', { config, graph });
  }

  await new Promise((resolve) => setTimeout(resolve, 1600));
  return buildAllFiles(config, graph.sources, graph.sinks);
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

export function validatePipelineConfig(config: PipelineConfig, hasQualityGate: boolean): CodeValidationReport {
  const checks: CodeValidationCheck[] = [];

  // Naming convention
  checks.push({
    id: 'chk-naming',
    severity: PIPELINE_NAME_REGEX.test(config.pipelineName) ? 'passed' : 'error',
    category: 'Syntax',
    title: 'Pipeline naming convention',
    message: PIPELINE_NAME_REGEX.test(config.pipelineName)
      ? `"${config.pipelineName}" matches snake_case naming standard.`
      : 'Pipeline name must be lowercase snake_case (3–49 chars, start with a letter).',
  });

  // Reliability: retries + timeout
  const reliabilityOk = config.retryPolicy.maxRetries >= 2 && config.retryPolicy.timeoutMinutes >= 10;
  checks.push({
    id: 'chk-reliability',
    severity: reliabilityOk ? 'passed' : 'warning',
    category: 'Reliability',
    title: 'Retry policy & timeout',
    message: reliabilityOk
      ? `${config.retryPolicy.maxRetries} retries with ${config.retryPolicy.backoff} backoff, ${config.retryPolicy.timeoutMinutes}m timeout.`
      : 'AIDEN recommends at least 2 retries and a timeout of 10+ minutes for production pipelines.',
  });

  // Quality gate
  checks.push({
    id: 'chk-quality',
    severity: config.qualityChecksEnabled && hasQualityGate ? 'passed' : 'warning',
    category: 'Governance',
    title: 'Quality gate enforcement',
    message:
      config.qualityChecksEnabled && hasQualityGate
        ? 'Great Expectations quality gate present in topology and enabled in configuration.'
        : !hasQualityGate
        ? 'No Quality Gate node in the architecture — assertions will run post-write only.'
        : 'Quality checks are disabled — failed records will be written to the target silently.',
  });

  // PII governance
  checks.push({
    id: 'chk-pii',
    severity: config.piiMaskingEnabled ? 'passed' : 'warning',
    category: 'Governance',
    title: 'PII masking policy',
    message: config.piiMaskingEnabled
      ? 'SHA-256 salted hashing applied to identified PII columns before write.'
      : 'PII masking disabled — verify no personal data flows through this pipeline.',
  });

  // SLA freshness
  checks.push({
    id: 'chk-sla',
    severity: config.slaFreshnessMinutes <= 60 ? 'passed' : 'warning',
    category: 'Reliability',
    title: 'Freshness SLA achievable',
    message:
      config.slaFreshnessMinutes <= 60
        ? `SLA of ${config.slaFreshnessMinutes} minutes is achievable with ${config.executionMode.replace('_', '-')} execution.`
        : 'Freshness SLA above 60 minutes may breach downstream data contract commitments.',
  });

  // Performance heuristics
  const streamingHeavy = config.executionMode === 'streaming' && config.slaFreshnessMinutes <= 5;
  checks.push({
    id: 'chk-perf',
    severity: 'passed',
    category: 'Performance',
    title: 'Execution mode fit',
    message: streamingHeavy
      ? 'Streaming execution matches the sub-5-minute freshness target.'
      : `Micro-batch / scheduled execution matches the ${config.slaFreshnessMinutes}-minute freshness target.`,
  });

  // Cost/runtime estimate
  const baseCost = 1450;
  const modeFactor = config.executionMode === 'streaming' ? 1.35 : config.executionMode === 'micro_batch' ? 1.0 : 0.7;
  const retryFactor = 1 + config.retryPolicy.maxRetries * 0.04;
  const estimatedCostPerMonth = Math.round(baseCost * modeFactor * retryFactor);
  const estimatedRuntimeMinutes = config.executionMode === 'streaming' ? 0 : config.executionMode === 'micro_batch' ? 6 : 42;

  return {
    passed: checks.every((c) => c.severity !== 'error'),
    checkedAt: new Date().toISOString(),
    checks,
    estimatedCostPerMonth,
    estimatedRuntimeMinutes,
  };
}

/* ------------------------------------------------------------------ */
/* Deployment orchestration simulation                                 */
/* ------------------------------------------------------------------ */

const DEPLOYMENT_STEPS: DeploymentStep[] = [
  { id: 'compile', label: 'Compile generated code', detail: 'PySpark job compiled and packaged as wheel' },
  { id: 'tests', label: 'Run unit test suite', detail: 'pytest suite passed — schema, PII, idempotency' },
  { id: 'provision', label: 'Provision resources', detail: 'Databricks job cluster + Kafka consumer group' },
  { id: 'deploy', label: 'Deploy to Airflow', detail: 'DAG deployed, scheduler picked up new version' },
  { id: 'verify', label: 'Verify first run', detail: 'Smoke-run completed, target mart updated' },
];

export function createInitialDeploymentRun(): DeploymentRun {
  return {
    stage: 'idle',
    currentStepIndex: -1,
    steps: DEPLOYMENT_STEPS,
    startedAt: null,
    finishedAt: null,
    deployedVersion: null,
  };
}

export async function runDeploymentSimulation(
  pipelineName: string,
  onStageChange: (run: DeploymentRun) => void
): Promise<DeploymentRun> {
  const startedAt = new Date().toISOString();
  let run: DeploymentRun = {
    stage: 'compiling',
    currentStepIndex: 0,
    steps: DEPLOYMENT_STEPS,
    startedAt,
    finishedAt: null,
    deployedVersion: null,
  };
  onStageChange(run);

  const stages: DeploymentStage[] = ['compiling', 'running_tests', 'provisioning', 'deploying', 'verifying', 'deployed'];

  for (let i = 0; i < stages.length; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 900));
    run = {
      ...run,
      stage: stages[i],
      currentStepIndex: Math.min(i, DEPLOYMENT_STEPS.length - 1),
    };
    onStageChange(run);
  }

  return {
    ...run,
    stage: 'deployed',
    currentStepIndex: DEPLOYMENT_STEPS.length - 1,
    finishedAt: new Date().toISOString(),
    deployedVersion: `v${new Date().getUTCFullYear()}.${String(new Date().getUTCMonth() + 1).padStart(2, '0')}.${String(new Date().getUTCDate()).padStart(2, '0')}-1`,
  };
}

// Re-export for hook convenience
export { DEFAULT_PIPELINE_CONFIG };
