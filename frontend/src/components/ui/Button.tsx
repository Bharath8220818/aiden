import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'ai' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

    const variants = {
      primary:
        'bg-aiden-accent hover:bg-aiden-accent/90 text-white shadow-sm hover:shadow-md hover:-translate-y-px focus:ring-aiden-accent border border-white/25',
      secondary:
        'bg-card hover:bg-card-active text-text-primary border border-border hover:border-border-highlight shadow-card-glow hover:shadow-lift focus:ring-gray-400',
      ghost:
        'bg-transparent hover:bg-card-active text-text-secondary hover:text-text-primary focus:ring-gray-400',
      danger:
        'bg-aiden-error/10 hover:bg-aiden-error/20 text-aiden-error hover:text-aiden-error border border-aiden-error/30 focus:ring-aiden-error',
      outline:
        'bg-card hover:bg-card-hover text-text-primary border border-border hover:border-border-highlight hover:shadow-card-glow focus:ring-aiden-accent',
      /* AI gradient — blue-led in both themes (token-driven: blue-700 light,
         blue-400 dark); static indigo/purple/cyan removed. */
      ai: 'bg-gradient-to-r from-aiden-accent via-aiden-info to-aiden-accent hover:from-aiden-accent/90 hover:via-aiden-info/90 hover:to-aiden-accent/90 text-white font-semibold shadow-ai-glow border border-white/25 focus:ring-aiden-accent hover:-translate-y-px',
    };

    const sizes = {
      sm: 'text-xs px-2.5 py-1.5 rounded-sm gap-1.5',
      md: 'text-sm px-3.5 py-2 rounded-md gap-2',
      lg: 'text-base px-5 py-2.5 rounded-lg gap-2.5',
      icon: 'h-9 w-9 p-0 rounded-md items-center justify-center',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" />
        ) : (
          leftIcon
        )}
        {children}
        {rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
