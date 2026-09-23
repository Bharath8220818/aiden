import React from 'react';
import { ProposedFix, SandboxTest } from '../types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { UserCheck, ShieldAlert, Shield, ShieldX, Timer, Repeat } from 'lucide-react';

export interface ApprovalCardProps {
  fix: ProposedFix | null;
  sandbox: SandboxTest | null;
  isDeploying: boolean;
  onApprove: () => void;
  onReject: () => void;
}

const RISK_META = {
  low: { icon: <Shield className="w-3.5 h-3.5" />, badge: 'success' as const },
  medium: { icon: <ShieldAlert className="w-3.5 h-3.5" />, badge: 'warning' as const },
  high: { icon: <ShieldX className="w-3.5 h-3.5" />, badge: 'error' as const },
};

export const ApprovalCard: React.FC<ApprovalCardProps> = ({ fix, sandbox, isDeploying, onApprove, onReject }) => {
  const sandboxPassed = sandbox?.stage === 'passed';

  return (
    <div
      className={cn(
        'p-4 rounded-lg border space-y-3 transition-all',
        sandboxPassed
          ? 'bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/40'
          : 'bg-card border-border opacity-60'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCheck className={cn('w-4 h-4', sandboxPassed ? 'text-amber-600' : 'text-text-muted')} />
          <span className="text-xs font-bold uppercase tracking-wider text-text-primary">Engineer Approval</span>
        </div>
        {fix && (
          <Badge variant={RISK_META[fix.riskLevel].badge} size="sm">
            {RISK_META[fix.riskLevel].icon}
            <span className="ml-1">{fix.riskLevel} risk</span>
          </Badge>
        )}
      </div>

      {!sandboxPassed ? (
        <p className="text-[11px] text-text-muted">
          Approval unlocks after the patch passes sandbox verification against a production snapshot.
        </p>
      ) : (
        <>
          <p className="text-[11px] text-text-primary leading-relaxed">{fix?.summary}</p>

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="p-2.5 rounded-md bg-card border border-border flex items-center gap-2">
              <Timer className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
              <div>
                <div className="text-text-muted uppercase text-[9px]">Est. fix time</div>
                <div className="font-mono font-bold text-text-primary">{fix?.estimatedFixMinutes} min</div>
              </div>
            </div>
            <div className="p-2.5 rounded-md bg-card border border-border flex items-center gap-2">
              <Repeat className="w-3.5 h-3.5 text-violet-600 shrink-0" />
              <div className="min-w-0">
                <div className="text-text-muted uppercase text-[9px]">Backfill</div>
                <div className="font-mono font-semibold text-text-primary truncate" title={fix?.backfillWindow ?? undefined}>
                  {fix?.requiresBackfill ? 'Required' : 'Not needed'}
                </div>
              </div>
            </div>
          </div>

          {fix?.requiresBackfill && fix.backfillWindow && (
            <p className="text-[10px] text-amber-600 font-mono bg-amber-500/10 border border-amber-500/30 rounded-md px-2.5 py-1.5">
              Backfill plan: {fix.backfillWindow}
            </p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="primary"
              size="sm"
              onClick={onApprove}
              isLoading={isDeploying}
              className="flex-1 text-xs"
            >
              Approve & Deploy
            </Button>
            <Button variant="danger" size="sm" onClick={onReject} disabled={isDeploying} className="text-xs">
              Reject
            </Button>
          </div>

          <p className="text-[9px] text-text-muted">
            Approval recorded in the audit log. AIDEN deploys with a zero-downtime rolling update and auto-rolls back on quality-gate regression.
          </p>
        </>
      )}
    </div>
  );
};
