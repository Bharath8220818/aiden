import { SystemRole } from './types';

export interface RoleBadgeMeta {
  label: string;
  className: string;
}

export const ROLE_BADGE: Record<SystemRole, RoleBadgeMeta> = {
  admin: { label: 'Admin', className: 'bg-indigo-500/15 text-indigo-600 border-indigo-500/30' },
  lead: { label: 'Lead', className: 'bg-cyan-500/15 text-cyan-600 border-cyan-500/30' },
  engineer: { label: 'Engineer', className: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' },
  viewer: { label: 'Read-only', className: 'bg-background text-text-secondary border-border-highlight' },
};
