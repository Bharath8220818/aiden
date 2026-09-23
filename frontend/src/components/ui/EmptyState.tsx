import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-lg border border-dashed border-border bg-card/40 my-4',
        className
      )}
    >
      {icon && (
        <div className="p-3 mb-3 rounded-full bg-card-hover text-text-secondary border border-border">
          {icon}
        </div>
      )}
      <h4 className="text-sm font-semibold text-text-primary">{title}</h4>
      <p className="mt-1 text-xs text-text-secondary max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <div className="mt-4">
          <Button size="sm" variant="secondary" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
