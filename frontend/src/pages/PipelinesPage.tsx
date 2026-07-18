import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePipelineStore } from '../store/pipelineStore';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';

const PipelinesPage: React.FC = () => {
  const { pipelines, isLoading, fetchPipelines, deletePipeline, runPipeline } = usePipelineStore();
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  useEffect(() => {
    fetchPipelines();
  }, []);

  const filteredPipelines = selectedFilter === 'all'
    ? pipelines
    : pipelines.filter((p) => p.status === selectedFilter);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      running: 'bg-blue-100 text-blue-800',
      success: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      paused: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const handleDelete = async (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete pipeline "${name}"?`)) {
      await deletePipeline(id);
    }
  };

  const handleRun = async (id: number) => {
    await runPipeline(id);
  };

  if (isLoading && pipelines.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="soft-card p-5 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary-600">Operations center</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">Pipelines</h1>
            <p className="mt-2 text-sm text-slate-500 sm:text-base">Manage all your data pipelines in one calm workspace.</p>
          </div>
          <Link to="/builder" className="btn-primary self-start">
            ✨ New Pipeline
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {['all', 'draft', 'pending', 'running', 'success', 'failed', 'paused'].map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`rounded-full px-3.5 py-2 text-sm capitalize transition ${
                selectedFilter === filter
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {filteredPipelines.length === 0 ? (
        <div className="soft-card p-10 text-center">
          <div className="mb-4 text-6xl">📭</div>
          <h3 className="text-lg font-semibold text-slate-900">No pipelines found</h3>
          <p className="mt-2 text-sm text-slate-500">
            {selectedFilter !== 'all'
              ? `No pipelines with status "${selectedFilter}"`
              : 'Create your first pipeline using the AI assistant'}
          </p>
          <Link to="/builder" className="btn-primary mt-5">
            Create Pipeline
          </Link>
        </div>
      ) : (
        <div className="soft-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500 sm:px-6">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500 sm:px-6">
                    Source
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500 sm:px-6">
                    Destination
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500 sm:px-6">
                    Schedule
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500 sm:px-6">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500 sm:px-6">
                    Last Run
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500 sm:px-6">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white/60">
                {filteredPipelines.map((pipeline) => (
                  <tr key={pipeline.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="px-4 py-4 sm:px-6">
                      <Link to={`/pipelines/${pipeline.id}`} className="font-medium text-slate-900 hover:text-primary-600">
                        {pipeline.name}
                      </Link>
                      <p className="mt-1 max-w-xs truncate text-sm text-slate-500">{pipeline.description}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600 sm:px-6">{pipeline.source_type}</td>
                    <td className="px-4 py-4 text-sm text-slate-600 sm:px-6">{pipeline.destination_type}</td>
                    <td className="px-4 py-4 text-sm text-slate-600 sm:px-6">{pipeline.schedule || 'Not scheduled'}</td>
                    <td className="px-4 py-4 sm:px-6">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusColor(pipeline.status)}`}>
                        {pipeline.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-500 sm:px-6">
                      {pipeline.last_run_at ? formatDistanceToNow(new Date(pipeline.last_run_at), { addSuffix: true }) : 'Never'}
                    </td>
                    <td className="px-4 py-4 sm:px-6">
                      <div className="flex gap-2">
                        <Link to={`/pipelines/${pipeline.id}`} className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:text-slate-900" title="View pipeline">
                          👁️
                        </Link>
                        <button onClick={() => handleRun(pipeline.id)} className="rounded-full bg-emerald-100 p-2 text-emerald-600 transition hover:text-emerald-700" title="Run pipeline">
                          ▶️
                        </button>
                        <button onClick={() => handleDelete(pipeline.id, pipeline.name)} className="rounded-full bg-rose-100 p-2 text-rose-600 transition hover:text-rose-700" title="Delete pipeline">
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PipelinesPage;