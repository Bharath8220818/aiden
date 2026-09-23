import { api } from '@/services/api';
import { Agent, SwarmMessage, KnowledgeDoc, McpServer, McpServerStatus } from '../types';
import { MOCK_AGENTS, MOCK_SWARM_MESSAGES, MOCK_DOCS, MOCK_MCP_SERVERS, buildRetrieval } from '../mockData';
import { RetrievedChunk } from '../types';

const isMockEnabled = () => import.meta.env.VITE_ENABLE_MOCK_DATA !== 'false';
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ---------------- agents ---------------- */

export async function fetchAgents(): Promise<Agent[]> {
  if (!isMockEnabled()) return api.get('/agents');
  await delay(280);
  return MOCK_AGENTS.map((a) => ({ ...a }));
}

export async function fetchSwarmMessages(): Promise<SwarmMessage[]> {
  if (!isMockEnabled()) return api.get('/agents/swarm');
  await delay(180);
  return MOCK_SWARM_MESSAGES.map((m) => ({ ...m }));
}

export async function toggleAgentStatus(agentId: string, paused: boolean): Promise<Agent> {
  if (!isMockEnabled()) return api.post(`/agents/${agentId}/status`, { paused });
  await delay(320);
  const agent = MOCK_AGENTS.find((a) => a.id === agentId) ?? MOCK_AGENTS[0];
  return { ...agent, status: paused ? 'paused' : 'idle' };
}

export async function updateToolGrant(
  agentId: string,
  tool: string,
  enabled: boolean
): Promise<Agent> {
  if (!isMockEnabled()) return api.post(`/agents/${agentId}/grants`, { tool, enabled });
  await delay(260);
  const agent = MOCK_AGENTS.find((a) => a.id === agentId) ?? MOCK_AGENTS[0];
  return {
    ...agent,
    toolGrants: agent.toolGrants.map((g) => (g.tool === tool ? { ...g, enabled } : g)),
  };
}

/* ---------------- orchestrator (11-stage workflow) ---------------- */

export interface OrchestratorStage {
  no: number;
  id: string;
  label: string;
  agent: string;
}

export interface AgentRun {
  id: string;
  workflow: string;
  status: 'running' | 'success' | 'failed' | 'canceled';
  prompt: string | null;
  currentStage: string | null;
  stageIndex: number;
  stages: OrchestratorStage[] | null;
  outputs: Record<string, { status: string; summary?: string; error?: string; [k: string]: unknown }> | null;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export async function startOrchestration(workflow: string, prompt?: string): Promise<AgentRun> {
  if (!isMockEnabled()) return api.post(`/agents/orchestrate/${workflow}`, { prompt });
  // Mock mode: simulate a fast successful loop through the real stage list.
  await delay(1800);
  const stages: OrchestratorStage[] = [
    { no: 1, id: 'requirement_analysis', label: 'Requirement Analysis', agent: 'agent-architect' },
    { no: 2, id: 'data_source_discovery', label: 'Data Source Discovery', agent: 'agent-orchestrator' },
    { no: 3, id: 'schema_analysis', label: 'Schema Analysis', agent: 'agent-architect' },
    { no: 4, id: 'pipeline_design', label: 'Pipeline Design', agent: 'agent-architect' },
    { no: 5, id: 'code_generation', label: 'Code Generation', agent: 'agent-builder' },
    { no: 6, id: 'data_quality', label: 'Data Quality', agent: 'agent-qa' },
    { no: 7, id: 'validation_testing', label: 'Validation & Testing', agent: 'agent-qa' },
    { no: 8, id: 'deployment', label: 'Deployment', agent: 'agent-builder' },
    { no: 9, id: 'monitoring_observability', label: 'Monitoring & Observability', agent: 'agent-orchestrator' },
    { no: 10, id: 'drift_anomaly_detection', label: 'Schema Drift & Anomaly Detection', agent: 'agent-healer' },
    { no: 11, id: 'self_healing_recovery', label: 'Self-Healing & Recovery', agent: 'agent-healer' },
  ];
  return {
    id: `run-${Date.now()}`,
    workflow,
    status: 'success',
    prompt: prompt ?? null,
    currentStage: 'self_healing_recovery',
    stageIndex: 11,
    stages,
    outputs: Object.fromEntries(
      stages.map((s) => [s.id, { status: 'done', summary: `${s.label} completed (demo mode)` }])
    ),
    error: null,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
  };
}

/* ---------------- knowledge / RAG ---------------- */

export async function fetchKnowledgeDocs(): Promise<KnowledgeDoc[]> {
  if (!isMockEnabled()) return api.get('/knowledge/docs');
  await delay(240);
  return MOCK_DOCS.map((d) => ({ ...d }));
}

export async function retrieveFromKnowledge(query: string): Promise<RetrievedChunk[]> {
  if (!isMockEnabled()) return api.post('/knowledge/retrieve', { query });
  await delay(900);
  return buildRetrieval(query);
}

/* ---------------- MCP ---------------- */

export async function fetchMcpServers(): Promise<McpServer[]> {
  if (!isMockEnabled()) return api.get('/integrations/mcp');
  await delay(260);
  return MOCK_MCP_SERVERS.map((s) => ({ ...s }));
}

export async function setServerStatus(serverId: string, status: McpServerStatus): Promise<McpServer> {
  if (!isMockEnabled()) return api.post(`/integrations/mcp/${serverId}/status`, { status });
  await delay(400);
  const server = MOCK_MCP_SERVERS.find((s) => s.id === serverId) ?? MOCK_MCP_SERVERS[0];
  return { ...server, status, lastSyncAt: status === 'connected' ? new Date().toISOString() : server.lastSyncAt };
}
