import React from 'react';

const PageSkeleton: React.FC = () => {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between pb-6">
        <div className="space-y-3">
          <div className="h-8 w-48 rounded-md bg-gray-200 dark:bg-gray-800" />
          <div className="h-4 w-64 rounded-md bg-gray-200 dark:bg-gray-800" />
        </div>
        <div className="h-10 w-32 rounded-lg bg-gray-200 dark:bg-gray-800" />
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 rounded-2xl bg-gray-200 dark:bg-gray-800" />
        ))}
      </div>
      
      <div className="mt-8 h-96 w-full rounded-2xl bg-gray-200 dark:bg-gray-800" />
    </div>
  );
};

export default PageSkeleton;
