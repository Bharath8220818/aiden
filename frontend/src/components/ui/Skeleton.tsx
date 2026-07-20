import React from 'react';
import { cn } from '../../utils/cn';

export interface SkeletonProps {
  variant?: 'text' | 'rect' | 'circle' | 'card';
  width?: string | number;
  height?: string | number;
  className?: string;
  count?: number;
}

const variants = {
  text: 'h-4 rounded-lg',
  rect: 'rounded-xl',
  circle: 'rounded-full',
  card: 'rounded-2xl h-48',
};

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  className,
  count = 1,
}) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'skeleton',
            variants[variant],
            className
          )}
          style={{
            width: width || (variant === 'text' ? '100%' : undefined),
            height: height || undefined,
          }}
        />
      ))}
    </>
  );
};

Skeleton.displayName = 'Skeleton';

// ─── Preset Skeletons ──────────────────────────────────────────────────────────

export const StatsCardSkeleton: React.FC = () => (
  <div className="card space-y-3">
    <Skeleton variant="text" width="40%" />
    <Skeleton variant="text" width="60%" height="2rem" />
    <Skeleton variant="text" width="30%" />
  </div>
);

export const TableRowSkeleton: React.FC = () => (
  <div className="flex items-center gap-4 p-4">
    <Skeleton variant="circle" width={40} height={40} />
    <div className="flex-1 space-y-2">
      <Skeleton variant="text" width="60%" />
      <Skeleton variant="text" width="40%" />
    </div>
    <Skeleton variant="rect" width={80} height={32} />
  </div>
);

export const PageSkeleton: React.FC = () => (
  <div className="space-y-6 p-6 animate-fade-in">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton variant="text" width={120} />
        <Skeleton variant="text" width={200} height={32} />
      </div>
      <Skeleton variant="rect" width={140} height={40} />
    </div>
    <div className="grid grid-cols-4 gap-4">
      <StatsCardSkeleton />
      <StatsCardSkeleton />
      <StatsCardSkeleton />
      <StatsCardSkeleton />
    </div>
    <div className="card">
      <div className="space-y-4">
        <TableRowSkeleton />
        <TableRowSkeleton />
        <TableRowSkeleton />
        <TableRowSkeleton />
      </div>
    </div>
  </div>
);
