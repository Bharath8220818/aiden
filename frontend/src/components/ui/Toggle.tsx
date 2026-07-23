import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const sizeStyles = {
  sm: { track: 'w-8 h-4', thumb: 'w-3 h-3', translateX: 'translate-x-4' },
  md: { track: 'w-11 h-6', thumb: 'w-5 h-5', translateX: 'translate-x-5' },
};

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  className,
}) => {
  const dims = sizeStyles[size];

  return (
    <label className={cn('flex items-start gap-3 cursor-pointer', disabled && 'opacity-50 cursor-not-allowed', className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative inline-flex shrink-0 rounded-full transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:ring-offset-2 focus:ring-offset-[#050816]',
          dims.track,
          checked ? 'bg-purple-600' : 'bg-[#1E293B]'
        )}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={cn(
            'inline-block rounded-full bg-white shadow-sm',
            dims.thumb,
            checked ? dims.translateX : 'translate-x-0.5'
          )}
          style={{ marginTop: size === 'sm' ? '2px' : '2px', marginLeft: 0 }}
        />
      </button>
      {(label || description) && (
        <div className="flex flex-col">
          {label && <span className="text-sm font-medium text-gray-200">{label}</span>}
          {description && <span className="text-xs text-gray-500">{description}</span>}
        </div>
      )}
    </label>
  );
};

Toggle.displayName = 'Toggle';
