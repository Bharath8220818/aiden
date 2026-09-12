import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Table = forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto rounded-lg border border-[#242831]">
      <table
        ref={ref}
        className={cn('w-full caption-bottom text-xs sm:text-sm text-left', className)}
        {...props}
      />
    </div>
  )
);
Table.displayName = 'Table';

export const TableHeader = forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead
      ref={ref}
      className={cn('bg-[#0F1115] border-b border-[#242831] text-[#9CA3AF] uppercase text-[11px] font-semibold tracking-wider', className)}
      {...props}
    />
  )
);
TableHeader.displayName = 'TableHeader';

export const TableBody = forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody
      ref={ref}
      className={cn('divide-y divide-[#1F242C] bg-[#14171C]/40', className)}
      {...props}
    />
  )
);
TableBody.displayName = 'TableBody';

export const TableFooter = forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot
      ref={ref}
      className={cn('border-t border-[#242831] bg-[#0F1115] font-medium text-[#F5F7FA]', className)}
      {...props}
    />
  )
);
TableFooter.displayName = 'TableFooter';

export const TableRow = forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        'transition-colors hover:bg-[#1A1D24]/80 text-[#F5F7FA]',
        className
      )}
      {...props}
    />
  )
);
TableRow.displayName = 'TableRow';

export const TableHead = forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn('h-10 px-4 text-left align-middle font-medium text-[#9CA3AF]', className)}
      {...props}
    />
  )
);
TableHead.displayName = 'TableHead';

export const TableCell = forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td
      ref={ref}
      className={cn('p-4 align-middle text-[#F5F7FA]', className)}
      {...props}
    />
  )
);
TableCell.displayName = 'TableCell';
