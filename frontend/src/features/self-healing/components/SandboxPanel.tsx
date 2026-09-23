import React from 'react';
import { SandboxTest, ProposedFix } from '../types';
import { cn } from '@/lib/utils';
import { FlaskConical, CheckCircle2, XCircle, Loader2, Database, ShieldCheck } from 'lucide-react';

export interface SandboxPanelProps {
  sandbox: SandboxTest | null;
  isRunning: boolean;
  fix: ProposedFix | null;
  onRun: () => void;
  disabled?: boolean;
}

const STAGE_STEPS: { id: SandboxTest['stage']; label: string }[] = [
  { id: 'cloning', label: 'Clone prod snapshot' },
  { id: 'replaying', label: 'Replay events' },
  { id: 'regression', label: 'Regression suite' },
];

export const SandboxPanel: React.FC<SandboxPanelProps> = ({ sandbox, isRunning, fix, onRun, disabled }) => {
  const currentStageIndex = sandbox ? STAGE_STEPS.findIndex((s) => s.id === sandbox.stage) : -1;
  const passed = sandbox?.stage === 'passed';
  const _failed = sandbox?.stage === 'failed';

  return (
    <div className="p-4 rounded-lg bg-card border border-border space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className={cn('w-4 h-4', passed ? 'text-emerald-600' : isRunning ? 'text-indigo-600 animate-pulse' : 'text-text-muted')} />
          <span className="text-xs font-bold uppercase tracking-wider text-text-primary">Sandbox Verification</span>
        </div>
        <button
          onClick={onRun}
          disabled={disabled || isRunning || !fix}
          className="text-[10px] font-semibold px-2.5 py-1 rounded-md border border-indigo-500/40 text-indigo-600 hover:bg-indigo-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {isRunning ? 'Verifying…' : passed ? 'Re-run' : 'Run in sandbox'}
        </button>
      </div>

      {/* Stage progress */}
      <div className="flex items-center gap-1.5">
        {STAGE_STEPS.map((step, idx) => {
          const done = sandbox ? currentStageIndex > idx || passed : false;
          const active = sandbox ? currentStageIndex === idx && !passed : false;
          return (
            <React.Fragment key={step.id}>
              <div
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded-md border text-[9px] font-bold uppercase tracking-wide',
                  done && 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600',
                  active && 'bg-indigo-500/10 border-indigo-500/40 text-indigo-600',
                  !done && !active && 'bg-card border-border text-text-muted'
                )}
              >
                {done ? <CheckCircle2 className="w-3 h-3" /> : active ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                {step.label}
              </div>
              {idx < STAGE_STEPS.length - 1 && <div className="h-px flex-1 bg-border" />}
            </React.Fragment>
          );
        })}
      </div>

      {/* Snapshot info */}
      {sandbox && (
        <div className="flex items-center gap-3 text-[10px] font-mono text-text-secondary">
          <span className="flex items-center gap-1">
            <Database className="w-3 h-3" /> prod snapshot (COW)
          </span>
          <span className="text-text-primary font-bold">{sandbox.replaysProcessed.toLocaleString()}</span>
          <span>events replayed</span>
        </div>
      )}

      {/* Assertions */}
      {sandbox && sandbox.assertions.length > 0 && (
        <div className="space-y-1">
          {sandbox.assertions.map((a) => (
            <div
              key={a.name}
              className={cn(
                'flex items-start gap-2 p-2 rounded-md border text-[10px]',
                a.passed ? 'bg-emerald-500/5 border-emerald-500/25' : 'bg-red-500/5 border-red-500/30'
              )}
            >
              {a.passed ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-red-600 mt-0.5 shrink-0" />
              )}
              <div>
                <span className="font-semibold text-text-primary">{a.name}</span>
                <span className="text-text-secondary"> — {a.detail}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Log tail */}
      {sandbox && sandbox.logTail.length > 0 && (
        <pre className="p-2.5 rounded-md bg-background border border-border-subtle text-[9px] font-mono text-text-secondary overflow-x-auto max-h-28">
          {sandbox.logTail.join('\n')}
        </pre>
      )}

      {/* Verdict */}
      {passed && (
        <div className="flex items-center gap-2 p-2.5 rounded-md bg-emerald-500/10 border border-emerald-500/40">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="text-[11px] font-semibold text-emerald-600">
            Patch verified — safe to deploy. Backfill: {fix?.requiresBackfill ? fix.backfillWindow : 'not required'}
          </span>
        </div>
      )}
    </div>
  );
};
