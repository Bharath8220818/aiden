import { api } from '@/services/api';
import {
  Incident,
  Diagnosis,
  ProposedFix,
  SandboxTest,
  HealingRun,
  HealingStage,
  HealingTimelineEvent,
} from '../types';
import { MOCK_INCIDENTS, buildDiagnosis, buildProposedFix, buildSandboxResult } from '../mockData';

const isMockEnabled = () => import.meta.env.VITE_ENABLE_MOCK_DATA !== 'false';
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchIncidents(): Promise<Incident[]> {
  if (!isMockEnabled()) return api.get('/incidents');
  await delay(250);
  return MOCK_INCIDENTS.map((i) => ({ ...i }));
}

export async function diagnoseIncident(incident: Incident): Promise<Diagnosis> {
  if (!isMockEnabled()) return api.post(`/incidents/${incident.id}/diagnose`);
  await delay(1800);
  return buildDiagnosis(incident);
}

export async function generateFix(incident: Incident): Promise<ProposedFix> {
  if (!isMockEnabled()) return api.post(`/incidents/${incident.id}/fix`);
  await delay(1600);
  return buildProposedFix(incident);
}

export async function runSandboxTest(fix: ProposedFix, onStage: (stage: SandboxTest['stage']) => void): Promise<SandboxTest> {
  if (!isMockEnabled()) return api.post('/sandbox/test', { fixId: fix.id });

  const stages: SandboxTest['stage'][] = ['cloning', 'replaying', 'regression'];
  for (const stage of stages) {
    onStage(stage);
    await delay(1300);
  }
  onStage('passed');
  await delay(200);
  return buildSandboxResult(fix);
}

/* ------------------------------------------------------------------ */
/* Healing run state machine                                           */
/* ------------------------------------------------------------------ */

const STAGE_FLOW: { stage: HealingStage; label: string; actor: 'AIDEN' | 'human' }[] = [
  { stage: 'detected', label: 'Failure detected', actor: 'AIDEN' },
  { stage: 'investigating', label: 'Agents investigating', actor: 'AIDEN' },
  { stage: 'root_cause', label: 'Root cause isolated', actor: 'AIDEN' },
  { stage: 'generating_fix', label: 'Fix synthesized', actor: 'AIDEN' },
  { stage: 'sandbox_testing', label: 'Sandbox verification', actor: 'AIDEN' },
  { stage: 'awaiting_approval', label: 'Awaiting engineer approval', actor: 'human' },
  { stage: 'deploying', label: 'Deploying patch', actor: 'AIDEN' },
  { stage: 'rerunning', label: 'Re-running pipeline', actor: 'AIDEN' },
  { stage: 'monitoring', label: 'Post-heal monitoring', actor: 'AIDEN' },
  { stage: 'learned', label: 'Knowledge captured — loop closed', actor: 'AIDEN' },
];

export function createHealingRun(incident: Incident): HealingRun {
  return {
    id: `heal-${incident.id}`,
    incidentId: incident.id,
    stage: 'detected',
    timeline: [
      {
        id: 'ev-0',
        stage: 'detected',
        label: STAGE_FLOW[0].label,
        detail: `${incident.errorSignature} on ${incident.pipelineName} (${incident.occurrences}×)`,
        at: incident.detectedAt,
        actor: 'AIDEN',
      },
    ],
    startedAt: new Date().toISOString(),
    autonomyLevel: 'approval_required',
  };
}

export async function advanceStage(
  run: HealingRun,
  targetStage: HealingStage,
  extraDetail?: string
): Promise<HealingRun> {
  if (!isMockEnabled()) {
    return api.post(`/healing/${run.id}/advance`, { targetStage });
  }

  const flowItem = STAGE_FLOW.find((s) => s.stage === targetStage);
  if (!flowItem) return run;

  await delay(900);

  const event: HealingTimelineEvent = {
    id: `ev-${Date.now().toString(36)}`,
    stage: targetStage,
    label: flowItem.label,
    detail: extraDetail ?? defaultDetailFor(targetStage),
    at: new Date().toISOString(),
    actor: flowItem.actor,
  };

  return {
    ...run,
    stage: targetStage,
    timeline: [...run.timeline, event],
  };
}

function defaultDetailFor(stage: HealingStage): string {
  switch (stage) {
    case 'investigating':
      return '4 specialist agents correlated logs, lineage, run history, and dependencies.';
    case 'root_cause':
      return 'Root cause isolated with 97% confidence; blast radius computed.';
    case 'generating_fix':
      return 'AST-level patch synthesized with idempotency key + dedup guard.';
    case 'sandbox_testing':
      return 'Production snapshot cloned; 1.2M events replayed; 5/5 assertions passed.';
    case 'awaiting_approval':
      return 'Patch requires engineer sign-off (medium risk, backfill required).';
    case 'deploying':
      return 'Patch deployed via zero-downtime rolling update.';
    case 'rerunning':
      return 'Pipeline re-run started from the failed checkpoint.';
    case 'monitoring':
      return 'Observing for 15 minutes — quality gates green, latency nominal.';
    case 'learned':
      return 'Root-cause pattern written to knowledge base for future prevention.';
    default:
      return '';
  }
}

export async function resolveIncidentApi(incidentId: string, mttrMinutes: number): Promise<void> {
  if (!isMockEnabled()) {
    await api.post(`/incidents/${incidentId}/resolve`, { mttrMinutes });
    return;
  }
  await delay(300);
}
