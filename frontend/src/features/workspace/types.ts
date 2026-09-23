/** Workspace chat contracts — mirror of the backend /workspace/chat payload. */

export type ArtifactType = 'architecture' | 'pipeline' | 'sql' | 'incident' | 'knowledge' | 'task' | 'table';

export interface ArtifactAction {
  label: string;
  kind: 'open' | 'build' | 'run' | 'edit' | 'validate' | 'review-fix' | 'introspect' | 'open-sql';
  target?: string;
}

export interface WorkspaceArtifact {
  type: ArtifactType;
  title: string;
  /** Architecture/pipeline flow shapes */
  nodes?: string[];
  edges?: Array<[string, string]>;
  stages?: string[];
  source?: string;
  target?: string;
  /** Incident shape */
  incidentId?: string;
  severity?: string;
  status?: string;
  cause?: string;
  fix?: string | null;
  /** Task shape */
  taskId?: string;
  priority?: string;
  assignee?: string;
  /** Knowledge shape */
  citations?: Array<{ docId: string; docTitle: string; score: number; content: string }>;
  /** Table shape */
  rows?: Array<Record<string, string>>;
  /** Generic */
  validation?: string[];
  mode?: string;
  actions?: string[];
}

export interface WorkspaceContextPayload {
  projectId?: string | null;
  projectName?: string;
  pipelines?: Array<{ id: string; name: string; status: string }>;
  incidents?: Array<{ id: string; title: string; severity: string; status: string }>;
  openIncidents?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'aiden';
  text: string;
  ts: string;
  intent?: string;
  artifacts?: WorkspaceArtifact[];
  suggestions?: string[];
  pending?: boolean;
}

export interface WorkspaceChatResponse {
  reply: string;
  intent: string;
  artifacts: WorkspaceArtifact[];
  context: WorkspaceContextPayload;
  suggestions?: string[];
}
