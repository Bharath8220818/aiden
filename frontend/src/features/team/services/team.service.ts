import { api } from '@/services/api';
import type { SystemRole } from '@/features/auth/types';

/* ------------------------------------------------------------------ */
/* Contracts (mirror backend app/api/v1/governance.py payloads)        */
/* ------------------------------------------------------------------ */

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  title: string;
  status: 'active' | 'invited' | 'inactive';
}

export interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  target: string;
  resourceType: string;
  result: string;
  time: string;
}

export interface ApprovalRequest {
  id: string;
  requestType: string;
  status: 'pending' | 'approved' | 'rejected';
  summary: string;
  riskLevel: 'low' | 'medium' | 'high';
  requestedByName: string;
  requestedAt: string;
  decidedAt: string | null;
}

const WORKSPACE_ID_KEY = 'aiden-workspace-id';

/** Persisted workspace context — set by the workspace selector. */
export function getCurrentWorkspaceId(): string | null {
  try {
    return localStorage.getItem(WORKSPACE_ID_KEY);
  } catch {
    return null;
  }
}

export function setCurrentWorkspaceId(id: string | null) {
  try {
    if (id) localStorage.setItem(WORKSPACE_ID_KEY, id);
    else localStorage.removeItem(WORKSPACE_ID_KEY);
  } catch {
    /* ignore */
  }
}

async function firstWorkspaceId(): Promise<string | null> {
  try {
    const res = await api.get<{ items: { id: string }[] }>('/workspaces?limit=1');
    return res.items?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

async function resolveWorkspaceId(): Promise<string | null> {
  return getCurrentWorkspaceId() ?? (await firstWorkspaceId());
}

/* ------------------------------------------------------------------ */
/* Team                                                                */
/* ------------------------------------------------------------------ */

export const teamService = {
  async listMembers(): Promise<TeamMember[]> {
    const wsId = await resolveWorkspaceId();
    if (!wsId) return [];
    return api.get<TeamMember[]>(`/team/members?workspace_id=${encodeURIComponent(wsId)}`);
  },

  async invite(email: string, role: string): Promise<TeamMember> {
    const wsId = await resolveWorkspaceId();
    if (!wsId) throw new Error('No workspace available');
    return api.post<TeamMember>('/team/members', { email, role, workspaceId: wsId });
  },

  async changeRole(memberId: string, role: TeamMember['role']): Promise<void> {
    await api.put(`/team/members/${memberId}`, { role });
  },

  async remove(memberId: string): Promise<void> {
    await api.delete(`/team/members/${memberId}`);
  },
};

/* ------------------------------------------------------------------ */
/* Governance — audit trail                                            */
/* ------------------------------------------------------------------ */

export const governanceService = {
  async auditTrail(limit = 25): Promise<AuditEvent[]> {
    return api.get<AuditEvent[]>(`/audit?limit=${limit}`);
  },

  /** Live pending-approval count for workspace summary cards. */
  async pendingApprovals(): Promise<ApprovalRequest[]> {
    const rows = await api.get<ApprovalRequest[]>('/approvals');
    return rows.filter((a) => a.status === 'pending');
  },
};

/* ------------------------------------------------------------------ */
/* Approvals queue                                                     */
/* ------------------------------------------------------------------ */

export const approvalsService = {
  async list(): Promise<ApprovalRequest[]> {
    return api.get<ApprovalRequest[]>('/approvals');
  },

  async approve(id: string, note?: string): Promise<void> {
    await api.post(`/approvals/${id}/approve`, { note });
  },

  async reject(id: string, note?: string): Promise<void> {
    await api.post(`/approvals/${id}/reject`, { note });
  },
};

/* Role display mapping — backend workspace roles → system-role labels. */
export const WORKSPACE_ROLE_TO_SYSTEM: Record<TeamMember['role'], SystemRole> = {
  owner: 'admin',
  admin: 'lead',
  member: 'engineer',
  viewer: 'viewer',
};
