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
      'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0B0D10] disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

    const variants = {
      primary:
        'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm hover:shadow focus:ring-indigo-500 border border-indigo-500/40',
      secondary:
        'bg-[#1A1D24] hover:bg-[#242831] text-[#F5F7FA] border border-[#242831] hover:border-[#383F4D] focus:ring-gray-400',
      ghost:
        'bg-transparent hover:bg-[#1A1D24] text-[#9CA3AF] hover:text-[#F5F7FA] focus:ring-gray-400',
      danger:
        'bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 focus:ring-red-500',
      outline:
        'bg-transparent hover:bg-[#1A1D24] text-[#F5F7FA] border border-[#242831] hover:border-[#383F4D] focus:ring-indigo-500',
      ai: 'bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 hover:from-indigo-500 hover:via-purple-500 hover:to-cyan-500 text-white font-semibold shadow-ai-glow border border-white/20 focus:ring-indigo-400',
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
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
