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
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipelines</h1>
          <p className="text-gray-500">Manage all your data pipelines</p>
        </div>
        <Link to="/builder" className="btn-primary">
          ✨ New Pipeline
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {['all', 'draft', 'pending', 'running', 'success', 'failed', 'paused'].map((filter) => (
          <button
            key={filter}
            onClick={() => setSelectedFilter(filter)}
            className={`px-3 py-1.5 rounded-full text-sm capitalize transition-colors ${
              selectedFilter === filter
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Pipelines List */}
      {filteredPipelines.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">📭</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No pipelines found</h3>
          <p className="text-gray-500 mb-4">
            {selectedFilter !== 'all' 
              ? `No pipelines with status "${selectedFilter}"` 
              : 'Create your first pipeline using the AI assistant'}
          </p>
          <Link to="/builder" className="btn-primary">
            Create Pipeline
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Destination
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Schedule
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Run
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPipelines.map((pipeline) => (
                  <tr key={pipeline.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link
                        to={`/pipelines/${pipeline.id}`}
                        className="font-medium text-gray-900 hover:text-primary-600"
                      >
                        {pipeline.name}
                      </Link>
                      <p className="text-sm text-gray-500 truncate max-w-xs">
                        {pipeline.description}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {pipeline.source_type}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {pipeline.destination_type}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {pipeline.schedule || 'Not scheduled'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(pipeline.status)}`}>
                        {pipeline.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {pipeline.last_run_at
                        ? formatDistanceToNow(new Date(pipeline.last_run_at), { addSuffix: true })
                        : 'Never'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Link
                          to={`/pipelines/${pipeline.id}`}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          👁️
                        </Link>
                        <button
                          onClick={() => handleRun(pipeline.id)}
                          className="text-green-400 hover:text-green-600"
                          title="Run pipeline"
                        >
                          ▶️
                        </button>
                        <button
                          onClick={() => handleDelete(pipeline.id, pipeline.name)}
                          className="text-red-400 hover:text-red-600"
                          title="Delete pipeline"
                        >
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