import React from 'react';
import type { Pipeline } from '../types';
import { pipelineApi } from '../api/pipelines';

interface PipelineCardProps {
  pipeline: Pipeline;
  onDelete?: (id: number) => void;
  onRun?: (id: number) => void;
}

const PipelineCard: React.FC<PipelineCardProps> = ({ pipeline, onDelete, onRun }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 hover:shadow-md transition-shadow">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">{pipeline.name}</h3>
          {pipeline.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{pipeline.description}</p>
          )}
          
          <div className="flex flex-wrap gap-2 mt-3">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(pipeline.status)}`}>
              {pipeline.status}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              {pipeline.source_type} → {pipeline.destination_type}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 text-xs text-gray-500 mt-3">
            {pipeline.schedule && (
              <span>⏰ {pipeline.schedule}</span>
            )}
            {pipeline.created_at && (
              <span>📅 {new Date(pipeline.created_at).toLocaleDateString()}</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {pipeline.status === 'draft' || pipeline.status === 'paused' ? (
            <button
              onClick={() => onRun?.(pipeline.id)}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              Run
            </button>
          ) : pipeline.status === 'running' ? (
            <button
              onClick={async () => {
                try {
                  await pipelineApi.update(pipeline.id, { config: { paused: true } });
                } catch (error) {
                  console.error('Failed to pause pipeline:', error);
                }
              }}
              className="px-3 py-1.5 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Pause
            </button>
          ) : null}
          
          <button
            onClick={() => onDelete?.(pipeline.id)}
            className="px-3 py-1.5 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default PipelineCard;
