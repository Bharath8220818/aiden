import React from 'react';
import { cn } from '@/lib/utils';

export interface DividerProps {
  /** Optional centered label (e.g. "OR") rendered over the rule. */
  label?: string;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

/** Themed horizontal/vertical rule with optional label. */
export const Divider: React.FC<DividerProps> = ({ label, orientation = 'horizontal', className }) => {
  if (orientation === 'vertical') {
    return <span aria-hidden="true" className={cn('inline-block w-px self-stretch bg-border', className)} />;
  }

  if (label) {
    return (
      <div role="separator" className={cn('flex items-center gap-3', className)}>
        <span className="flex-1 h-px bg-border" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{label}</span>
        <span className="flex-1 h-px bg-border" />
      </div>
    );
  }

  return <hr aria-hidden="true" className={cn('border-0 h-px bg-border', className)} />;
};

export default Divider;
