import React, { useId } from 'react';
import { cn } from '@/lib/utils';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

/** Themed checkbox with label/description, keyboard accessible. */
export const Checkbox: React.FC<CheckboxProps> = ({ label, description, className, id, ...props }) => {
  const autoId = useId();
  const inputId = id ?? `checkbox-${label?.replace(/\s+/g, '-').toLowerCase() ?? autoId}`;

  return (
    <label
      htmlFor={inputId}
      className={cn(
        'flex items-start gap-2.5 cursor-pointer select-none group',
        props.disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <span className="relative flex items-center justify-center mt-0.5 shrink-0">
        <input
          id={inputId}
          type="checkbox"
          className={cn(
            'peer w-4 h-4 appearance-none rounded border bg-background cursor-pointer',
            'border-border-highlight checked:bg-indigo-500 checked:border-indigo-500',
            'hover:border-border-highlight focus-visible:ring-2 focus-visible:ring-indigo-500/60',
            'transition-colors'
          )}
          {...props}
        />
        <svg
          className="pointer-events-none absolute w-2.5 h-2.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
        >
          <path d="M2.5 6.5L4.75 8.75L9.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {(label || description) && (
        <span className="min-w-0">
          {label && <span className="block text-xs font-medium text-text-primary group-hover:text-indigo-600 transition-colors">{label}</span>}
          {description && <span className="block text-[10px] text-text-muted leading-snug">{description}</span>}
        </span>
      )}
    </label>
  );
};

export default Checkbox;
