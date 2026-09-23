import React from 'react';
import { FixPatch, RootCause } from '../types';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { FileCode, Crosshair, Quote, Building2, Clock } from 'lucide-react';

export interface CodeDiffViewerProps {
  patches: FixPatch[];
}

export const CodeDiffViewer: React.FC<CodeDiffViewerProps> = ({ patches }) => {
  return (
    <div className="space-y-3">
      {patches.map((patch) => (
        <div key={patch.fileName} className="rounded-lg border border-border overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 bg-card border-b border-border">
            <FileCode className="w-3.5 h-3.5 text-purple-600" />
            <span className="text-[11px] font-mono font-semibold text-text-primary">{patch.fileName}</span>
            <Badge variant="neutral" size="sm" className="ml-auto font-mono">{patch.language}</Badge>
          </div>
          <pre className="p-3 text-[10px] font-mono leading-relaxed overflow-x-auto bg-background">
            {patch.after.split('\n').map((line, idx) => {
              const isAdd = line.startsWith('+');
              const isContext = line.startsWith('-');
              return (
                <div
                  key={idx}
                  className={cn(
                    'px-1 whitespace-pre-wrap',
                    isAdd && 'bg-emerald-500/10 text-emerald-600 border-l-2 border-emerald-500',
                    isContext && 'bg-red-500/5 text-text-muted border-l-2 border-red-500/50',
                    !isAdd && !isContext && 'text-text-secondary border-l-2 border-transparent'
                  )}
                >
                  {line || ' '}
                </div>
              );
            })}
          </pre>
        </div>
      ))}
    </div>
  );
};

export interface RootCauseCardProps {
  cause: RootCause;
}

export const RootCauseCard: React.FC<RootCauseCardProps> = ({ cause }) => {
  const CATEGORY_LABEL: Record<string, string> = {
    schema_drift: 'Schema Drift',
    data_volume: 'Data Volume',
    dependency: 'Upstream Dependency',
    infra_resource: 'Infrastructure',
    code_defect: 'Code Defect',
    credentials: 'Credentials',
  };

  return (
    <div className="p-4 rounded-lg bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/30 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <span className="p-1.5 rounded-md bg-indigo-500/20 text-indigo-600 shrink-0">
            <Crosshair className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-text-primary leading-snug">{cause.title}</h4>
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant="ai" size="sm">{CATEGORY_LABEL[cause.category] ?? cause.category}</Badge>
              <Badge variant="success" size="sm" dot>{cause.confidence}% confidence</Badge>
            </div>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-text-secondary leading-relaxed">{cause.explanation}</p>

      <div className="space-y-1">
        <span className="text-[9px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
          <Quote className="w-3 h-3" /> Evidence
        </span>
        {cause.evidence.map((ev, i) => (
          <div key={i} className="flex items-start gap-2 text-[10px] p-2 rounded bg-background border border-border-subtle">
            <Building2 className="w-3 h-3 text-text-muted mt-0.5 shrink-0" />
            <div>
              <span className="font-mono text-indigo-600">{ev.source}</span>
              <span className="text-text-secondary"> — {ev.detail}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export interface BlastRadiusProps {
  downstream: string[];
  dashboards: string[];
  staleMinutes: number;
}

export const BlastRadius: React.FC<BlastRadiusProps> = ({ downstream, dashboards, staleMinutes }) => (
  <div className="grid grid-cols-3 gap-2">
    <div className="p-2.5 rounded-lg bg-card border border-border text-center">
      <div className="text-lg font-bold font-mono text-amber-600">{downstream.length}</div>
      <div className="text-[9px] uppercase text-text-muted">Downstream</div>
    </div>
    <div className="p-2.5 rounded-lg bg-card border border-border text-center">
      <div className="text-lg font-bold font-mono text-red-600">{dashboards.length}</div>
      <div className="text-[9px] uppercase text-text-muted">Dashboards</div>
    </div>
    <div className="p-2.5 rounded-lg bg-card border border-border text-center">
      <div className="text-lg font-bold font-mono text-cyan-600 flex items-center justify-center gap-1">
        <Clock className="w-3.5 h-3.5" />
        {staleMinutes}m
      </div>
      <div className="text-[9px] uppercase text-text-muted">Staleness</div>
    </div>
  </div>
);
