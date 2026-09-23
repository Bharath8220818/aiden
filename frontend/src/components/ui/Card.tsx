import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  glow?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, hoverable = false, glow = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-card border border-border rounded-lg shadow-card-glow transition-all duration-200',
          hoverable && 'interactive-card hover:border-border-highlight cursor-pointer',
          glow && 'hover:shadow-lift hover:border-indigo-500/40',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('p-5 flex flex-col space-y-1.5 border-b border-border-subtle/60', className)}
      {...props}
    >
      {children}
    </div>
  )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-base font-semibold text-text-primary tracking-tight leading-none', className)}
      {...props}
    >
      {children}
    </h3>
  )
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => (
    <p ref={ref} className={cn('text-xs text-text-secondary mt-1', className)} {...props}>
      {children}
    </p>
  )
);
CardDescription.displayName = 'CardDescription';

export const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('p-5', className)} {...props}>
      {children}
    </div>
  )
);
CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('p-5 pt-0 flex items-center justify-between border-t border-border-subtle/40 mt-2', className)}
      {...props}
    >
      {children}
    </div>
  )
);
CardFooter.displayName = 'CardFooter';
