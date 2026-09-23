import React, { useId } from 'react';
import { cn } from '@/lib/utils';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  id?: string;
  className?: string;
  'aria-label'?: string;
}

/** Themed switch toggle, keyboard accessible. */
export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  id,
  className,
  ...ariaProps
}) => {
  const autoId = useId();
  const inputId = id ?? `toggle-${label?.replace(/\s+/g, '-').toLowerCase() ?? autoId}`;
  const dims = size === 'sm' ? { track: 'w-8 h-[18px]', knob: 'w-3.5 h-3.5', travel: 'translate-x-[14px]' } : { track: 'w-9 h-5', knob: 'w-4 h-4', travel: 'translate-x-4' };

  return (
    <label
      htmlFor={inputId}
      className={cn('flex items-start gap-2.5 cursor-pointer select-none', disabled && 'opacity-50 cursor-not-allowed', className)}
    >
      <button
        id={inputId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative rounded-full transition-colors shrink-0 focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus:outline-none',
          dims.track,
          checked ? 'bg-indigo-500' : 'bg-border'
        )}
        {...ariaProps}
      >
        <span
          className={cn(
            'absolute top-[2px] left-[2px] rounded-full bg-white shadow transition-transform',
            dims.knob,
            checked && dims.travel
          )}
        />
      </button>
      {(label || description) && (
        <span className="min-w-0">
          {label && <span className="block text-xs font-medium text-text-primary">{label}</span>}
          {description && <span className="block text-[10px] text-text-muted leading-snug">{description}</span>}
        </span>
      )}
    </label>
  );
};

export default Toggle;
