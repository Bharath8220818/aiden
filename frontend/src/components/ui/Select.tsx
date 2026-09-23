import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options?: SelectOption[];
  error?: string;
  helperText?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options = [], error, helperText, disabled, children, ...props }, ref) => {
    return (
      <div className="w-full relative">
        <div className="relative">
          <select
            ref={ref}
            disabled={disabled}
            className={cn(
              'w-full appearance-none bg-card text-text-primary text-sm rounded-md border border-border px-3.5 py-2 pr-9 transition-all duration-150',
              'focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/80',
              'hover:border-border-highlight',
              'disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
              error && 'border-red-500/70 focus:border-red-500',
              className
            )}
            {...props}
          >
            {options.length > 0
              ? options.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.disabled}
                    className="bg-card text-text-primary"
                  >
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
        </div>
        {error ? (
          <p className="mt-1 text-xs text-red-600">{error}</p>
        ) : helperText ? (
          <p className="mt-1 text-xs text-text-muted">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
Select.displayName = 'Select';
