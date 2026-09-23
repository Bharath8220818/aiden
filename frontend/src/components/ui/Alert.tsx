import React from 'react';
import { cn } from '@/lib/utils';
import { Info, AlertTriangle, XCircle, CheckCircle2, X } from 'lucide-react';

export type AlertVariant = 'info' | 'warning' | 'error' | 'success';

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  /** Optional close affordance. */
  onClose?: () => void;
  className?: string;
}

const META: Record<AlertVariant, { icon: React.ReactNode; styles: string; iconColor: string }> = {
  info: {
    icon: <Info className="w-4 h-4" />,
    styles: 'bg-blue-500/10 border-blue-500/30',
    iconColor: 'text-blue-600',
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4" />,
    styles: 'bg-amber-500/10 border-amber-500/30',
    iconColor: 'text-amber-600',
  },
  error: {
    icon: <XCircle className="w-4 h-4" />,
    styles: 'bg-red-500/10 border-red-500/30',
    iconColor: 'text-red-600',
  },
  success: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    styles: 'bg-emerald-500/10 border-emerald-500/30',
    iconColor: 'text-emerald-600',
  },
};

/** Inline banner for persistent status messaging (use Toasts for transient events). */
export const Alert: React.FC<AlertProps> = ({ variant = 'info', title, children, onClose, className }) => {
  const meta = META[variant];

  return (
    <div role={variant === 'error' ? 'alert' : 'status'} className={cn('flex items-start gap-2.5 p-3 rounded-lg border', meta.styles, className)}>
      <span className={cn('mt-0.5 shrink-0', meta.iconColor)}>{meta.icon}</span>
      <div className="min-w-0 flex-1">
        {title && <p className="text-xs font-bold text-text-primary">{title}</p>}
        <div className={cn('text-[11px] text-text-secondary leading-snug', title && 'mt-0.5')}>{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Dismiss"
          className="p-0.5 rounded text-text-muted hover:text-text-primary hover:bg-card-active transition-colors shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export default Alert;
