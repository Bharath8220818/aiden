import { SystemRole } from './types';

/* ------------------------------------------------------------------ */
/* Permission catalogue                                                */
/* ------------------------------------------------------------------ */

export type Permission =
  // Workspaces
  | 'workspace.create'
  // Requirements
  | 'requirements.read'
  | 'requirements.create'
  // Architecture
  | 'architecture.read'
  | 'architecture.edit'
  | 'architecture.publish'
  // Pipelines
  | 'pipelines.read'
  | 'pipelines.build'
  | 'pipelines.deploy'
  | 'pipelines.control'
  // SQL
  | 'sql.read'
  | 'sql.execute'
  // Connections
  | 'connections.read'
  | 'connections.manage'
  // Operations
  | 'monitoring.read'
  | 'incidents.read'
  | 'incidents.resolve'
  | 'healing.approve'
  // Intelligence
  | 'agents.read'
  | 'agents.control'
  | 'knowledge.read'
  | 'knowledge.write'
  // Governance
  | 'approvals.read'
  | 'approvals.decide'
  // Team
  | 'team.manage';

/* ------------------------------------------------------------------ */
/* Role → permission matrix                                            */
/* ------------------------------------------------------------------ */

const VIEWER_PERMISSIONS: Permission[] = [
  'requirements.read',
  'architecture.read',
  'pipelines.read',
  'sql.read',
  'connections.read',
  'monitoring.read',
  'incidents.read',
  'agents.read',
  'knowledge.read',
  'approvals.read',
];

const ENGINEER_PERMISSIONS: Permission[] = [
  ...VIEWER_PERMISSIONS,
  'requirements.create',
  'architecture.edit',
  'pipelines.build',
  'sql.execute',
  'knowledge.write',
];

const LEAD_PERMISSIONS: Permission[] = [
  ...ENGINEER_PERMISSIONS,
  'workspace.create',
  'architecture.publish',
  'pipelines.deploy',
  'pipelines.control',
  'connections.manage',
  'incidents.resolve',
  'healing.approve',
  'approvals.decide',
  'team.manage',
];

const ADMIN_PERMISSIONS: Permission[] = [
  ...LEAD_PERMISSIONS,
  'agents.control',
];

export const ROLE_PERMISSIONS: Record<SystemRole, readonly Permission[]> = {
  viewer: VIEWER_PERMISSIONS,
  engineer: ENGINEER_PERMISSIONS,
  lead: LEAD_PERMISSIONS,
  admin: ADMIN_PERMISSIONS,
};

/** All permission entries, with human-readable labels for the admin matrix UI. */
export const PERMISSION_CATALOGUE: { permission: Permission; group: string; label: string }[] = [
  { permission: 'requirements.read', group: 'Requirements', label: 'View requirement studio' },
  { permission: 'requirements.create', group: 'Requirements', label: 'Submit requirements' },
  { permission: 'architecture.read', group: 'Architecture', label: 'View architecture canvas' },
  { permission: 'architecture.edit', group: 'Architecture', label: 'Edit blueprints' },
  { permission: 'architecture.publish', group: 'Architecture', label: 'Publish to builder' },
  { permission: 'pipelines.read', group: 'Pipelines', label: 'View builder & manager' },
  { permission: 'pipelines.build', group: 'Pipelines', label: 'Generate pipeline code' },
  { permission: 'pipelines.deploy', group: 'Pipelines', label: 'Deploy pipelines' },
  { permission: 'pipelines.control', group: 'Pipelines', label: 'Pause / resume / retry runs' },
  { permission: 'sql.read', group: 'SQL Workspace', label: 'Browse schemas' },
  { permission: 'sql.execute', group: 'SQL Workspace', label: 'Execute queries' },
  { permission: 'connections.read', group: 'Connections', label: 'View connections' },
  { permission: 'connections.manage', group: 'Connections', label: 'Create / edit / delete connections' },
  { permission: 'monitoring.read', group: 'Operations', label: 'View monitoring center' },
  { permission: 'incidents.read', group: 'Operations', label: 'View incidents' },
  { permission: 'incidents.resolve', group: 'Operations', label: 'Resolve incidents' },
  { permission: 'healing.approve', group: 'Operations', label: 'Approve self-healing fixes' },
  { permission: 'agents.read', group: 'Intelligence', label: 'View agent fleet' },
  { permission: 'agents.control', group: 'Intelligence', label: 'Pause agents & manage tool grants' },
  { permission: 'knowledge.read', group: 'Intelligence', label: 'Search knowledge base' },
  { permission: 'knowledge.write', group: 'Intelligence', label: 'Publish knowledge docs' },
  { permission: 'approvals.read', group: 'Governance', label: 'View approval queue' },
  { permission: 'approvals.decide', group: 'Governance', label: 'Approve / reject requests' },
  { permission: 'team.manage', group: 'Team', label: 'Invite members & change roles' },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function permissionsForRole(role: SystemRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role] ?? VIEWER_PERMISSIONS;
}

export function roleHasPermission(role: SystemRole, permission: Permission): boolean {
  return permissionsForRole(role).includes(permission);
}
