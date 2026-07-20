import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

export interface ProgressProps {
  value: number;
  max?: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'gradient';
  showValue?: boolean;
  className?: string;
  animated?: boolean;
}

const sizes = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

const colors = {
  blue: 'bg-blue-600 dark:bg-blue-500',
  green: 'bg-green-600 dark:bg-green-500',
  red: 'bg-red-600 dark:bg-red-500',
  yellow: 'bg-yellow-600 dark:bg-yellow-500',
  gradient: 'bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500',
};

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  label,
  size = 'md',
  color = 'blue',
  showValue = true,
  className,
  animated = true,
}) => {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {label}
            </span>
          )}
          {showValue && (
            <motion.span
              key={Math.round(percentage)}
              initial={animated ? { scale: 1.3 } : undefined}
              animate={{ scale: 1 }}
              className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums"
            >
              {Math.round(percentage)}%
            </motion.span>
          )}
        </div>
      )}

      <div
        className={cn(
          'w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden',
          sizes[size]
        )}
      >
        <motion.div
          initial={animated ? { width: 0 } : { width: `${percentage}%` }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={cn(
            'h-full rounded-full',
            colors[color],
            animated && 'transition-all duration-500 ease-out'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

Progress.displayName = 'Progress';
