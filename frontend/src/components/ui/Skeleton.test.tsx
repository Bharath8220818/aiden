import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
  Skeleton,
  StatsCardSkeleton,
  TableRowSkeleton,
  TableSkeleton,
  PageSkeleton,
} from './Skeleton';

describe('Skeleton', () => {
  it('renders a single skeleton by default', () => {
    const { container } = render(<Skeleton />);
    const skeletons = container.querySelectorAll('.skeleton');
    expect(skeletons.length).toBe(1);
  });

  it('renders the correct number of skeletons with count prop', () => {
    const { container } = render(<Skeleton count={5} />);
    const skeletons = container.querySelectorAll('.skeleton');
    expect(skeletons.length).toBe(5);
  });

  it('applies default variant (text) class', () => {
    const { container } = render(<Skeleton />);
    const skeleton = container.querySelector('.skeleton');
    expect(skeleton?.className).toContain('h-4');
    expect(skeleton?.className).toContain('rounded-lg');
  });

  it('applies circle variant class', () => {
    const { container } = render(<Skeleton variant="circle" />);
    const skeleton = container.querySelector('.skeleton');
    expect(skeleton?.className).toContain('rounded-full');
  });

  it('applies rect variant class', () => {
    const { container } = render(<Skeleton variant="rect" />);
    const skeleton = container.querySelector('.skeleton');
    expect(skeleton?.className).toContain('rounded-xl');
  });

  it('applies card variant class', () => {
    const { container } = render(<Skeleton variant="card" />);
    const skeleton = container.querySelector('.skeleton');
    expect(skeleton?.className).toContain('rounded-2xl');
    expect(skeleton?.className).toContain('h-48');
  });

  it('applies custom className', () => {
    const { container } = render(<Skeleton className="bg-red-200" />);
    const skeleton = container.querySelector('.skeleton');
    expect(skeleton?.className).toContain('bg-red-200');
  });

  it('applies custom width as number', () => {
    const { container } = render(<Skeleton width={100} />);
    const skeleton = container.querySelector('.skeleton') as HTMLElement;
    expect(skeleton.style.width).toBe('100px');
  });

  it('applies custom width as string', () => {
    const { container } = render(<Skeleton width="50%" />);
    const skeleton = container.querySelector('.skeleton') as HTMLElement;
    expect(skeleton.style.width).toBe('50%');
  });

  it('applies custom height', () => {
    const { container } = render(<Skeleton height={48} />);
    const skeleton = container.querySelector('.skeleton') as HTMLElement;
    expect(skeleton.style.height).toBe('48px');
  });

  it('has default width of 100% for text variant', () => {
    const { container } = render(<Skeleton variant="text" />);
    const skeleton = container.querySelector('.skeleton') as HTMLElement;
    expect(skeleton.style.width).toBe('100%');
  });
});

describe('StatsCardSkeleton', () => {
  it('renders without error', () => {
    const { container } = render(<StatsCardSkeleton />);
    expect(container.querySelector('.card')).toBeInTheDocument();
  });

  it('contains skeleton elements', () => {
    const { container } = render(<StatsCardSkeleton />);
    const skeletons = container.querySelectorAll('.skeleton');
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
  });
});

describe('TableRowSkeleton', () => {
  it('renders without error', () => {
    const { container } = render(<TableRowSkeleton />);
    expect(container.querySelector('.skeleton')).toBeInTheDocument();
  });

  it('contains a circle skeleton for avatar', () => {
    const { container } = render(<TableRowSkeleton />);
    const circles = container.querySelectorAll('.rounded-full');
    expect(circles.length).toBeGreaterThanOrEqual(1);
  });
});

describe('TableSkeleton', () => {
  it('renders with default 5 rows', () => {
    const { container } = render(<TableSkeleton />);
    const rows = container.querySelectorAll('.divide-y > div');
    expect(rows.length).toBe(5);
  });

  it('renders with custom row count', () => {
    const { container } = render(<TableSkeleton rows={3} />);
    const rows = container.querySelectorAll('.divide-y > div');
    expect(rows.length).toBe(3);
  });

  it('renders with custom column count', () => {
    const { container } = render(<TableSkeleton rows={1} cols={6} />);
    const firstRow = container.querySelector('.divide-y > div');
    const cells = firstRow?.querySelectorAll('.skeleton');
    expect(cells?.length).toBe(6);
  });

  it('has a header row', () => {
    const { container } = render(<TableSkeleton />);
    const header = container.querySelector('.border-b');
    expect(header).toBeInTheDocument();
  });
});

describe('PageSkeleton', () => {
  it('renders without error', () => {
    const { container } = render(<PageSkeleton />);
    expect(container.querySelector('.skeleton')).toBeInTheDocument();
  });

  it('contains multiple skeleton elements', () => {
    const { container } = render(<PageSkeleton />);
    const skeletons = container.querySelectorAll('.skeleton');
    expect(skeletons.length).toBeGreaterThanOrEqual(10);
  });
});
