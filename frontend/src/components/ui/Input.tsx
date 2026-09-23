import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', leftIcon, rightIcon, error, helperText, disabled, ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-text-muted">
              {leftIcon}
            </div>
          )}
          <input
            type={type}
            ref={ref}
            disabled={disabled}
            className={cn(
              'w-full bg-card text-text-primary placeholder-[#9CA3AF] text-sm rounded-md border border-border px-3.5 py-2 transition-all duration-150',
              'focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/80',
              'hover:border-border-highlight',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              leftIcon && 'pl-9',
              rightIcon && 'pr-9',
              error && 'border-red-500/70 focus:border-red-500 focus:ring-red-500/50',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 flex items-center text-text-muted">
              {rightIcon}
            </div>
          )}
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
Input.displayName = 'Input';
