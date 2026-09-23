import { api } from '@/services/api';
import { Pipeline, PipelineDetail } from '../types';

const isMockEnabled = () => import.meta.env.VITE_ENABLE_MOCK_DATA !== 'false';

/* ------------------------------------------------------------------ */
/* Endpoints (backend app/api/v1/pipelines.py + pipeline_fleet_service) */
/*   GET  /pipelines/fleet          → Pipeline[] (manager shape)       */
/*   GET  /pipelines/{id}/detail    → PipelineDetail bundle            */
/*   POST /pipelines/{id}/run       → creates a run (trigger/retry)    */
/*   PATCH /pipelines/{id}          → status change (pause/resume)     */
/* ------------------------------------------------------------------ */

export async function fetchPipelines(projectId?: string): Promise<Pipeline[]> {
  if (!isMockEnabled()) {
    const query = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
    return api.get<Pipeline[]>(`/pipelines/fleet${query}`);
  }
  await new Promise((r) => setTimeout(r, 350));
  const { MOCK_PIPELINES } = await import('../mockData');
  return MOCK_PIPELINES.map((p) => ({ ...p }));
}

export async function fetchPipelineDetail(pipelineId: string): Promise<PipelineDetail> {
  if (!isMockEnabled()) return api.get<PipelineDetail>(`/pipelines/${pipelineId}/detail`);
  await new Promise((r) => setTimeout(r, 300));
  const { MOCK_PIPELINES, buildDetail } = await import('../mockData');
  const pipeline = MOCK_PIPELINES.find((p) => p.id === pipelineId) ?? MOCK_PIPELINES[0];
  return buildDetail(pipeline);
}

export type ControlAction = 'pause' | 'resume' | 'trigger' | 'retry' | 'clear';

export async function controlPipeline(pipelineId: string, action: ControlAction): Promise<Pipeline> {
  if (!isMockEnabled()) {
    switch (action) {
      case 'trigger':
      case 'retry': {
        // Backend creates a PipelineRun (201). Refetch fleet state afterwards.
        await api.post(`/pipelines/${pipelineId}/run`);
        return await refreshPipeline(pipelineId);
      }
      case 'pause':
      case 'resume':
      case 'clear': {
        const status = action === 'pause' ? 'paused' : 'active';
        await api.patch(`/pipelines/${pipelineId}`, { status });
        return await refreshPipeline(pipelineId);
      }
    }
  }

  // Mock path — optimistic local transition
  await new Promise((r) => setTimeout(r, 500));
  const { MOCK_PIPELINES } = await import('../mockData');
  const pipeline = MOCK_PIPELINES.find((p) => p.id === pipelineId) ?? MOCK_PIPELINES[0];
  const updated: Pipeline = { ...pipeline };
  switch (action) {
    case 'pause':
      updated.status = 'paused';
      updated.nextRunAt = null;
      break;
    case 'resume':
      updated.status = 'healthy';
      updated.nextRunAt = new Date(Date.now() + 5 * 60_000).toISOString();
      break;
    case 'trigger':
    case 'retry':
      updated.status = 'running';
      updated.lastRunAt = new Date().toISOString();
      updated.stats = { ...updated.stats, runsToday: updated.stats.runsToday + 1 };
      break;
    case 'clear':
      updated.status = 'healthy';
      break;
  }
  return updated;
}

/** The control endpoints mutate server state; the canonical row lives in the fleet listing. */
async function refreshPipeline(pipelineId: string): Promise<Pipeline> {
  const fleet = await api.get<Pipeline[]>('/pipelines/fleet');
  const updated = fleet.find((p) => p.id === pipelineId);
  if (updated) return updated;
  // Pipeline missing from fleet (e.g. deleted) — throw so the hook can surface the error.
  throw new Error(`Pipeline ${pipelineId} not found in fleet`);
}
