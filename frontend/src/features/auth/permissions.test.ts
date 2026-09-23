import { describe, it, expect } from 'vitest';
import { permissionsForRole, roleHasPermission, ROLE_PERMISSIONS, PERMISSION_CATALOGUE } from './permissions';

describe('RBAC permission matrix', () => {
  it('grants the viewer read-only permissions', () => {
    const perms = permissionsForRole('viewer');
    expect(perms).toContain('monitoring.read');
    expect(perms).not.toContain('pipelines.control');
    expect(perms).not.toContain('healing.approve');
  });

  it('grants the engineer build rights but not deploy or approval rights', () => {
    const perms = permissionsForRole('engineer');
    expect(perms).toContain('pipelines.build');
    expect(perms).toContain('sql.execute');
    expect(perms).not.toContain('pipelines.deploy');
    expect(perms).not.toContain('approvals.decide');
    expect(perms).not.toContain('agents.control');
  });

  it('grants the lead deploy/control/approval rights but not agent control', () => {
    const perms = permissionsForRole('lead');
    expect(perms).toContain('pipelines.deploy');
    expect(perms).toContain('pipelines.control');
    expect(perms).toContain('healing.approve');
    expect(perms).toContain('approvals.decide');
    expect(perms).not.toContain('agents.control');
  });

  it('grants the admin every catalogue permission', () => {
    const admin = new Set(permissionsForRole('admin'));
    PERMISSION_CATALOGUE.forEach(({ permission }) => {
      expect(admin.has(permission)).toBe(true);
    });
  });

  it('forms a strict hierarchy viewer ⊂ engineer ⊂ lead ⊂ admin', () => {
    const viewer = new Set(ROLE_PERMISSIONS.viewer);
    const engineer = new Set(ROLE_PERMISSIONS.engineer);
    const lead = new Set(ROLE_PERMISSIONS.lead);
    const admin = new Set(ROLE_PERMISSIONS.admin);

    viewer.forEach((p) => expect(engineer.has(p)).toBe(true));
    engineer.forEach((p) => expect(lead.has(p)).toBe(true));
    lead.forEach((p) => expect(admin.has(p)).toBe(true));
  });

  it('answers single-permission checks correctly', () => {
    expect(roleHasPermission('lead', 'connections.manage')).toBe(true);
    expect(roleHasPermission('engineer', 'connections.manage')).toBe(false);
    expect(roleHasPermission('viewer', 'requirements.read')).toBe(true);
    expect(roleHasPermission('viewer', 'requirements.create')).toBe(false);
  });

  it('catalogue is fully covered: everything except agents.control is available to lead', () => {
    const lead = new Set(ROLE_PERMISSIONS.lead);
    const missingInLead = PERMISSION_CATALOGUE.filter(
      (c) => c.permission !== 'agents.control' && !lead.has(c.permission)
    );
    expect(missingInLead).toHaveLength(0);
  });
});
