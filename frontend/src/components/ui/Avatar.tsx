import React from 'react';
import { cn } from '@/lib/utils';

export interface AvatarProps {
  src?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  status?: 'online' | 'busy' | 'away' | 'offline';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  status,
  className,
}) => {
  const getInitials = (n: string) => {
    return n
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
  };

  const statusColors = {
    online: 'bg-emerald-500',
    busy: 'bg-red-500',
    away: 'bg-amber-500',
    offline: 'bg-gray-500',
  };

  return (
    <div className="relative inline-block">
      <div
        className={cn(
          'relative flex items-center justify-center rounded-full font-semibold select-none overflow-hidden',
          'bg-gradient-to-br from-indigo-500/20 to-purple-600/30 text-indigo-200 border border-indigo-500/30',
          sizeClasses[size],
          className
        )}
      >
        {src ? (
          <img src={src} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span>{getInitials(name)}</span>
        )}
      </div>
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 block rounded-full ring-2 ring-surface',
            status === 'online' && 'w-2.5 h-2.5',
            status !== 'online' && 'w-2 h-2',
            statusColors[status]
          )}
        />
      )}
    </div>
  );
};
