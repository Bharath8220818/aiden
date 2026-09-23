import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { EngineeringCycleStep } from '../types';
import {
  Brain,
  CalendarCheck,
  Network,
  Code,
  ShieldCheck,
  Rocket,
  Activity,
  Eye,
  Search,
  Wrench,
  TestTube,
  GraduationCap,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export interface EngineeringLoopProps {
  steps: EngineeringCycleStep[];
}

export const EngineeringLoop: React.FC<EngineeringLoopProps> = ({ steps }) => {
  const [hoveredStep, setHoveredStep] = useState<EngineeringCycleStep | null>(null);

  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Brain,
    CalendarCheck,
    Network,
    Code,
    ShieldCheck,
    Rocket,
    Activity,
    Eye,
    Search,
    Wrench,
    TestTube,
    GraduationCap,
  };

  // 12 steps split into Top Row (1 to 6) and Bottom Row (7 to 12 in reverse or order)
  const topRow = steps.slice(0, 6);
  // Bottom row represents feedback loop: MONITOR -> DETECT -> DIAGNOSE -> REPAIR -> TEST -> LEARN
  const bottomRow = steps.slice(6, 12);

  return (
    <Card className="p-5 bg-card border-border overflow-hidden relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-text-primary tracking-tight uppercase">
              Autonomous Closed-Loop Data Engineering Cycle
            </h3>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Continuous self-driving cycle: from requirements intent to autonomous self-healing & telemetry learning
          </p>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-text-secondary">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Completed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" /> Active Stage
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-border-highlight" /> Autonomous Standby
          </span>
        </div>
      </div>

      {/* Interactive Loop Flow */}
      <div className="space-y-4">
        {/* Top Track: UNDERSTAND -> PLAN -> DESIGN -> BUILD -> VALIDATE -> DEPLOY */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 relative">
          {topRow.map((step, idx) => {
            const Icon = iconMap[step.iconName] || Brain;
            const isLast = idx === topRow.length - 1;
            const isCompleted = step.status === 'completed';
            const isActive = step.status === 'active';

            return (
              <div key={step.step} className="relative flex items-center">
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  onMouseEnter={() => setHoveredStep(step)}
                  onMouseLeave={() => setHoveredStep(null)}
                  className={cn(
                    'w-full p-3 rounded-lg border transition-all duration-200 cursor-pointer text-left',
                    isActive
                      ? 'bg-indigo-950/40 border-indigo-500 shadow-ai-glow'
                      : isCompleted
                      ? 'bg-border border-border-highlight hover:border-border-highlight'
                      : 'bg-card border-border opacity-60'
                  )}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono font-bold text-text-muted">
                      0{step.step}
                    </span>
                    <Icon
                      className={cn(
                        'w-4 h-4',
                        isActive
                          ? 'text-indigo-600 animate-pulse'
                          : isCompleted
                          ? 'text-emerald-600'
                          : 'text-text-muted'
                      )}
                    />
                  </div>
                  <p className="text-xs font-bold text-text-primary tracking-wide truncate">
                    {step.name}
                  </p>
                  <p className="text-[10px] text-text-secondary truncate mt-0.5">
                    {step.autonomousAgent}
                  </p>
                </motion.div>

                {/* Arrow to next card in top track */}
                {!isLast && (
                  <div className="hidden lg:flex absolute -right-2 z-10 text-border-highlight">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Connector row with directional flow arrows */}
        <div className="hidden lg:flex items-center justify-between px-6 text-border-highlight">
          <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold font-mono animate-pulse">
            <ArrowUp className="w-4 h-4" />
            <span>LEARNING REINFORCEMENT ↺</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-emerald-600 font-semibold font-mono">
            <span>REAL-TIME TELEMETRY</span>
            <ArrowDown className="w-4 h-4 animate-bounce" />
          </div>
        </div>

        {/* Bottom Track: Reversed feedback flow: LEARN <- TEST <- REPAIR <- DIAGNOSE <- DETECT <- MONITOR */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 relative">
          {/* We display them in order of flow: MONITOR -> DETECT -> DIAGNOSE -> REPAIR -> TEST -> LEARN */}
          {bottomRow.map((step, idx) => {
            const Icon = iconMap[step.iconName] || Activity;
            const isLast = idx === bottomRow.length - 1;
            const isCompleted = step.status === 'completed';
            const isActive = step.status === 'active';

            return (
              <div key={step.step} className="relative flex items-center">
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  onMouseEnter={() => setHoveredStep(step)}
                  onMouseLeave={() => setHoveredStep(null)}
                  className={cn(
                    'w-full p-3 rounded-lg border transition-all duration-200 cursor-pointer text-left',
                    isActive
                      ? 'bg-indigo-950/40 border-indigo-500 shadow-ai-glow'
                      : isCompleted
                      ? 'bg-border border-border-highlight hover:border-border-highlight'
                      : 'bg-card border-border'
                  )}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono font-bold text-text-muted">
                      {step.step < 10 ? `0${step.step}` : step.step}
                    </span>
                    <Icon
                      className={cn(
                        'w-4 h-4',
                        isActive
                          ? 'text-cyan-600 animate-pulse'
                          : isCompleted
                          ? 'text-emerald-600'
                          : 'text-text-muted'
                      )}
                    />
                  </div>
                  <p className="text-xs font-bold text-text-primary tracking-wide truncate">
                    {step.name}
                  </p>
                  <p className="text-[10px] text-text-secondary truncate mt-0.5">
                    {step.autonomousAgent}
                  </p>
                </motion.div>

                {/* Arrow indicating flow towards the feedback loop */}
                {!isLast && (
                  <div className="hidden lg:flex absolute -right-2 z-10 text-border-highlight">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Hover Info Card Preview */}
      <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-xs">
        {hoveredStep ? (
          <div className="flex items-center gap-3 text-indigo-600">
            <span className="font-bold text-white uppercase font-mono">
              Stage {hoveredStep.step}: {hoveredStep.name}
            </span>
            <span className="text-text-secondary">•</span>
            <span className="text-text-primary">{hoveredStep.description}</span>
            <span className="text-text-secondary">•</span>
            <span className="text-cyan-600 font-medium">
              Handled by: {hoveredStep.autonomousAgent}
            </span>
          </div>
        ) : (
          <span className="text-text-muted italic">
            Hover over any stage in the closed loop to inspect autonomous agent actions
          </span>
        )}
        <span className="text-[10px] font-mono text-text-muted hidden sm:inline">
          AUTONOMOUS CYCLE ACTIVE (100% COVERAGE)
        </span>
      </div>
    </Card>
  );
};
