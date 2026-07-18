import React from 'react';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import type { Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';

const nodes: Node[] = [
  {
    id: 'extract',
    type: 'default',
    position: { x: 0, y: 40 },
    data: {
      label: (
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Extract</h3>
          <p className="text-xs text-gray-500">PostgreSQL sales data</p>
        </div>
      ),
    },
    style: {
      borderRadius: 20,
      padding: 16,
      background: '#eff6ff',
      border: '1px solid #bfdbfe',
      width: 180,
    },
  },
  {
    id: 'clean',
    type: 'default',
    position: { x: 260, y: 40 },
    data: {
      label: (
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Clean</h3>
          <p className="text-xs text-gray-500">Deduplicate & standardize</p>
        </div>
      ),
    },
    style: {
      borderRadius: 20,
      padding: 16,
      background: '#ede9fe',
      border: '1px solid #c7d2fe',
      width: 180,
    },
  },
  {
    id: 'transform',
    type: 'default',
    position: { x: 520, y: 40 },
    data: {
      label: (
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Transform</h3>
          <p className="text-xs text-gray-500">Aggregate by region</p>
        </div>
      ),
    },
    style: {
      borderRadius: 20,
      padding: 16,
      background: '#d1fae5',
      border: '1px solid #86efac',
      width: 180,
    },
  },
  {
    id: 'load',
    type: 'default',
    position: { x: 780, y: 40 },
    data: {
      label: (
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Load</h3>
          <p className="text-xs text-gray-500">Snowflake analytics</p>
        </div>
      ),
    },
    style: {
      borderRadius: 20,
      padding: 16,
      background: '#dcfce7',
      border: '1px solid #86efac',
      width: 180,
    },
  },
  {
    id: 'quality',
    type: 'default',
    position: { x: 260, y: 190 },
    data: {
      label: (
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Quality</h3>
          <p className="text-xs text-gray-500">98% validation</p>
        </div>
      ),
    },
    style: {
      borderRadius: 20,
      padding: 16,
      background: '#fef3c7',
      border: '1px solid #fde68a',
      width: 180,
    },
  },
];

const edges: Edge[] = [
  { id: 'e1-2', source: 'extract', target: 'clean', animated: true, style: { stroke: '#2563eb' } },
  { id: 'e2-3', source: 'clean', target: 'transform', animated: true, style: { stroke: '#2563eb' } },
  { id: 'e3-4', source: 'transform', target: 'load', animated: true, style: { stroke: '#2563eb' } },
  { id: 'e2-5', source: 'clean', target: 'quality', animated: true, style: { stroke: '#2563eb', strokeDasharray: '6 6' } },
];

const PipelineCanvas: React.FC = () => {
  return (
    <div className="bg-white rounded-[2rem] border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-gray-100">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">Pipeline canvas</p>
            <h2 className="text-xl font-semibold text-gray-900">Visual pipeline preview</h2>
          </div>
          <div className="inline-flex items-center gap-2 text-sm text-gray-500">
            <span className="rounded-full bg-gray-100 px-3 py-1">Auto layout</span>
            <span className="rounded-full bg-gray-100 px-3 py-1">Live preview</span>
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-[420px]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          attributionPosition="bottom-left"
          nodesDraggable={false}
          nodesConnectable={false}
          selectNodesOnDrag={false}
          fitViewOptions={{ padding: 0.2 }}
          style={{ width: '100%', height: '100%' }}
        >
          <MiniMap
            nodeStrokeColor={() => '#2563eb'}
            nodeColor={() => '#fff'}
            nodeBorderRadius={20}
          />
          <Controls />
          <Background gap={16} />
        </ReactFlow>
      </div>
      <div className="p-6 border-t border-gray-100 grid gap-3 sm:grid-cols-2">
        <div className="rounded-3xl bg-primary-50 p-4 border border-primary-100">
          <p className="text-sm text-primary-700">Estimated runtime</p>
          <p className="text-2xl font-semibold text-gray-900">4.2 min</p>
        </div>
        <div className="rounded-3xl bg-gray-50 p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Data quality</p>
          <p className="text-2xl font-semibold text-gray-900">98%</p>
        </div>
      </div>
    </div>
  );
};

export default PipelineCanvas;
