import React, { useCallback, useEffect, useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth, usePermission } from '@/features/auth/hooks/useAuth';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { teamService, TeamMember } from '@/features/team/services/team.service';
import { Users, UserPlus, ShieldCheck, Building2, Mail, X, RefreshCw } from 'lucide-react';

const ROLE_OPTIONS: { role: TeamMember['role']; label: string; description: string }[] = [
  { role: 'owner', label: 'Owner', description: 'Full administrative control of the workspace' },
  { role: 'admin', label: 'Admin', description: 'Manage members and all workspace resources' },
  { role: 'member', label: 'Member', description: 'Build requirements, pipelines, and run SQL' },
  { role: 'viewer', label: 'Viewer', description: 'Read-only access across the workspace' },
];

const ROLE_BADGE: Record<TeamMember['role'], 'error' | 'warning' | 'info' | 'neutral'> = {
  owner: 'error',
  admin: 'warning',
  member: 'info',
  viewer: 'neutral',
};

export const TeamPage: React.FC = () => {
  const { user } = useAuth();
  const canManage = usePermission('team.manage');
  const { currentWorkspace } = useWorkspaceStore();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState(0);

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamMember['role']>('viewer');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [rows, pending] = await Promise.all([
        teamService.listMembers(),
        governancePending(),
      ]);
      setMembers(rows);
      setPendingApprovals(pending);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team members');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setInviteError('Enter a valid email address.');
      return;
    }
    if (members.some((m) => m.email.toLowerCase() === email)) {
      setInviteError('This person is already a member.');
      return;
    }
    setIsInviting(true);
    setInviteError(null);
    try {
      const created = await teamService.invite(email, inviteRole);
      setMembers((prev) => [...prev, created]);
      setInviteEmail('');
      setInviteRole('viewer');
      setIsInviteOpen(false);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Invite failed');
    } finally {
      setIsInviting(false);
    }
  };

  const handleChangeRole = async (memberId: string, role: TeamMember['role']) => {
    const previous = members;
    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role } : m)));
    try {
      await teamService.changeRole(memberId, role);
    } catch {
      setMembers(previous); // rollback on failure
      setError('Role change failed — reverted.');
    }
  };

  const handleRemove = async (memberId: string) => {
    const previous = members;
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    try {
      await teamService.remove(memberId);
    } catch {
      setMembers(previous);
      setError('Removal failed — reverted.');
    }
  };

  const admins = members.filter((m) => m.role === 'owner' || m.role === 'admin').length;

  return (
    <PageContainer
      title="Team"
      description="Workspace membership, roles, and collaboration"
      breadcrumbs={[{ label: 'AIDEN' }, { label: currentWorkspace.name }, { label: 'Team' }]}
      actions={
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={load} disabled={isLoading}>
            Refresh
          </Button>
          {canManage && (
            <Button size="sm" variant="primary" leftIcon={<UserPlus className="w-4 h-4" />} onClick={() => setIsInviteOpen(true)}>
              Invite member
            </Button>
          )}
        </div>
      }
    >
      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-2 text-text-secondary">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Workspace</span>
          </div>
          <p className="mt-2 text-sm font-bold text-text-primary truncate">{currentWorkspace.name}</p>
          <p className="text-[10px] text-text-muted mt-1">Your role: {currentWorkspace.role}</p>
        </Card>
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-2 text-text-secondary">
            <Users className="w-4 h-4 text-emerald-600" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Members</span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-text-primary font-mono">{isLoading ? '—' : members.length}</p>
          <p className="text-[10px] text-text-muted mt-1">{admins} admin{admins === 1 ? '' : 's'} in workspace</p>
        </Card>
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-2 text-text-secondary">
            <ShieldCheck className="w-4 h-4 text-cyan-600" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Roles</span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-text-primary font-mono">{ROLE_OPTIONS.length}</p>
          <p className="text-[10px] text-text-muted mt-1">Viewer → Owner hierarchy</p>
        </Card>
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-2 text-text-secondary">
            <Mail className="w-4 h-4 text-amber-600" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Pending</span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-text-primary font-mono">{isLoading ? '—' : pendingApprovals}</p>
          <p className="text-[10px] text-text-muted mt-1">Approval requests waiting</p>
        </Card>
      </div>

      {error && (
        <Card className="p-4 border-red-500/40 bg-red-500/5">
          <p className="text-xs text-red-600">{error}</p>
        </Card>
      )}

      {/* Members table */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border-subtle">
          <div>
            <h3 className="text-sm font-bold text-text-primary">Members</h3>
            <p className="text-xs text-text-secondary">
              {canManage
                ? 'You can change roles and remove members'
                : 'Role changes require the team.manage permission (lead+)'}
            </p>
          </div>
        </div>
        {isLoading ? (
          <div className="p-6 space-y-3" aria-busy="true" aria-label="Loading members">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 rounded-md bg-card animate-pulse" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<Users className="w-5 h-5" />}
              title="No members yet"
              description="Invite teammates to collaborate on this workspace."
              actionLabel={canManage ? 'Invite member' : undefined}
              onAction={canManage ? () => setIsInviteOpen(true) : undefined}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="border-none rounded-none">
              <TableHeader>
                <TableRow className="border-b border-border">
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const isSelf = member.email === user?.email;
                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar name={member.name} size="sm" status={member.status === 'active' ? 'online' : 'offline'} />
                          <div>
                            <p className="text-xs font-semibold text-text-primary">
                              {member.name}
                              {isSelf && <span className="ml-2 text-[10px] text-indigo-600">(you)</span>}
                              {member.status === 'invited' && (
                                <Badge variant="warning" size="sm" className="ml-2">invited</Badge>
                              )}
                            </p>
                            <p className="text-[11px] text-text-secondary">{member.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {canManage && !isSelf ? (
                          <select
                            aria-label={`Role for ${member.name}`}
                            value={member.role}
                            onChange={(e) => handleChangeRole(member.id, e.target.value as TeamMember['role'])}
                            className="bg-background border border-border rounded-md text-xs text-text-primary px-2 py-1.5 focus:outline-none focus:border-indigo-500"
                          >
                            {ROLE_OPTIONS.map((opt) => (
                              <option key={opt.role} value={opt.role}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Badge variant={ROLE_BADGE[member.role]} size="sm">
                            {ROLE_OPTIONS.find((o) => o.role === member.role)?.label ?? member.role}
                          </Badge>
                        )}
                        <p className="text-[10px] text-text-muted mt-1">{member.title}</p>
                      </TableCell>
                      <TableCell className="text-right">
                        {canManage && !isSelf ? (
                          <button
                            onClick={() => handleRemove(member.id)}
                            aria-label={`Remove ${member.name}`}
                            title="Remove from workspace"
                            className="p-1.5 rounded-md text-text-muted hover:text-red-600 hover:bg-red-500/10 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-[11px] text-text-muted">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Role reference */}
      <Card className="bg-card border-border p-4 sm:p-5">
        <h3 className="text-sm font-bold text-text-primary mb-3">Role Reference</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {ROLE_OPTIONS.map((opt) => (
            <div key={opt.role} className="p-3 rounded-lg border border-border bg-card">
              <Badge variant={ROLE_BADGE[opt.role]} size="sm">{opt.label}</Badge>
              <p className="mt-2 text-[11px] text-text-secondary leading-relaxed">{opt.description}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Invite modal */}
      <Modal
        isOpen={isInviteOpen}
        onClose={() => {
          setIsInviteOpen(false);
          setInviteError(null);
        }}
        title="Invite member"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="invite-email" className="block text-xs font-medium text-text-secondary mb-1.5">
              Email address
            </label>
            <Input
              id="invite-email"
              type="email"
              placeholder="teammate@company.com"
              value={inviteEmail}
              onChange={(e) => {
                setInviteEmail(e.target.value);
                setInviteError(null);
              }}
            />
          </div>
          <div>
            <label htmlFor="invite-role" className="block text-xs font-medium text-text-secondary mb-1.5">
              Role
            </label>
            <select
              id="invite-role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as TeamMember['role'])}
              className="w-full bg-background border border-border rounded-md text-sm text-text-primary px-3 py-2.5 focus:outline-none focus:border-indigo-500"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.role} value={opt.role}>
                  {opt.label} — {opt.description}
                </option>
              ))}
            </select>
          </div>
          {inviteError && <p className="text-xs text-red-600">{inviteError}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={() => setIsInviteOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleInvite} disabled={isInviting}>
              {isInviting ? 'Sending…' : 'Send invite'}
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
};

async function governancePending(): Promise<number> {
  try {
    const pending = await import('@/features/team/services/team.service').then((m) => m.governanceService.pendingApprovals());
    return pending.length;
  } catch {
    return 0;
  }
}

export default TeamPage;
