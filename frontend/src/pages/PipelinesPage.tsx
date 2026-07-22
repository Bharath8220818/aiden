import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePipelineStore } from '../store/pipelineStore';
import { formatDistanceToNow } from 'date-fns';

import { PageSkeleton } from '../components/ui/Skeleton';

const FILTERS = ['all', 'running', 'success', 'failed', 'draft', 'pending', 'paused'] as const;
type Filter = (typeof FILTERS)[number];

const STATUS_META: Record<string, { label: string; badge: string; dot: string }> = {
  draft:   { label: 'Draft',   badge: 'badge-gray',    dot: 'bg-gray-400' },
  pending: { label: 'Pending', badge: 'badge-warning',  dot: 'bg-yellow-500' },
  running: { label: 'Running', badge: 'badge-info',     dot: 'bg-blue-500' },
  success: { label: 'Success', badge: 'badge-success',  dot: 'bg-green-500' },
  failed:  { label: 'Failed',  badge: 'badge-error',    dot: 'bg-red-500' },
  paused:  { label: 'Paused',  badge: 'badge-gray',     dot: 'bg-gray-400' },
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const meta = STATUS_META[status] || STATUS_META.draft;
  return (
    <span className={`badge ${meta.badge} gap-1.5`}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
};

const PipelinesPage: React.FC = () => {
  const { pipelines, isLoading, fetchPipelines, deletePipeline, runPipeline } = usePipelineStore();
  const [selectedFilter, setSelectedFilter] = useState<Filter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 8;

  useEffect(() => {
    fetchPipelines();
  }, []);

  const filteredPipelines = useMemo(() => {
    let result = selectedFilter === 'all' ? pipelines : pipelines.filter((p) => p.status === selectedFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.source_type?.toLowerCase().includes(q) ||
          p.destination_type?.toLowerCase().includes(q),
      );
    }
    return result;
  }, [pipelines, selectedFilter, searchQuery]);

  const totalPages = Math.ceil(filteredPipelines.length / PAGE_SIZE);
  const paginatedPipelines = filteredPipelines.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleDelete = async (id: number, name: string) => {
    if (confirm(`Delete pipeline "${name}"? This cannot be undone.`)) {
      await deletePipeline(id);
    }
  };

  const handleRun = async (id: number) => {
    await runPipeline(id);
  };

  if (isLoading && pipelines.length === 0) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Page Header ─────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">Operations Center</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">Pipelines</h1>
          <p className="mt-1 text-sm text-gray-500">
            {filteredPipelines.length} pipeline{filteredPipelines.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <Link to="/builder" className="btn-primary shrink-0">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Pipeline
        </Link>
      </div>

      {/* ── Filters + Search ─────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Filter tabs */}
        <div className="flex overflow-x-auto flex-nowrap gap-1 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-1 shadow-sm scrollbar-none max-w-full">
          {FILTERS.map((f) => (
            <button
              key={f}
              id={`pipeline-filter-${f}`}
              onClick={() => { setSelectedFilter(f); setCurrentPage(1); }}
              className={`filter-tab shrink-0 ${selectedFilter === f ? 'filter-tab-active' : ''}`}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              {f === 'all' && (
                <span className="ml-1.5 rounded-full bg-current/10 px-1.5 py-0.5 text-[10px] font-bold">
                  {pipelines.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            id="pipeline-search"
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Search pipelines..."
            className="input pl-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Empty State ──────────────────────────────── */}
      {filteredPipelines.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-20 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100 text-4xl">📭</div>
          <h3 className="mt-4 text-lg font-bold text-gray-900">No pipelines found</h3>
          <p className="mt-1 max-w-sm text-sm text-gray-500">
            {searchQuery
              ? `No results for "${searchQuery}". Try a different search term.`
              : selectedFilter !== 'all'
              ? `No pipelines with status "${selectedFilter}".`
              : 'Create your first AI-powered data pipeline.'}
          </p>
          <Link to="/builder" className="btn-primary mt-5">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Pipeline
          </Link>
        </div>
      ) : (
        <>
          {/* ── Desktop Table ────────────────────────── */}
          <div className="hidden overflow-hidden card p-0 sm:block">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="table-header">Name</th>
                    <th className="table-header">Source → Destination</th>
                    <th className="table-header">Schedule</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Last Run</th>
                    <th className="table-header text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {paginatedPipelines.map((pipeline) => (
                    <tr key={pipeline.id} className="table-row group">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </div>
                          <div>
                            <Link
                              to={`/pipelines/${pipeline.id}`}
                              className="block text-sm font-semibold text-gray-900 transition-colors hover:text-blue-600"
                            >
                              {pipeline.name}
                            </Link>
                            {pipeline.description && (
                              <p className="mt-0.5 max-w-xs truncate text-xs text-gray-500">
                                {pipeline.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 font-medium text-gray-700">
                            {pipeline.source_type || 'N/A'}
                          </span>
                          <svg className="h-3 w-3 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 font-medium text-blue-700">
                            {pipeline.destination_type || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="table-cell text-gray-500">
                        {pipeline.schedule ? (
                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                            {pipeline.schedule}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Not scheduled</span>
                        )}
                      </td>
                      <td className="table-cell">
                        <StatusBadge status={pipeline.status} />
                      </td>
                      <td className="table-cell text-xs text-gray-500">
                        {pipeline.last_run_at
                          ? formatDistanceToNow(new Date(pipeline.last_run_at), { addSuffix: true })
                          : 'Never'}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/pipelines/${pipeline.id}`}
                            className="btn-icon h-8 w-8 rounded-lg text-gray-400 hover:text-gray-700"
                            title="View details"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Link>
                          <button
                            onClick={() => handleRun(pipeline.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-green-200 bg-green-50 text-green-600 transition-all hover:bg-green-100 hover:shadow-sm"
                            title="Run pipeline"
                          >
                            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(pipeline.id, pipeline.name)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-500 transition-all hover:bg-red-100 hover:shadow-sm"
                            title="Delete pipeline"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Mobile Card List ─────────────────────── */}
          <div className="flex flex-col gap-3 sm:hidden">
            {paginatedPipelines.map((pipeline) => (
              <div key={pipeline.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/pipelines/${pipeline.id}`}
                      className="block truncate text-sm font-bold text-gray-900 hover:text-blue-600"
                    >
                      {pipeline.name}
                    </Link>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                      <span>{pipeline.source_type || 'N/A'}</span>
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="text-blue-600 font-medium">{pipeline.destination_type || 'N/A'}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {pipeline.schedule || 'No schedule'} ·{' '}
                      {pipeline.last_run_at
                        ? formatDistanceToNow(new Date(pipeline.last_run_at), { addSuffix: true })
                        : 'Never run'}
                    </p>
                  </div>
                  <StatusBadge status={pipeline.status} />
                </div>
                <div className="mt-3 flex justify-end gap-2 border-t border-gray-50 pt-3">
                  <button
                    onClick={() => handleRun(pipeline.id)}
                    className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition hover:bg-green-100"
                  >
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    Run
                  </button>
                  <Link
                    to={`/pipelines/${pipeline.id}`}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(pipeline.id, pipeline.name)}
                    className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100"
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ── Pagination ───────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs text-gray-500">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredPipelines.length)} of {filteredPipelines.length} pipelines
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="btn-icon h-8 w-8 rounded-lg disabled:opacity-40"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition-all ${
                      currentPage === page
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="btn-icon h-8 w-8 rounded-lg disabled:opacity-40"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PipelinesPage;