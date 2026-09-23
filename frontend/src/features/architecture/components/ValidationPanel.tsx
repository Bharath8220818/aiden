import React from 'react';
import { ArchitectureValidationReport } from '../types';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, XCircle, Info, ScanSearch } from 'lucide-react';

export interface ValidationPanelProps {
  report: ArchitectureValidationReport | null;
  isRunning?: boolean;
}

const SEVERITY_STYLE = {
  error: { icon: <XCircle className="w-3.5 h-3.5" />, text: 'text-red-600', bg: 'bg-red-500/10 border-red-500/30' },
  warning: { icon: <AlertTriangle className="w-3.5 h-3.5" />, text: 'text-amber-600', bg: 'bg-amber-500/10 border-amber-500/30' },
  info: { icon: <Info className="w-3.5 h-3.5" />, text: 'text-blue-600', bg: 'bg-blue-500/10 border-blue-500/30' },
};

export const ValidationPanel: React.FC<ValidationPanelProps> = ({ report, isRunning }) => {
  if (isRunning) {
    return (
      <div className="p-4 space-y-2.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 rounded-md bg-card-hover animate-pulse" />
        ))}
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <ScanSearch className="w-6 h-6 text-text-muted mb-2" />
        <p className="text-xs text-text-secondary">Run validation to check DAG integrity, contracts, and topology rules.</p>
      </div>
    );
  }

  const counts = {
    error: report.issues.filter((i) => i.severity === 'error').length,
    warning: report.issues.filter((i) => i.severity === 'warning').length,
    info: report.issues.filter((i) => i.severity === 'info').length,
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {report.passed ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <XCircle className="w-4 h-4 text-red-600" />
            )}
            <span className="text-xs font-bold text-text-primary">
              {report.passed ? 'Blueprint valid' : 'Issues found'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {counts.error > 0 && <Badge variant="error" size="sm">{counts.error}</Badge>}
            {counts.warning > 0 && <Badge variant="warning" size="sm">{counts.warning}</Badge>}
            {counts.info > 0 && <Badge variant="info" size="sm">{counts.info}</Badge>}
          </div>
        </div>

        {/* Topology stats */}
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { label: 'Nodes', value: report.stats.nodes },
            { label: 'Edges', value: report.stats.edges },
            { label: 'Orphans', value: report.stats.orphanNodes },
            { label: 'Contracts', value: `${report.stats.contractCoverage}%` },
          ].map((stat) => (
            <div key={stat.label} className="p-2 rounded bg-card border border-border-subtle text-center">
              <div className="text-sm font-bold text-text-primary font-mono">{stat.value}</div>
              <div className="text-[9px] uppercase text-text-muted">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {report.issues.length === 0 ? (
          <p className="text-xs text-emerald-600">No issues detected. Topology is a valid DAG with full connectivity.</p>
        ) : (
          report.issues.map((issue) => {
            const style = SEVERITY_STYLE[issue.severity];
            return (
              <div key={issue.id} className={cn('p-2.5 rounded-lg border space-y-0.5', style.bg)}>
                <div className="flex items-start gap-2">
                  <span className={cn('mt-0.5', style.text)}>{style.icon}</span>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-text-primary">{issue.title}</div>
                    <p className="text-[10px] text-text-secondary leading-snug">{issue.message}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="px-4 py-2.5 border-t border-border">
        <p className="text-[9px] text-text-muted font-mono">
          Last checked: {new Date(report.checkedAt).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};
