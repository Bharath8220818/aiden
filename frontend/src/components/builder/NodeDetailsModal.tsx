import React from 'react';
import type { Node } from 'reactflow';

interface NodeDetailsModalProps {
  node: Node | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (nodeId: string, data: any) => void;
}

const NodeDetailsModal: React.FC<NodeDetailsModalProps> = ({
  node,
  isOpen,
  onClose,
  onUpdate,
}) => {
  if (!isOpen || !node) return null;

  const { data, id, position } = node;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2.5">
            <span className="text-xl leading-none">
              {data.type === 'source'
                ? '🗄️'
                : data.type === 'transform'
                  ? '🔄'
                  : data.type === 'destination'
                    ? '📥'
                    : '📦'}
            </span>
            <div>
              <h2 className="text-base font-semibold text-gray-900">{data.label}</h2>
              <p className="text-xs text-gray-500">{id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 overflow-y-auto max-h-[calc(80vh-130px)] space-y-4">
          {/* Badges */}
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                data.type === 'source'
                  ? 'bg-blue-100 text-blue-800'
                  : data.type === 'transform'
                    ? 'bg-purple-100 text-purple-800'
                    : data.type === 'destination'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
              }`}
            >
              {data.type || 'step'}
            </span>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                data.status === 'success'
                  ? 'bg-green-100 text-green-800'
                  : data.status === 'running'
                    ? 'bg-yellow-100 text-yellow-800'
                    : data.status === 'error'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-600'
              }`}
            >
              {data.status || 'idle'}
            </span>
          </div>

          {/* Description */}
          {data.description && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Description
              </h4>
              <p className="mt-1 text-sm text-gray-700">{data.description}</p>
            </div>
          )}

          {/* Configuration */}
          {data.config && Object.keys(data.config).length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Configuration
              </h4>
              <pre className="mt-1.5 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs font-mono overflow-x-auto">
                {JSON.stringify(data.config, null, 2)}
              </pre>
            </div>
          )}

          {/* Metrics */}
          {(data.records !== undefined || data.duration !== undefined) && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Metrics
              </h4>
              <div className="mt-1.5 grid grid-cols-2 gap-3">
                {data.records !== undefined && (
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-500">Records Processed</p>
                    <p className="mt-0.5 text-lg font-bold text-gray-900">
                      {data.records >= 1000
                        ? `${(data.records / 1000).toFixed(1)}k`
                        : data.records.toLocaleString()}
                    </p>
                  </div>
                )}
                {data.duration !== undefined && (
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-500">Duration</p>
                    <p className="mt-0.5 text-lg font-bold text-gray-900">
                      {data.duration}s
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Position */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Position
            </h4>
            <p className="mt-1 text-sm text-gray-700 font-mono">
              X: {Math.round(position.x)}, Y: {Math.round(position.y)}
            </p>
          </div>

          {/* Node ID */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Node ID
            </h4>
            <p className="mt-1 text-sm text-gray-700 font-mono text-xs">{id}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary text-sm">
            Close
          </button>
          {onUpdate && (
            <button
              onClick={() => onUpdate(id, data)}
              className="btn-primary text-sm"
            >
              Edit Node
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NodeDetailsModal;
