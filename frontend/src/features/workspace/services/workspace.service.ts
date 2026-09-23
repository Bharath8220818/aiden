import { api } from '@/services/api';
import type { WorkspaceChatResponse } from '../types';

/** POST /workspace/chat — one conversational turn of the Command Workspace. */
export async function sendWorkspaceMessage(
  message: string,
  projectId: string | null,
  history: Array<{ role: string; content: string }> = []
): Promise<WorkspaceChatResponse> {
  return api.post<WorkspaceChatResponse>('/workspace/chat', {
    message,
    projectId,
    history,
  });
}

export interface ToolSpecOut {
  name: string;
  description: string;
  category: string;
  permission: string;
  risk: string;
}

export interface ChannelStatus {
  enabled: boolean;
  mode: string;
}

export interface ConnectionSummary {
  id: string;
  name: string;
  providerName: string;
  status: string;
  database: string | null;
}

/** GET /workspace/tools — Tool Registry catalog for this user's permissions. */
export async function fetchWorkspaceTools(): Promise<ToolSpecOut[]> {
  return api.get<ToolSpecOut[]>('/workspace/tools');
}

/** GET /notifications/channels — communication channel configuration. */
export async function fetchChannelStatus(): Promise<Record<string, ChannelStatus>> {
  return api.get<Record<string, ChannelStatus>>('/notifications/channels');
}

/** GET /connections — warehouse connection list (masked credentials). */
export async function fetchConnectionSummaries(): Promise<ConnectionSummary[]> {
  const rows = await api.get<Array<Record<string, unknown>>>('/connections');
  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    providerName: String(r.providerName ?? r.providerId ?? 'unknown'),
    status: String(r.status ?? 'unknown'),
    database: (r.database as string | null) ?? null,
  }));
}
