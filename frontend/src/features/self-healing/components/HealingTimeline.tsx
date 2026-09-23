import React from 'react';
import { HealingRun, HealingStage } from '../types';
import { cn } from '@/lib/utils';
import {
  Radar,
  Search,
  Crosshair,
  Wand2,
  FlaskConical,
  UserCheck,
  Rocket,
  RotateCcw,
  Activity,
  GraduationCap,
  Check,
  Circle,
  Loader2,
  Bot,
  User,
} from 'lucide-react';

const STAGE_ICONS: Record<HealingStage, JSX.Element> = {
  detected: <Radar className="w-3.5 h-3.5" />,
  investigating: <Search className="w-3.5 h-3.5" />,
  root_cause: <Crosshair className="w-3.5 h-3.5" />,
  generating_fix: <Wand2 className="w-3.5 h-3.5" />,
  sandbox_testing: <FlaskConical className="w-3.5 h-3.5" />,
  awaiting_approval: <UserCheck className="w-3.5 h-3.5" />,
  deploying: <Rocket className="w-3.5 h-3.5" />,
  rerunning: <RotateCcw className="w-3.5 h-3.5" />,
  monitoring: <Activity className="w-3.5 h-3.5" />,
  learned: <GraduationCap className="w-3.5 h-3.5" />,
  failed: <Circle className="w-3.5 h-3.5" />,
};

const LOOP_ORDER: HealingStage[] = [
  'detected',
  'investigating',
  'root_cause',
  'generating_fix',
  'sandbox_testing',
  'awaiting_approval',
  'deploying',
  'rerunning',
  'monitoring',
  'learned',
];

const STAGE_SHORT: Record<HealingStage, string> = {
  detected: 'Detect',
  investigating: 'Investigate',
  root_cause: 'Root Cause',
  generating_fix: 'Generate Fix',
  sandbox_testing: 'Sandbox',
  awaiting_approval: 'Approval',
  deploying: 'Deploy',
  rerunning: 'Rerun',
  monitoring: 'Monitor',
  learned: 'Learn',
  failed: 'Failed',
};

export interface HealingTimelineProps {
  run: HealingRun | null;
}

export const HealingTimeline: React.FC<HealingTimelineProps> = ({ run }) => {
  const currentIndex = run ? LOOP_ORDER.indexOf(run.stage) : -1;

  return (
    <div className="space-y-3">
      {/* Compact loop track */}
      <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar py-1">
        {LOOP_ORDER.map((stage, idx) => {
          const done = idx < currentIndex;
          const active = idx === currentIndex;
          return (
            <React.Fragment key={stage}>
              <div
                className={cn(
                  'flex flex-col items-center gap-1 px-1.5 shrink-0',
                  done && 'text-emerald-600',
                  active && 'text-indigo-600',
                  !done && !active && 'text-text-muted'
                )}
              >
                <span
                  className={cn(
                    'w-7 h-7 rounded-full border flex items-center justify-center transition-all',
                    done && 'bg-emerald-500/15 border-emerald-500/50',
                    active && 'bg-indigo-500/20 border-indigo-400 ring-2 ring-indigo-500/40',
                    !done && !active && 'border-border bg-card'
                  )}
                >
                  {active && run?.stage === 'sandbox_testing' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : done ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    STAGE_ICONS[stage]
                  )}
                </span>
                <span className="text-[8px] font-bold uppercase tracking-wide whitespace-nowrap">{STAGE_SHORT[stage]}</span>
              </div>
              {idx < LOOP_ORDER.length - 1 && (
                <div className={cn('h-px w-3 shrink-0', idx < currentIndex ? 'bg-emerald-500/60' : 'bg-border')} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Event feed */}
      {run && (
        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
          {[...run.timeline].reverse().map((event, idx) => (
            <div key={event.id} className="flex items-start gap-2.5">
              <span
                className={cn(
                  'w-6 h-6 rounded-full border flex items-center justify-center shrink-0 mt-0.5',
                  event.actor === 'human'
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-600'
                    : 'bg-indigo-500/15 border-indigo-500/40 text-indigo-600'
                )}
              >
                {event.actor === 'human' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
              </span>
              <div className="min-w-0 flex-1 pb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-text-primary">{event.label}</span>
                  {idx === 0 && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-600 font-bold uppercase">
                      current
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-text-secondary leading-snug">{event.detail}</p>
                <span className="text-[9px] font-mono text-text-muted">
                  {event.actor === 'human' ? 'engineer' : 'AIDEN'} · {new Date(event.at).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!run && (
        <p className="text-[11px] text-text-muted text-center py-4">
          Start the loop to watch AIDEN detect → diagnose → fix → verify → deploy → learn.
        </p>
      )}
    </div>
  );
};
