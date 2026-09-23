import { ArchitectureNodeKind } from '@/features/architecture/types';

/* ------------------------------------------------------------------ */
/* Agent Control Center                                                */
/* ------------------------------------------------------------------ */

export type AgentStatus = 'active' | 'idle' | 'working' | 'paused' | 'error';
export type AgentRole =
  | 'requirements'
  | 'architecture'
  | 'builder'
  | 'qa'
  | 'healer'
  | 'governance'
  | 'optimizer'
  | 'orchestrator';

export interface AgentToolGrant {
  tool: string;
  server: string; // MCP server id
  permission: 'read' | 'write' | 'admin';
  enabled: boolean;
}

export interface MemoryEntry {
  id: string;
  kind: 'episodic' | 'semantic' | 'procedural';
  content: string;
  ts: string;
  tokens: number;
}

export interface TrajectoryStep {
  id: string;
  ts: string;
  thought: string;
  action: string;
  toolUsed: string | null;
  observation: string;
  tokens: number;
}

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  status: AgentStatus;
  model: string;
  description: string;
  capabilities: string[];
  stats: {
    tasksCompleted: number;
    successRate: number; // percent
    avgTaskMinutes: number;
    tokensToday: number;
    tokenBudget: number;
  };
  currentTask: string | null;
  toolGrants: AgentToolGrant[];
  memory: MemoryEntry[];
  trajectory: TrajectoryStep[];
}

export interface SwarmMessage {
  id: string;
  from: AgentRole;
  to: AgentRole | 'broadcast';
  kind: 'handoff' | 'question' | 'approval_request' | 'result';
  summary: string;
  ts: string;
}

/* ------------------------------------------------------------------ */
/* Knowledge / RAG                                                     */
/* ------------------------------------------------------------------ */

export type KnowledgeSourceKind =
  | 'data_contract'
  | 'postmortem'
  | 'runbook'
  | 'schema_doc'
  | 'metric_definition'
  | 'lineage_snapshot'
  | 'incident_pattern';

export interface KnowledgeDoc {
  id: string;
  title: string;
  kind: KnowledgeSourceKind;
  source: string;
  updatedAt: string;
  chunks: number;
  tokens: number;
  embeddingModel: string;
  tags: string[];
  excerpt: string;
  retrievalCount: number;
}

export interface RetrievedChunk {
  docId: string;
  docTitle: string;
  kind: KnowledgeSourceKind;
  score: number; // cosine similarity 0-1
  content: string;
  ts: string;
}

/* ------------------------------------------------------------------ */
/* MCP integrations                                                    */
/* ------------------------------------------------------------------ */

export type McpServerStatus = 'connected' | 'degraded' | 'disconnected';
export type McpTransport = 'stdio' | 'sse' | 'http';

export interface McpTool {
  name: string;
  description: string;
  kind: ArchitectureNodeKind | 'utility';
  scopes: ('read' | 'write' | 'admin')[];
  calls24h: number;
  avgLatencyMs: number;
}

export interface McpServer {
  id: string;
  name: string;
  transport: McpTransport;
  endpoint: string;
  status: McpServerStatus;
  tools: McpTool[];
  authMode: 'oauth' | 'api_key' | 'service_account' | 'none';
  lastSyncAt: string;
  toolsAllowedFor: AgentRole[];
}
