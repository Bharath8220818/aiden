import React from 'react';

const StatsCardSkeleton: React.FC = () => {
  return (
    <div className="rounded-2xl border border-gray-200/60 bg-white/50 p-6 shadow-sm dark:border-gray-800/60 dark:bg-gray-900/50 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-200 dark:bg-gray-800" />
        <div className="flex-1 space-y-3">
          <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-800" />
          <div className="h-6 w-16 rounded bg-gray-200 dark:bg-gray-800" />
        </div>
      </div>
    </div>
  );
};

export default StatsCardSkeleton;
