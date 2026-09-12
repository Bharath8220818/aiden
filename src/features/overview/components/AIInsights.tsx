import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AIInsightItem } from '../types';
import { Sparkles, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface AIInsightsProps {
  insights: AIInsightItem[];
}

export const AIInsights: React.FC<AIInsightsProps> = ({ insights }) => {
  const navigate = useNavigate();

  return (
    <Card className="bg-[#14171C] border-[#242831] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#1F242C] bg-gradient-to-r from-indigo-950/20 via-transparent to-transparent">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-ai-glow">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#F5F7FA] flex items-center gap-2">
              AI Insights
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                Autonomous Intelligence
              </span>
            </h3>
            <p className="text-xs text-[#9CA3AF]">
              AIDEN proactive root cause discovery & optimization opportunities
            </p>
          </div>
        </div>
      </div>

      {/* Insight Items */}
      <div className="divide-y divide-[#1F242C]">
        {insights.map((insight) => {
          const isWarning = insight.severity === 'warning';
          const isSuccess = insight.severity === 'success';

          return (
            <div
              key={insight.id}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#181B22]/60 transition-colors"
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border mt-0.5',
                    isWarning && 'bg-amber-500/10 border-amber-500/25 text-amber-400',
                    isSuccess && 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400',
                    !isWarning && !isSuccess && 'bg-indigo-500/10 border-indigo-500/25 text-indigo-400'
                  )}
                >
                  {isWarning ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-semibold text-[#F5F7FA]">
                      {insight.title}
                    </h4>
                    <span className="text-[10px] text-[#6B7280]">
                      {insight.timestamp}
                    </span>
                  </div>

                  <p className="text-xs text-[#9CA3AF] max-w-2xl leading-relaxed">
                    {insight.message}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {insight.affectedResources.map((res, rIdx) => (
                      <span
                        key={rIdx}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0B0D10] text-[#9CA3AF] border border-[#242831]"
                      >
                        {res}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="sm:shrink-0 flex items-center justify-end">
                <Button
                  size="sm"
                  variant={isWarning ? 'secondary' : 'primary'}
                  onClick={() => {
                    if (insight.actionRoute) {
                      navigate(insight.actionRoute);
                    }
                  }}
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  className="text-xs"
                >
                  {insight.actionLabel}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
