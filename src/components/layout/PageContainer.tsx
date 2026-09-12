import React from 'react';
import { cn } from '@/lib/utils';
import { BreadcrumbItem } from '@/types/common';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface PageContainerProps {
  title?: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  title,
  description,
  breadcrumbs,
  actions,
  children,
  className,
  fullWidth = false,
}) => {
  return (
    <main
      className={cn(
        'flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6',
        !fullWidth && 'max-w-7xl',
        className
      )}
    >
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center space-x-1.5 text-xs text-[#9CA3AF]">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={idx}>
                {crumb.path && !isLast ? (
                  <Link
                    to={crumb.path}
                    className="hover:text-[#F5F7FA] transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={cn(isLast && 'text-[#F5F7FA] font-medium')}>
                    {crumb.label}
                  </span>
                )}
                {!isLast && <ChevronRight className="w-3.5 h-3.5 text-[#6B7280]" />}
              </React.Fragment>
            );
          })}
        </nav>
      )}

      {/* Page Title & Actions */}
      {(title || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#242831]/50">
          <div>
            {title && (
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F5F7FA]">
                {title}
              </h1>
            )}
            {description && (
              <p className="mt-1 text-xs sm:text-sm text-[#9CA3AF]">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>
      )}

      {/* Page Body */}
      <div className="space-y-6 pb-16 md:pb-8">{children}</div>
    </main>
  );
};
