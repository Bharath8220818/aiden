import React from 'react';
import { ContractQualityRule } from '../types';
import { Badge } from '@/components/ui/Badge';
import { CheckCircle2, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface QualityRulesListProps {
  rules: ContractQualityRule[];
}

export const QualityRulesList: React.FC<QualityRulesListProps> = ({ rules }) => {
  const typeIcons: Record<string, React.ReactNode> = {
    uniqueness: <Zap className="w-3.5 h-3.5 text-amber-400" />,
    completeness: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />,
    freshness: <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />,
    regex_pattern: <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />,
    custom_sql: <AlertTriangle className="w-3.5 h-3.5 text-cyan-400" />,
  };

  return (
    <div className="space-y-2.5">
      {rules.map((rule) => {
        const isError = rule.severity === 'error';
        return (
          <div
            key={rule.id}
            className="p-3 rounded-lg bg-[#0F1115] border border-[#242831] hover:border-[#383F4D] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-start gap-2.5">
              <div className="p-1 rounded bg-[#14171C] border border-[#242831] mt-0.5">
                {typeIcons[rule.ruleType] || <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#F5F7FA]">
                    {rule.assertion}
                  </span>
                  {rule.targetColumn && (
                    <Badge variant="neutral" size="sm" className="font-mono">
                      col: {rule.targetColumn}
                    </Badge>
                  )}
                </div>
                <span className="text-[11px] text-[#9CA3AF] block">
                  Enforcement Threshold: {rule.threshold}
                </span>
              </div>
            </div>

            <div className="sm:shrink-0 flex items-center gap-2">
              <Badge
                variant={isError ? 'error' : 'warning'}
                size="sm"
                dot
              >
                {isError ? 'Blocking Error' : 'Warning Alert'}
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
};
