/* ------------------------------------------------------------------ */
/* Roles & permissions                                                 */
/* ------------------------------------------------------------------ */

export type SystemRole = 'admin' | 'lead' | 'engineer' | 'viewer';

export const ROLE_LABELS: Record<SystemRole, string> = {
  admin: 'Platform Admin',
  lead: 'Lead Data Engineer',
  engineer: 'Data Engineer',
  viewer: 'Analyst (Read-only)',
};

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  systemRole: SystemRole;
  roleTitle: string;
  avatarUrl?: string;
  status: 'online' | 'busy' | 'away' | 'offline';
  workspaceName: string;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
  expiresAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResult {
  session: AuthSession;
}
