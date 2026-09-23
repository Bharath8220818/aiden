import React from 'react';
import { useStaggerReveal } from '@/hooks/useScrollReveal';
import { MessageSquareText, Workflow, Play, Gauge, HeartPulse, ShieldCheck } from 'lucide-react';

/**
 * StageRail — the platform's stages as DAG task ids. A pipeline run IS a
 * sequence, so ordering here encodes real information; the ids use the
 * product's own task naming instead of generic 01/02/03.
 */
const STAGES = [
  { id: 't_workspace', name: 'Workspace', icon: MessageSquareText, desc: 'Ask in plain language. AIDEN opens the right surface with the right project scope.' },
  { id: 't_design', name: 'Design', icon: Workflow, desc: 'Architecture and pipeline DAGs generated from your schemas, validated before anything runs.' },
  { id: 't_run', name: 'Run', icon: Play, desc: 'Execution with logs, retries, and row counts streaming back to the workspace.' },
  { id: 't_observe', name: 'Observe', icon: Gauge, desc: 'Telemetry, freshness, and quality gates watched continuously across sources.' },
  { id: 't_heal', name: 'Heal', icon: HeartPulse, desc: 'Failures become diagnosed, sandboxed fixes. You approve; outcomes feed memory.' },
  { id: 't_govern', name: 'Govern', icon: ShieldCheck, desc: 'RBAC, risk tiers, and an audit line for every agent action — no exceptions.' },
] as const;

export const StageRail: React.FC = () => {
  const ref = useStaggerReveal<HTMLDivElement>(80);

  return (
    <div ref={ref} className="rail">
      {STAGES.map((s) => (
        <div key={s.id} className="rail-task reveal">
          <div className="flex items-center justify-between">
            <span className="rt-id">{s.id}</span>
            <s.icon className="w-4 h-4 text-text-muted" strokeWidth={1.75} />
          </div>
          <div className="rt-name">{s.name}</div>
          <p className="rt-desc">{s.desc}</p>
        </div>
      ))}
    </div>
  );
};

export default StageRail;
