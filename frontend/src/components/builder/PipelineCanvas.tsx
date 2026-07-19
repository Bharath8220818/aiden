import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
} from 'reactflow';
import type {
  Connection,
  Node,
  Edge,
  NodeTypes,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { usePipelineStore } from '../../store/pipelineStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useAgentStore } from '../../store/agentStore';
import { useWebSocket } from '../../hooks/useWebSocket';
import PipelineNode from './PipelineNode';
import NodeDetailsModal from './NodeDetailsModal';
import CanvasControls from './CanvasControls';
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
  const {
    currentPipeline,
    fetchPipeline,
    isLoading,
    error,
    updatePipeline,
  } = usePipelineStore();
  const { addNotification } = useNotificationStore();
  const { addActivity } = useAgentStore();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [codePreview, setCodePreview] = useState<string | null>(null);
  const reactFlowRef = useRef<ReactFlowInstance | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // ── WebSocket ──

  const { isConnected, subscribe } = useWebSocket({
    url: `${
      import.meta.env.VITE_WS_URL || 'ws://localhost:8000'
    }/ws/pipeline-${pipelineId || 'default'}`,
    onMessage: (data) => handleWebSocketMessage(data),
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
  });

  const handleWebSocketMessage = useCallback(
    (data: any) => {
      const { type, payload } = data;

      switch (type) {
        case 'pipeline_status': {
          const { stage, status, records, duration } = payload || {};
          setNodes((nds) =>
            nds.map((node) => {
              const nodeLabel = node.data.label?.toLowerCase() || '';
              const stageLower = (stage || '').toLowerCase();
              if (nodeLabel.includes(stageLower) || node.id === stage) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    status:
                      status === 'running'
                        ? 'running'
                        : status === 'success'
                          ? 'success'
                          : status === 'error'
                            ? 'error'
                            : 'idle',
                    records: records ?? node.data.records,
                    duration: duration ?? node.data.duration,
                  },
                };
              }
              return node;
            }),
          );
          addNotification({
            type:
              status === 'error'
                ? 'error'
                : status === 'running'
                  ? 'info'
                  : 'success',
            message: `Pipeline ${stage}: ${status}`,
          });
          break;
        }

        case 'pipeline_complete': {
          addNotification({
            type: 'success',
            message: `Pipeline ${payload?.name} completed! 🎉`,
          });
          if (pipelineId) fetchPipeline(pipelineId);
          break;
        }

        case 'pipeline_failed': {
          addNotification({
            type: 'error',
            message: `Pipeline ${payload?.name} failed: ${payload?.error}`,
          });
          break;
        }

        case 'node_update': {
          setNodes((nds) =>
            nds.map((node) =>
              node.id === payload?.node_id
                ? { ...node, data: { ...node.data, ...payload?.data } }
                : node,
            ),
          );
          break;
        }

        default:
          break;
      }
    },
    [pipelineId, fetchPipeline, addNotification],
  );

  // Fetch pipeline when ID changes
  useEffect(() => {
    if (pipelineId) {
      fetchPipeline(pipelineId);
    }
  }, [pipelineId, fetchPipeline]);

  // Subscribe to WebSocket updates
  useEffect(() => {
    if (isConnected && pipelineId) {
      subscribe('pipeline_updates', { pipeline_id: pipelineId });
    }
  }, [isConnected, pipelineId, subscribe]);

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

    const newNodes: Node<PipelineNodeData>[] = [
      {
        id: 'source',
        type: 'pipelineNode',
        position: { x: startX, y: 80 },
        data: {
          label:
            sourceType.charAt(0).toUpperCase() + sourceType.slice(1),
          type: 'source',
          description: config.source_config?.table
            ? `Table: ${config.source_config.table}`
            : 'Data Source',
          status: nodeStatus,
          records: 1250000,
        },
      },
    ];

    (transformations as any[]).forEach(
      (transform: string | any, index: number) => {
        const transformLabel =
          typeof transform === 'string'
            ? transform
            : transform.name || `step-${index}`;
        newNodes.push({
          id: `transform-${index}`,
          type: 'pipelineNode',
          position: {
            x: startX + (index + 1) * nodeWidth,
            y: 80 + (index % 2 === 0 ? 0 : 60),
          },
          data: {
            label: transformLabel
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (c: string) => c.toUpperCase()),
            type: 'transform',
            description:
              typeof transform === 'object'
                ? transform.description || `Step ${index + 1}`
                : `Step ${index + 1} of ${transformations.length}`,
            status: nodeStatus,
            duration: Math.floor(Math.random() * 30) + 10,
          },
        });
      },
    );

    const lastIndex = transformations.length;
    newNodes.push({
      id: 'destination',
      type: 'pipelineNode',
      position: {
        x: startX + (lastIndex + 1) * nodeWidth,
        y: 80,
      },
      data: {
        label:
          destinationType.charAt(0).toUpperCase() +
          destinationType.slice(1),
        type: 'destination',
        description: config.destination_config?.schema
          ? `Schema: ${config.destination_config.schema}`
          : 'Data Destination',
        status: nodeStatus,
        records: 980000,
      },
    });

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

    if (currentPipeline.code) {
      setCodePreview(currentPipeline.code);
    }

    addActivity(
      'Pipeline Builder',
      `Visualized ${newNodes.length} pipeline nodes`,
    );
  }, [currentPipeline, addActivity]);

  // ── Interaction Handlers ──

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds));
      addNotification({ type: 'info', message: 'Connection added' });
    },
    [setEdges, addNotification],
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node<PipelineNodeData>) => {
      setSelectedNode(node);
      setIsModalOpen(true);
    },
    [],
  );

  const onNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node<PipelineNodeData>) => {
      setSelectedNode(node);
      setIsModalOpen(true);
    },
    [],
  );

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node<PipelineNodeData>) => {
      addNotification({
        type: 'info',
        message: `Moved "${node.data.label}" to (${Math.round(node.position.x)}, ${Math.round(node.position.y)})`,
      });
    },
    [addNotification],
  );

  const onEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      addNotification({
        type: 'info',
        message: `Removed ${deletedEdges.length} connection${deletedEdges.length > 1 ? 's' : ''}`,
      });
    },
    [addNotification],
  );

  // ── View Controls ──

  const onFitView = useCallback(() => {
    reactFlowRef.current?.fitView({ padding: 0.2, duration: 300 });
  }, []);

  const onResetZoom = useCallback(() => {
    reactFlowRef.current?.setViewport({ x: 0, y: 0, zoom: 1 });
    setZoom(1);
  }, []);

  // ── Export PNG ──

  const onExportImage = useCallback(async () => {
    if (!canvasContainerRef.current) return;
    try {
      const { default: html2canvas } = await import(
        /* @vite-ignore */ 'html2canvas'
      );
      const canvas = await html2canvas(canvasContainerRef.current, {
        backgroundColor: '#F9FAFB',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement('a');
      link.download = `pipeline-${currentPipeline?.name || 'canvas'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      addNotification({
        type: 'success',
        message: 'Pipeline exported as PNG! 📸',
      });
    } catch (error) {
      console.error('Export failed:', error);
      addNotification({
        type: 'error',
        message: 'Failed to export image. Install html2canvas: npm install html2canvas',
      });
    }
  }, [currentPipeline, addNotification]);

  // ── Save Layout ──

  const saveNodePositions = useCallback(async () => {
    if (!currentPipeline || !pipelineId) return;
    const positions = nodes.map((node) => ({
      id: node.id,
      x: node.position.x,
      y: node.position.y,
    }));
    try {
      await updatePipeline(pipelineId, {
        config: { ...currentPipeline.config, node_positions: positions },
      });
      addNotification({
        type: 'success',
        message: 'Layout saved! 💾',
      });
    } catch {
      addNotification({
        type: 'error',
        message: 'Failed to save layout',
      });
    }
  }, [nodes, currentPipeline, pipelineId, updatePipeline, addNotification]);

  // ── Keyboard Shortcuts ──

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveNodePositions();
      }
      if (e.key === 'f' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onFitView();
      }
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
        setSelectedNode(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveNodePositions, onFitView, isModalOpen]);

  // ── Stats ──

  const stats = useMemo(() => {
    const nodeCount = nodes.length;
    const running = currentPipeline?.status === 'running';
    return { nodeCount, running, edgeCount: edges.length };
  }, [nodes, edges, currentPipeline]);

  // ── Render ──

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
        <p className="text-sm font-medium text-gray-700">
          Failed to load pipeline
        </p>
        <p className="text-xs text-gray-400 mt-1 mb-4 max-w-xs text-center">
          {error}
        </p>
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
        <p className="text-sm font-medium text-gray-500">
          No pipeline selected
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Select or create a pipeline to visualize
        </p>
      </div>
    );
  }

  return (
    <div
      ref={canvasContainerRef}
      className={`flex flex-col h-full overflow-hidden ${className}`}
    >
      {/* ReactFlow Canvas */}
      <div className="flex-1 min-h-[250px]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgesDelete={onEdgesDelete}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={onNodeDoubleClick}
          onNodeDragStop={onNodeDragStop}
          onInit={(instance) => {
            reactFlowRef.current = instance;
          }}
          onMoveEnd={(_event, viewport) => {
            setZoom(viewport.zoom);
          }}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          attributionPosition="bottom-right"
          minZoom={0.2}
          maxZoom={2.5}
          snapToGrid
          snapGrid={[15, 15]}
          deleteKeyCode={['Backspace', 'Delete']}
          multiSelectionKeyCode="Shift"
        >
          <Background
            color="#E2E8F0"
            gap={20}
            size={1}
            variant={BackgroundVariant.Dots}
          />
          <Controls
            showInteractive={false}
            position="bottom-right"
            className="!rounded-xl !border !border-gray-200 !bg-white !shadow-md"
          />
          <MiniMap
            position="bottom-left"
            className="!rounded-xl !border !border-gray-200 !bg-white !shadow-md"
            nodeColor={(node) => {
              const t =
                (node.data as PipelineNodeData)?.type || 'default';
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

          {/* Top Status Panel */}
          <Panel
            position="top-center"
            className="!bg-white/90 backdrop-blur-sm !px-4 !py-2 !rounded-xl !shadow-sm !text-xs"
          >
            <div className="flex items-center gap-3">
              <span className="font-medium text-gray-700">
                {currentPipeline.name}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full font-medium ${
                  currentPipeline.status === 'running'
                    ? 'bg-yellow-100 text-yellow-800'
                    : currentPipeline.status === 'success'
                      ? 'bg-green-100 text-green-800'
                      : currentPipeline.status === 'failed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-600'
                }`}
              >
                {currentPipeline.status || 'draft'}
              </span>
              <span className="text-gray-400">
                {stats.nodeCount} nodes · {stats.edgeCount} connections
              </span>
              <span
                className={`flex items-center gap-1 ${
                  isConnected ? 'text-green-600' : 'text-red-600'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full inline-block ${
                    isConnected ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>
          </Panel>

          {/* Bottom Center Controls */}
          <Panel position="bottom-center" className="!mb-4">
            <CanvasControls
              onFitView={onFitView}
              onResetZoom={onResetZoom}
              onExportImage={onExportImage}
              zoom={zoom}
            />
          </Panel>

          {/* Save Layout Button */}
          <Panel position="bottom-right" className="!mb-20">
            <button
              onClick={saveNodePositions}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow-md"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                />
              </svg>
              Save Layout
            </button>
          </Panel>
        </ReactFlow>
      </div>

      {/* Code Preview Footer */}
      {codePreview && (
        <div className="border-t border-gray-200 bg-gray-50 shrink-0">
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
              <p className="text-xs font-medium text-gray-600">
                Generated Code
              </p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(codePreview);
                addNotification({
                  type: 'success',
                  message: 'Code copied to clipboard!',
                });
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
      <div className="border-t border-gray-200 bg-white px-4 py-3 shrink-0">
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

      {/* Node Details Modal */}
      <NodeDetailsModal
        node={selectedNode}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedNode(null);
        }}
        onUpdate={(nodeId, data) => {
          setNodes((nds) =>
            nds.map((node) =>
              node.id === nodeId ? { ...node, data } : node,
            ),
          );
          addNotification({
            type: 'success',
            message: `Node "${data.label}" updated`,
          });
        }}
      />
    </div>
  );
};

export default PipelineCanvas;
