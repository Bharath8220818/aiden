import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';

export interface ToastProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  onClose: () => void;
  action?: { label: string; onClick: () => void };
  isVisible?: boolean;
}

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const colors = {
  success: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400',
  error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-400',
  info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400',
};

const iconColors = {
  success: 'text-green-600 dark:text-green-400',
  error: 'text-red-600 dark:text-red-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
  info: 'text-blue-600 dark:text-blue-400',
};

export const Toast: React.FC<ToastProps> = ({ type, title, message, duration = 4000, onClose, action, isVisible = true }) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setExiting(true);
        setTimeout(onClose, 300);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const Icon = icons[type];

  const handleClose = () => {
    setExiting(true);
    setTimeout(onClose, 300);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 100, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.95 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className={cn(
            'pointer-events-auto fixed top-4 right-4 z-50 max-w-sm w-full',
            'p-4 rounded-xl border shadow-lg',
            'flex items-start gap-3',
            colors[type],
            exiting ? 'animate-toast-out' : 'animate-toast-in'
          )}
        >
          <Icon className={cn('h-5 w-5 mt-0.5 shrink-0', iconColors[type])} />

          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm">{title}</h4>
            {message && <p className="text-sm opacity-90 mt-0.5">{message}</p>}
          </div>

          {action && (
            <button
              onClick={action.onClick}
              className="text-sm font-semibold underline-offset-2 hover:underline shrink-0 whitespace-nowrap"
            >
              {action.label}
            </button>
          )}

          <button
            onClick={handleClose}
            className="shrink-0 opacity-50 hover:opacity-100 transition-opacity p-0.5"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

Toast.displayName = 'Toast';
