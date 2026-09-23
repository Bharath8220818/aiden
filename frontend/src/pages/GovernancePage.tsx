import React, { useEffect, useMemo, useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  PERMISSION_CATALOGUE,
  ROLE_PERMISSIONS,
} from '@/features/auth/permissions';
import { governanceService, AuditEvent } from '@/features/team/services/team.service';
import { SystemRole } from '@/features/auth/types';
import { ShieldCheck, AlertTriangle, Lock, FileClock, Shield, Check, Minus, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

const ROLES: { role: SystemRole; label: string }[] = [
  { role: 'viewer', label: 'Viewer' },
  { role: 'engineer', label: 'Engineer' },
  { role: 'lead', label: 'Lead' },
  { role: 'admin', label: 'Admin' },
];

/** Sensitive operations (Phase 2.8 flow: permission → risk → approval → execution). */
const SENSITIVE_OPERATIONS = [
  {
    operation: 'Production deployment',
    permission: 'pipelines.deploy',
    risk: 'high' as const,
    policy: 'Requires lead/admin approval before execution',
  },
  {
    operation: 'Destructive SQL (DROP / TRUNCATE)',
    permission: 'sql.execute',
    risk: 'high' as const,
    policy: 'Blocked outside production gates; approval required',
  },
  {
    operation: 'Credential & connection changes',
    permission: 'connections.manage',
    risk: 'medium' as const,
    policy: 'Credentials masked; changes audited',
  },
  {
    operation: 'Self-healing execution',
    permission: 'healing.approve',
    risk: 'high' as const,
    policy: 'Sandbox verification + human sign-off enforced',
  },
  {
    operation: 'Agent tool grants',
    permission: 'agents.control',
    risk: 'medium' as const,
    policy: 'Admin-only; every grant logged to audit trail',
  },
];

export const GovernancePage: React.FC = () => {
  const { user, can } = useAuth();
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditError, setAuditError] = useState<string | null>(null);

  const loadAudit = React.useCallback(() => {
    setAuditLoading(true);
    setAuditError(null);
    governanceService
      .auditTrail(20)
      .then(setAuditEvents)
      .catch((err) => setAuditError(err instanceof Error ? err.message : 'Failed to load audit trail'))
      .finally(() => setAuditLoading(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(loadAudit, 0);
    return () => clearTimeout(t);
  }, [loadAudit]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof PERMISSION_CATALOGUE>();
    for (const entry of PERMISSION_CATALOGUE) {
      const list = map.get(entry.group) ?? [];
      list.push(entry);
      map.set(entry.group, list);
    }
    return Array.from(map.entries());
  }, []);

  return (
    <PageContainer
      title="Governance"
      description="Permission matrix, approval policies, and the audit trail for autonomous actions"
      breadcrumbs={[{ label: 'AIDEN' }, { label: 'Governance' }]}
    >
      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-2 text-text-secondary">
            <Shield className="w-4 h-4 text-indigo-600" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Roles</span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-text-primary font-mono">4</p>
          <p className="text-[10px] text-text-muted mt-1">Viewer → Admin hierarchy</p>
        </Card>
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-2 text-text-secondary">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Permissions</span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-text-primary font-mono">{PERMISSION_CATALOGUE.length}</p>
          <p className="text-[10px] text-text-muted mt-1">Explicit, least-privilege grants</p>
        </Card>
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-2 text-text-secondary">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Sensitive ops</span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-text-primary font-mono">{SENSITIVE_OPERATIONS.length}</p>
          <p className="text-[10px] text-text-muted mt-1">Gated behind approval flow</p>
        </Card>
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-2 text-text-secondary">
            <FileClock className="w-4 h-4 text-cyan-600" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Audit events</span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-text-primary font-mono">{auditLoading ? '—' : auditEvents.length}</p>
          <p className="text-[10px] text-text-muted mt-1">Live from the audit_logs table</p>
        </Card>
      </div>

      {/* Permission matrix */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">Permission Matrix</h3>
              <p className="text-xs text-text-secondary">
                Signed in as <span className="text-text-primary font-medium">{user?.name ?? '—'}</span> — your grants are highlighted
              </p>
            </div>
          </div>
          <Badge variant="ai" size="md">RBAC</Badge>
        </div>

        <div className="overflow-x-auto">
          <Table className="border-none rounded-none">
            <TableHeader>
              <TableRow className="border-b border-border">
                <TableHead>Permission</TableHead>
                {ROLES.map((r) => (
                  <TableHead key={r.role} className="text-center w-20">{r.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {grouped.map(([group, entries]) => (
                <React.Fragment key={group}>
                  <TableRow className="bg-card/80 hover:bg-card/80">
                    <TableCell className="font-semibold text-[11px] uppercase tracking-wider text-text-secondary">
                      {group}
                    </TableCell>
                    {ROLES.map((r) => <TableCell key={r.role} className="p-0" />)}
                  </TableRow>
                  {entries.map((entry) => (
                    <TableRow key={entry.permission}>
                      <TableCell>
                        <span className="font-mono text-xs text-text-primary">{entry.permission}</span>
                        <span className="ml-2 text-[11px] text-text-muted">{entry.label}</span>
                      </TableCell>
                      {ROLES.map((r) => {
                        const granted = ROLE_PERMISSIONS[r.role].includes(entry.permission);
                        return (
                          <TableCell key={r.role} className="text-center">
                            {granted ? (
                              <Check
                                className={cn(
                                  'w-4 h-4 inline-block text-emerald-600',
                                  r.role === user?.systemRole && 'drop-shadow-[0_0_4px_rgba(52,211,153,0.6)]'
                                )}
                                aria-label={`${r.role} granted`}
                              />
                            ) : (
                              <Minus className="w-3.5 h-3.5 inline-block text-text-muted" aria-label={`${r.role} not granted`} />
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Sensitive operations + audit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border-border overflow-hidden">
          <div className="flex items-center gap-2.5 p-4 sm:p-5 border-b border-border-subtle">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">Dangerous Operations</h3>
              <p className="text-xs text-text-secondary">Permission → risk check → approval → execution</p>
            </div>
          </div>
          <div className="divide-y divide-border-subtle">
            {SENSITIVE_OPERATIONS.map((op) => (
              <div key={op.operation} className="p-4 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-text-primary">{op.operation}</p>
                  <p className="text-[11px] text-text-secondary">{op.policy}</p>
                  <span className="inline-block font-mono text-[10px] px-1.5 py-0.5 rounded bg-background text-text-secondary border border-border">
                    {op.permission}
                  </span>
                </div>
                <Badge variant={op.risk === 'high' ? 'error' : 'warning'} dot size="sm">
                  {op.risk === 'high' ? 'High risk' : 'Med risk'}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-card border-border overflow-hidden">
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border-subtle">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-600">
                <FileClock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary">Audit Log</h3>
                <p className="text-xs text-text-secondary">Every privileged action, live from the backend</p>
              </div>
            </div>
            <button
              onClick={loadAudit}
              aria-label="Refresh audit log"
              className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-card transition-colors"
            >
              <RefreshCw className={cn('w-4 h-4', auditLoading && 'animate-spin')} />
            </button>
          </div>
          {auditLoading ? (
            <div className="p-6 space-y-3" aria-busy="true" aria-label="Loading audit events">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-10 rounded-md bg-card animate-pulse" />
              ))}
            </div>
          ) : auditError ? (
            <div className="p-4">
              <p className="text-xs text-red-600">{auditError}</p>
            </div>
          ) : auditEvents.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-xs text-text-secondary">No audit events yet — privileged actions will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {auditEvents.map((evt) => (
                <div key={evt.id} className="p-4 flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs text-text-primary">
                      <span className="font-semibold">{evt.actor}</span> — {evt.action}
                    </p>
                    <p className="font-mono text-[11px] text-text-secondary truncate max-w-[24rem]">{evt.target}</p>
                    <p className="text-[10px] text-text-muted">{evt.time}</p>
                  </div>
                  <Badge
                    variant={evt.result === 'OK' || evt.result === 'approved' ? 'success' : evt.result === 'DENIED' || evt.result === 'rejected' ? 'error' : 'warning'}
                    size="sm"
                  >
                    {evt.result}
                  </Badge>
                </div>
              ))}
            </div>
          )}
          {!can('approvals.decide') && (
            <div className="px-4 py-3 border-t border-border-subtle text-[11px] text-text-muted">
              Read-only view — approval decisions require the <span className="font-mono text-text-secondary">approvals.decide</span> permission.
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  );
};
export default GovernancePage;
