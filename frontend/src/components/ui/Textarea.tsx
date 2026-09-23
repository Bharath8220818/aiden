import React, { useId } from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

/** Themed multiline text input with optional label/error/hint. */
export const Textarea: React.FC<TextareaProps> = ({ label, error, hint, className, id, ...props }) => {
  const autoId = useId();
  const inputId = id ?? `textarea-${label?.replace(/\s+/g, '-').toLowerCase() ?? autoId}`;

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={cn(
          'w-full bg-background text-text-primary placeholder-[#9CA3AF] text-sm rounded-lg border p-3',
          'focus:outline-none focus:ring-1 transition-colors resize-y min-h-[80px]',
          error
            ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500'
            : 'border-border focus:border-indigo-500/80 focus:ring-indigo-500/80',
          className
        )}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-[11px] text-red-600">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${inputId}-hint`} className="text-[11px] text-text-muted">
          {hint}
        </p>
      )}
    </div>
  );
};

export default Textarea;
