import React from 'react';
import { ValidationCheckItem } from '../types';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ContractValidationStatusProps {
  checks: ValidationCheckItem[];
}

export const ContractValidationStatus: React.FC<ContractValidationStatusProps> = ({ checks }) => {
  const allPassed = checks.every((c) => c.passed);

  return (
    <div className="p-4 rounded-lg bg-[#0F1115] border border-[#242831] space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#F5F7FA] flex items-center gap-1.5">
          <CheckCircle2 className={cn('w-4 h-4', allPassed ? 'text-emerald-400' : 'text-amber-400')} />
          Requirements & Contract Validation Status
        </h4>
        <span className="text-[10px] text-[#9CA3AF] font-mono">
          {checks.filter((c) => c.passed).length}/{checks.length} PASSED
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        {checks.map((check) => (
          <div
            key={check.id}
            className="flex items-start gap-2 p-2.5 rounded bg-[#14171C] border border-[#1F242C]"
          >
            {check.passed ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5">
              <span className="font-semibold text-[#F5F7FA] text-xs block">
                {check.title}
              </span>
              <span className="text-[11px] text-[#9CA3AF] block leading-snug">
                {check.message}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
