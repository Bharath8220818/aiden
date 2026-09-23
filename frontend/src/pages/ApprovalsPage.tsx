import React, { useCallback, useEffect, useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { usePermission } from '@/features/auth/hooks/useAuth';
import { approvalsService, ApprovalRequest } from '@/features/team/services/team.service';
import { CheckSquare, Check, X, RefreshCw } from 'lucide-react';

const RISK_BADGE: Record<ApprovalRequest['riskLevel'], 'error' | 'warning' | 'neutral'> = {
  high: 'error',
  medium: 'warning',
  low: 'neutral',
};

const TYPE_LABEL: Record<string, string> = {
  healing_deploy: 'Self-healing deploy',
  pipeline_change: 'Pipeline change',
  agent_grant: 'Agent tool grant',
  incident_resolution: 'Incident resolution',
};

export const ApprovalsPage: React.FC = () => {
  const canDecide = usePermission('approvals.decide');
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setIsLoading(true);
    setError(null);
    approvalsService
      .list()
      .then(setApprovals)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load approvals'))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const decide = async (id: string, decision: 'approve' | 'reject') => {
    setDecidingId(id);
    try {
      await approvalsService[decision](id);
      setApprovals((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: decision === 'approve' ? 'approved' : 'rejected' } : a))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Decision failed');
      load();
    } finally {
      setDecidingId(null);
    }
  };

  const pending = approvals.filter((a) => a.status === 'pending');
  const decided = approvals.filter((a) => a.status !== 'pending');

  return (
    <PageContainer
      title="Approvals & Governance"
      description="Human-in-the-loop governance for self-healed patches, schema migrations, and production releases"
      breadcrumbs={[{ label: 'AIDEN' }, { label: 'Governance' }, { label: 'Approvals' }]}
      actions={
        <Button size="sm" variant="secondary" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={load} disabled={isLoading}>
          Refresh
        </Button>
      }
    >
      {error && (
        <Card className="p-4 border-red-500/40 bg-red-500/5">
          <p className="text-xs text-red-600">{error}</p>
        </Card>
      )}

      <Card className="bg-card border-border overflow-hidden">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">Pending Requests</h3>
              <p className="text-xs text-text-secondary">
                {canDecide ? 'Review and approve/reject — every decision is audited' : 'approvals.decide permission required (lead+)'}
              </p>
            </div>
          </div>
          <Badge variant={pending.length > 0 ? 'warning' : 'success'} size="md" dot={pending.length > 0}>
            {pending.length} pending
          </Badge>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3" aria-busy="true" aria-label="Loading approvals">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 rounded-md bg-card animate-pulse" />
            ))}
          </div>
        ) : pending.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<CheckSquare className="w-5 h-5" />}
              title="Queue is clear"
              description="No approvals waiting. Deploy and healing requests will appear here."
            />
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {pending.map((a) => (
              <div key={a.id} className="p-4 flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={RISK_BADGE[a.riskLevel]} dot size="sm">
                      {a.riskLevel} risk
                    </Badge>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-background text-text-secondary border border-border">
                      {TYPE_LABEL[a.requestType] ?? a.requestType}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-text-primary">{a.summary}</p>
                  <p className="text-[11px] text-text-secondary">
                    Requested by {a.requestedByName} · {a.requestedAt}
                  </p>
                </div>
                {canDecide && (
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="primary"
                      leftIcon={<Check className="w-3.5 h-3.5" />}
                      onClick={() => decide(a.id, 'approve')}
                      disabled={decidingId === a.id}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      leftIcon={<X className="w-3.5 h-3.5" />}
                      onClick={() => decide(a.id, 'reject')}
                      disabled={decidingId === a.id}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {decided.length > 0 && (
        <Card className="bg-card border-border overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-border-subtle">
            <h3 className="text-sm font-bold text-text-primary">Recent Decisions</h3>
          </div>
          <div className="divide-y divide-border-subtle">
            {decided.map((a) => (
              <div key={a.id} className="p-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-text-primary">{a.summary}</p>
                  <p className="text-[10px] text-text-muted mt-0.5">Decided {a.decidedAt ?? '—'}</p>
                </div>
                <Badge variant={a.status === 'approved' ? 'success' : 'error'} size="sm">
                  {a.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </PageContainer>
  );
};
export default ApprovalsPage;
