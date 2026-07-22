import React, { useState, useEffect, useCallback } from 'react';
import type { Node } from 'reactflow';
import { X, Save, Trash2, Database, Settings2, Upload } from 'lucide-react';
import type { PipelineNodeData } from './PipelineNode';

interface NodePropertiesPanelProps {
  node: Node<PipelineNodeData> | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (nodeId: string, data: Partial<PipelineNodeData>) => void;
  onDelete: (nodeId: string) => void;
}

const typeIcons: Record<string, React.ReactNode> = {
  source: <Database size={14} className="text-blue-600" />,
  transform: <Settings2 size={14} className="text-purple-600" />,
  destination: <Upload size={14} className="text-green-600" />,
};

const typeColors: Record<string, string> = {
  source: 'border-blue-200 bg-blue-50',
  transform: 'border-purple-200 bg-purple-50',
  destination: 'border-green-200 bg-green-50',
};

const NodePropertiesPanel: React.FC<NodePropertiesPanelProps> = ({
  node,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}) => {
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [config, setConfig] = useState<Record<string, any>>({});

  // Sync form state when selected node changes
  useEffect(() => {
    if (node) {
      setLabel(node.data.label || '');
      setDescription(node.data.description || '');
      setConfig(node.data.config || {});
    }
  }, [node]);

  const handleSave = useCallback(() => {
    if (!node) return;
    onUpdate(node.id, {
      label,
      description,
      config,
    });
  }, [node, label, description, config, onUpdate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [handleSave, onClose],
  );

  if (!isOpen || !node) return null;

  const nodeType = node.data.type || 'transform';
  const colorClass = typeColors[nodeType] || typeColors.transform;

  return (
    <div
      className="flex flex-col h-full overflow-hidden border-l border-gray-200 bg-white animate-slide-in-right"
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${colorClass.split(' ')[0]}`}>
        <div className="flex items-center gap-2">
          {typeIcons[nodeType]}
          <div>
            <p className="text-xs font-bold text-gray-900">Node Properties</p>
            <p className="text-[10px] text-gray-500 font-mono">{node.id}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X size={14} />
        </button>
      </div>

      {/* Type badge */}
      <div className="px-4 py-2 border-b border-gray-50">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
          nodeType === 'source' ? 'bg-blue-100 text-blue-700' :
          nodeType === 'transform' ? 'bg-purple-100 text-purple-700' :
          'bg-green-100 text-green-700'
        }`}>
          {nodeType}
        </span>
        {node.data.status && (
          <span className={`ml-1.5 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
            node.data.status === 'success' ? 'bg-green-100 text-green-700' :
            node.data.status === 'running' ? 'bg-yellow-100 text-yellow-700' :
            node.data.status === 'error' ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-600'
          }`}>
            {node.data.status}
          </span>
        )}
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Label */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Label
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="input px-3 py-2 text-sm"
            placeholder="Node name"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input px-3 py-2 text-sm resize-none"
            rows={3}
            placeholder="What does this node do?"
          />
        </div>

        {/* Configuration */}
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Configuration
          </label>
          <div className="space-y-2">
            {Object.entries(config).length > 0 ? (
              Object.entries(config).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 font-mono min-w-[80px] truncate">
                    {key}
                  </span>
                  <input
                    type="text"
                    value={typeof value === 'string' ? value : JSON.stringify(value)}
                    onChange={(e) => {
                      setConfig((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }));
                    }}
                    className="input px-2.5 py-1.5 text-xs flex-1"
                  />
                </div>
              ))
            ) : (
              <div className="rounded-lg bg-gray-50 px-3 py-2 text-[11px] text-gray-400 italic">
                No configuration keys yet. Add config via the API or edit the pipeline JSON.
              </div>
            )}
            {/* Add config key button */}
            <button
              onClick={() => {
                const key = prompt('Enter configuration key name:');
                if (key) {
                  setConfig((prev) => ({ ...prev, [key]: '' }));
                }
              }}
              className="flex items-center gap-1 text-[11px] text-purple-600 hover:text-purple-700 font-medium"
            >
              + Add config key
            </button>
          </div>
        </div>

        {/* Position info */}
        <div className="rounded-lg bg-gray-50 px-3 py-2">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Position</p>
          <p className="text-xs font-mono text-gray-600">
            X: {Math.round(node.position.x)}, Y: {Math.round(node.position.y)}
          </p>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="border-t border-gray-200 px-4 py-3 flex items-center gap-2">
        <button
          onClick={handleSave}
          className="btn-primary flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs"
        >
          <Save size={14} />
          Save Changes
        </button>
        <button
          onClick={() => onDelete(node.id)}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100"
          title="Delete node"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

export default NodePropertiesPanel;
