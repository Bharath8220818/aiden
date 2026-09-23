import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, XCircle, Gauge, DollarSign, Timer } from 'lucide-react';
import { CodeValidationReport } from '../types';

export interface ValidationReportPanelProps {
  report: CodeValidationReport | null;
}

const SEVERITY_ICON = {
  passed: <CheckCircle2 className="w-3.5 h-3.5" />,
  warning: <AlertTriangle className="w-3.5 h-3.5" />,
  error: <XCircle className="w-3.5 h-3.5" />,
};

const SEVERITY_COLOR = {
  passed: 'text-emerald-600',
  warning: 'text-amber-600',
  error: 'text-red-600',
};

const SEVERITY_BG = {
  passed: 'bg-emerald-500/10 border-emerald-500/30',
  warning: 'bg-amber-500/10 border-amber-500/30',
  error: 'bg-red-500/10 border-red-500/30',
};

export const ValidationReportPanel: React.FC<ValidationReportPanelProps> = ({ report }) => {
  if (!report) {
    return (
      <div className="p-4 rounded-lg bg-card border border-border flex items-center gap-2.5">
        <Gauge className="w-4 h-4 text-text-muted" />
        <p className="text-xs text-text-secondary">Validation runs automatically after code generation.</p>
      </div>
    );
  }

  const passedCount = report.checks.filter((c) => c.severity === 'passed').length;

  return (
    <div className="p-4 rounded-lg bg-card border border-border space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
          <Gauge className="w-4 h-4 text-indigo-600" />
          Static Analysis & Governance Checks
        </h4>
        <Badge variant={report.passed ? 'success' : 'error'} size="sm" dot>
          {report.passed ? `${passedCount}/${report.checks.length} passed` : 'Blocking issues'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {report.checks.map((check) => (
          <div key={check.id} className={cn('p-2.5 rounded-lg border space-y-0.5', SEVERITY_BG[check.severity])}>
            <div className="flex items-start gap-2">
              <span className={cn('mt-0.5 shrink-0', SEVERITY_COLOR[check.severity])}>{SEVERITY_ICON[check.severity]}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-text-primary">{check.title}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-card border border-border text-text-muted uppercase font-bold tracking-wide">
                    {check.category}
                  </span>
                </div>
                <p className="text-[10px] text-text-secondary leading-snug">{check.message}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Estimates */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <div className="p-2.5 rounded-lg bg-card border border-border flex items-center gap-2.5">
          <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
          <div>
            <div className="text-[10px] text-text-muted uppercase font-semibold">Est. Cost / month</div>
            <div className="text-sm font-bold text-text-primary font-mono">${report.estimatedCostPerMonth.toLocaleString()}</div>
          </div>
        </div>
        <div className="p-2.5 rounded-lg bg-card border border-border flex items-center gap-2.5">
          <Timer className="w-4 h-4 text-cyan-600 shrink-0" />
          <div>
            <div className="text-[10px] text-text-muted uppercase font-semibold">Est. Runtime / run</div>
            <div className="text-sm font-bold text-text-primary font-mono">
              {report.estimatedRuntimeMinutes === 0 ? 'Continuous' : `${report.estimatedRuntimeMinutes} min`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
