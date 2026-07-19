import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { usePipelineStore } from '../../store/pipelineStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useAgentStore } from '../../store/agentStore';
import PipelineNode from './PipelineNode';
import type { PipelineNodeData } from './PipelineNode';
import LoadingSpinner from '../common/LoadingSpinner';

const nodeTypes: NodeTypes = {
  pipelineNode: PipelineNode,
};

interface PipelineCanvasProps {
  pipelineId?: number;
  className?: string;
}

const PipelineCanvas: React.FC<PipelineCanvasProps> = ({
  pipelineId,
  className = '',
}) => {
  const { currentPipeline, fetchPipeline, isLoading, error } = usePipelineStore();
  const { addNotification } = useNotificationStore();
  const { addActivity, updateAgentStatus, updateAgentLog } = useAgentStore();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [codePreview, setCodePreview] = useState<string | null>(null);

  // Fetch pipeline when ID changes
  useEffect(() => {
    if (pipelineId) {
      fetchPipeline(pipelineId);
    }
  }, [pipelineId, fetchPipeline]);

  // Transform pipeline config into React Flow nodes and edges
  useEffect(() => {
    if (!currentPipeline) {
      setNodes([]);
      setEdges([]);
      setCodePreview(null);
      return;
    }

    const config = currentPipeline.config || {};
    const sourceType = currentPipeline.source_type || 'Unknown';
    const destinationType = currentPipeline.destination_type || 'Unknown';
    const transformations = config.transformations || [];
    const status = currentPipeline.status || 'draft';
    const isRunning = status === 'running';

    // Update agent store with pipeline status
    if (isRunning) {
      addActivity('System', `Pipeline "${currentPipeline.name}" is running`);
    }

    const nodeStatus: PipelineNodeData['status'] =
      status === 'running'
        ? 'running'
        : status === 'success'
          ? 'success'
          : status === 'failed'
            ? 'error'
            : 'idle';

    const nodeWidth = 200;
    const startX = 50;

    // Build nodes
    const newNodes: Node<PipelineNodeData>[] = [
      {
        id: 'source',
        type: 'pipelineNode',
        position: { x: startX, y: 80 },
        data: {
          label: sourceType.charAt(0).toUpperCase() + sourceType.slice(1),
          type: 'source',
          description: config.source_config?.table
            ? `Table: ${config.source_config.table}`
            : 'Data Source',
          status: nodeStatus,
          records: 1250000,
        },
      },
    ];

    transformations.forEach((transform: string, index: number) => {
      newNodes.push({
        id: `transform-${index}`,
        type: 'pipelineNode',
        position: { x: startX + (index + 1) * nodeWidth, y: 80 + (index % 2 === 0 ? 0 : 60) },
        data: {
          label: transform
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c: string) => c.toUpperCase()),
          type: 'transform',
          description: `Step ${index + 1} of ${transformations.length}`,
          status: nodeStatus,
          duration: Math.floor(Math.random() * 30) + 10,
        },
      });
    });

    const lastIndex = transformations.length;
    newNodes.push({
      id: 'destination',
      type: 'pipelineNode',
      position: {
        x: startX + (lastIndex + 1) * nodeWidth,
        y: 80,
      },
      data: {
        label: destinationType.charAt(0).toUpperCase() + destinationType.slice(1),
        type: 'destination',
        description: config.destination_config?.schema
          ? `Schema: ${config.destination_config.schema}`
          : 'Data Destination',
        status: nodeStatus,
        records: 980000,
      },
    });

    // Create edges
    const newEdges: Edge[] = [];
    for (let i = 0; i < newNodes.length - 1; i++) {
      newEdges.push({
        id: `edge-${i}`,
        source: newNodes[i].id,
        target: newNodes[i + 1].id,
        type: 'smoothstep',
        animated: isRunning,
        style: {
          stroke: isRunning ? '#2563EB' : '#94A3B8',
          strokeWidth: 2,
        },
      });
    }

    setNodes(newNodes);
    setEdges(newEdges);

    // Set code preview from pipeline
    if (currentPipeline.code) {
      setCodePreview(currentPipeline.code);
    }

    // Update agent logs
    addActivity('Pipeline Builder', `Visualized ${newNodes.length} pipeline nodes`);
  }, [currentPipeline, addActivity]);

  // Handle new connections (for manual editing)
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds));
      addNotification({ type: 'info', message: 'Connection added' });
    },
    [setEdges, addNotification],
  );

  // Node click handler
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node<PipelineNodeData>) => {
      addNotification({
        type: 'info',
        message: `Selected: ${node.data.label} (${node.data.type})`,
      });
    },
    [addNotification],
  );

  // Compute stats from nodes/edges
  const stats = useMemo(() => {
    const nodeCount = nodes.length;
    const running = currentPipeline?.status === 'running';
    return { nodeCount, running };
  }, [nodes, currentPipeline]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-3 text-sm text-gray-500">Loading pipeline...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-gray-500">
        <div className="text-5xl mb-3">😕</div>
        <p className="text-sm font-medium text-gray-700">Failed to load pipeline</p>
        <p className="text-xs text-gray-400 mt-1 mb-4 max-w-xs text-center">{error}</p>
        <button
          onClick={() => pipelineId && fetchPipeline(pipelineId)}
          className="btn-secondary text-sm px-4 py-2"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!currentPipeline) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-gray-400">
        <div className="text-5xl mb-3">📋</div>
        <p className="text-sm font-medium text-gray-500">No pipeline selected</p>
        <p className="text-xs text-gray-400 mt-1">
          Select or create a pipeline to visualize
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full overflow-hidden ${className}`}>
      {/* ReactFlow Canvas */}
      <div className="flex-1 min-h-[250px]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          attributionPosition="bottom-right"
          minZoom={0.3}
          maxZoom={2.5}
          snapToGrid
          snapGrid={[15, 15]}
          deleteKeyCode={['Backspace', 'Delete']}
          multiSelectionKeyCode="Shift"
        >
          <Background color="#E2E8F0" gap={20} size={1} />
          <Controls
            showInteractive={false}
            position="bottom-right"
            className="!rounded-xl !border !border-gray-200 !bg-white !shadow-md"
          />
          <MiniMap
            position="bottom-left"
            className="!rounded-xl !border !border-gray-200 !bg-white !shadow-md"
            nodeColor={(node) => {
              const t = (node.data as PipelineNodeData)?.type || 'default';
              const colors: Record<string, string> = {
                source: '#93C5FD',
                transform: '#C4B5FD',
                destination: '#86EFAC',
                default: '#E5E7EB',
              };
              return colors[t] || colors.default;
            }}
            nodeBorderRadius={8}
          />
          <Panel
            position="top-center"
            className="!bg-white/90 backdrop-blur-sm !px-4 !py-2 !rounded-xl !shadow-sm !text-xs text-gray-600"
          >
            <span className="font-medium">{currentPipeline.name}</span>
            <span className="mx-2 text-gray-300">·</span>
            <span>{stats.nodeCount} nodes</span>
            {stats.running && (
              <>
                <span className="mx-2 text-gray-300">·</span>
                <span className="text-yellow-600 font-medium animate-pulse">● Running</span>
              </>
            )}
          </Panel>
        </ReactFlow>
      </div>

      {/* Code Preview Footer */}
      {codePreview && (
        <div className="border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-2">
              <svg
                className="h-3.5 w-3.5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
              <p className="text-xs font-medium text-gray-600">Generated Code</p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(codePreview);
                addNotification({ type: 'success', message: 'Code copied to clipboard!' });
              }}
              className="rounded-lg bg-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-700 transition hover:bg-gray-300"
            >
              Copy
            </button>
          </div>
          <div className="max-h-28 overflow-auto bg-gray-950 px-4 py-3 scrollbar-thin">
            <pre className="font-mono text-[11px] leading-relaxed text-green-400 whitespace-pre-wrap">
              {codePreview}
            </pre>
          </div>
        </div>
      )}

      {/* Stats Footer */}
      <div className="border-t border-gray-200 bg-white px-4 py-3">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Pipeline ID', value: `#${currentPipeline.id}` },
            {
              label: 'Status',
              value: currentPipeline.status,
              color:
                currentPipeline.status === 'running'
                  ? 'text-yellow-600'
                  : currentPipeline.status === 'success'
                    ? 'text-green-600'
                    : currentPipeline.status === 'failed'
                      ? 'text-red-600'
                      : 'text-gray-600',
            },
            {
              label: 'Schedule',
              value: currentPipeline.schedule || 'Manual',
            },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-[10px] text-gray-500">{stat.label}</p>
              <p
                className={`text-sm font-bold ${stat.color || 'text-gray-900'}`}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PipelineCanvas;
