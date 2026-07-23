import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { Inbox } from 'lucide-react';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: { label: string; onClick: () => void; variant?: 'primary' | 'secondary' };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: { icon: 'text-3xl', title: 'text-base', padding: 'p-8' },
  md: { icon: 'text-5xl', title: 'text-lg', padding: 'p-12' },
  lg: { icon: 'text-7xl', title: 'text-xl', padding: 'p-16' },
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  className,
  size = 'md',
}) => {
  const s = sizes[size];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        'rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700',
        'bg-white dark:bg-gray-800/50',
        s.padding,
        className
      )}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 0.1 }}
        className={cn(
          'flex items-center justify-center',
          'rounded-2xl bg-gray-100 dark:bg-gray-700/50',
          'w-20 h-20 mb-4',
          s.icon
        )}
      >
        {icon || <Inbox className="w-10 h-10 text-gray-400 dark:text-gray-500" />}
      </motion.div>

      <h3 className={cn(
        'font-bold text-gray-900 dark:text-white',
        s.title
      )}>
        {title}
      </h3>

      <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
        {description}
      </p>

      {action && (
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={action.onClick}
          className={cn(
            'mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm transition-all',
            action.variant === 'secondary'
              ? 'border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
              : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
          )}
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
};

EmptyState.displayName = 'EmptyState';
