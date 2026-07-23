import React from 'react';
import { Link } from 'react-router-dom';
import type { Pipeline } from '../../types/pipeline';

interface RecentActivityProps {
  pipelines: Pipeline[];
  isLoading?: boolean;
}

const statusMeta: Record<string, { dot: string; label: string }> = {
  success: { dot: 'bg-green-500', label: 'Completed' },
  running: { dot: 'bg-purple-500', label: 'Running' },
  failed: { dot: 'bg-red-500', label: 'Failed' },
  draft: { dot: 'bg-gray-400', label: 'Draft' },
  pending: { dot: 'bg-yellow-500', label: 'Pending' },
};

const RecentActivity: React.FC<RecentActivityProps> = ({ pipelines, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5 animate-pulse">
            <div className="h-2 w-2 rounded-full bg-gray-600" />
            <div className="h-4 flex-1 rounded bg-gray-700" />
            <div className="h-3 w-16 rounded bg-gray-700" />
            <div className="h-5 w-20 rounded-full bg-gray-700" />
          </div>
        ))}
      </div>
    );
  }

  if (pipelines.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-white/10 p-8 text-center">
        <div className="text-3xl">🚀</div>
        <p className="mt-2 text-sm text-gray-400">No activity yet. Create your first pipeline!</p>
        <Link
          to="/builder"
          className="mt-3 inline-block text-sm font-semibold text-purple-400 hover:text-purple-300"
        >
          Describe a pipeline →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {pipelines.map((pipeline) => {
        const meta = statusMeta[pipeline.status] || statusMeta.draft;
        const bgClass =
          pipeline.status === 'success'
            ? 'bg-green-500/5'
            : pipeline.status === 'running'
              ? 'bg-purple-500/5'
              : pipeline.status === 'failed'
                ? 'bg-red-500/5'
                : '';

        return (
          <Link
            key={pipeline.id}
            to={`/pipelines/${pipeline.id}`}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all hover:bg-white/5 ${bgClass}`}
          >
            <div className={`h-2 w-2 rounded-full ${meta.dot} shrink-0`} />
            <span className="flex-1 truncate text-sm font-medium text-gray-100">
              {pipeline.name}
            </span>
            <span className="text-xs text-gray-400 shrink-0">
              {pipeline.updated_at
                ? new Date(pipeline.updated_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'just now'}
            </span>
            <span
              className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                pipeline.status === 'success'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/20'
                  : pipeline.status === 'running'
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20'
                    : pipeline.status === 'failed'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/20'
                      : 'bg-gray-500/20 text-gray-400 border border-gray-500/20'
              }`}
            >
              {meta.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
};

export default RecentActivity;
