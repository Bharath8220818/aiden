import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import {
  Database, LayoutPanelTop, GitBranch, Sparkles,
  Loader2, CheckCircle2, XCircle, Cpu,
} from 'lucide-react';
import { usePipelineStore } from '../../store/pipelineStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useAgentStore } from '../../store/agentStore';
import { useWebSocket } from '../../hooks/useWebSocket';
import PipelineNode from './PipelineNode';
import NodeDetailsModal from './NodeDetailsModal';
import NodePropertiesPanel from './NodePropertiesPanel';
import NodePalette from './NodePalette';
import CanvasControls from './CanvasControls';
import type { PipelineNodeData } from './PipelineNode';
import type { PaletteItem } from './NodePalette';
import LoadingSpinner from '../common/LoadingSpinner';

// ── Agent Step Types ──────────────────────────────────────────────────

interface AgentStep {
  agent: string;
  status: AgentStepStatus;
  detail: string;
  timestamp: number;
}

const AGENT_ICONS: Record<string, string> = {
  'Intent Parser': '🧠',
  'Extraction': '📤',
  'Analysis': '📊',
  'Pipeline Builder': '🏗️',
  'Multimodal': '🔮',
  'Rag Memory': '💾',
  'Self Healing': '🔧',
  default: '🤖',
};

const AGENT_STEP_STATUS_CONFIG = {
  running: {
    icon: <Loader2 size={14} className="animate-spin" />,
    border: 'border-purple-500/40',
    bg: 'bg-purple-500/10',
    glow: 'shadow-purple-500/10',
    indicator: 'bg-purple-500 animate-pulse',
  },
  success: {
    icon: <CheckCircle2 size={14} className="text-green-400" />,
    border: 'border-green-500/30',
    bg: 'bg-green-500/5',
    glow: 'shadow-green-500/5',
    indicator: 'bg-green-500',
  },
  failed: {
    icon: <XCircle size={14} className="text-red-400" />,
    border: 'border-red-500/30',
    bg: 'bg-red-500/5',
    glow: 'shadow-red-500/5',
    indicator: 'bg-red-500',
  },
  warning: {
    icon: <Cpu size={14} className="text-yellow-400" />,
    border: 'border-yellow-500/30',
    bg: 'bg-yellow-500/5',
    glow: 'shadow-yellow-500/5',
    indicator: 'bg-yellow-500',
  },
  skipped: {
    icon: <Cpu size={14} className="text-gray-500" />,
    border: 'border-gray-500/20',
    bg: 'bg-gray-500/5',
    glow: 'shadow-gray-500/5',
    indicator: 'bg-gray-500',
  },
} as const;

type AgentStepStatus = keyof typeof AGENT_STEP_STATUS_CONFIG;

const nodeTypes: NodeTypes = {
  pipelineNode: PipelineNode,
};

let nodeCounter = 0;
const generateNodeId = (type: string): string => {
  nodeCounter += 1;
  return `${type}-${nodeCounter}-${Date.now()}`;
};

interface PipelineCanvasProps {
  pipelineId?: number;
  className?: string;
  /** Pre-built pipeline with nodes/edges (used by the compact preview in the AI Workspace) */
  pipeline?: { nodes?: Array<{ id: string; label: string; status?: string; type?: string }>; edges?: Array<{ source: string; target: string }> };
  /** Compact mode for the right-panel preview (non-interactive, no toolbar) */
  interactive?: boolean;
  compact?: boolean;
}

// ── Agent Step Card Component ─────────────────────────────────────────

const AgentStepCard: React.FC<{ step: AgentStep }> = ({ step }) => {
  const cfg = AGENT_STEP_STATUS_CONFIG[step.status] || AGENT_STEP_STATUS_CONFIG.running;
  const icon = AGENT_ICONS[step.agent] || AGENT_ICONS[step.agent.split(' ')[0]] || AGENT_ICONS.default;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{
        opacity: step.status === 'success' || step.status === 'failed' ? 0.85 : 1,
        x: 0,
        scale: 1,
      }}
      exit={{ opacity: 0, x: -20, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`pointer-events-auto rounded-xl border ${cfg.border} ${cfg.bg} ${cfg.glow} backdrop-blur-sm p-3 shadow-lg`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <span className="text-lg leading-none mt-0.5 shrink-0">{icon}</span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white truncate">
              {step.agent}
            </span>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.indicator}`} />
          </div>
          {step.detail && (
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">
              {step.detail}
            </p>
          )}
        </div>

        {/* Status icon */}
        <span className="shrink-0 mt-0.5">{cfg.icon}</span>
      </div>
    </motion.div>
  );
};


const PipelineCanvas: React.FC<PipelineCanvasProps> = ({
  pipelineId,
  className = '',
  pipeline: pipelineProp,
  compact = false,
}) => {
  const {
    currentPipeline,
    fetchPipeline,
    isLoading,
    error,
  } = usePipelineStore();
  const { addNotification } = useNotificationStore();
  const { addActivity } = useAgentStore();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node<PipelineNodeData> | null>(null);
  const [showProperties, setShowProperties] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [codePreview, setCodePreview] = useState<string | null>(null);
  const reactFlowRef = useRef<ReactFlowInstance | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // ── Agent Step Tracking ────────────────────────────────────────────
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const agentStepTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Compact mode: render nodes/edges from the pipeline prop ──────────

  const compactNodes: Node[] = useMemo(() => {
    if (!pipelineProp?.nodes || pipelineProp.nodes.length === 0) return [];
    return pipelineProp.nodes.map((n: any, idx: number) => ({
      id: n.id || `node-${idx}`,
      type: 'pipelineNode',
      position: { x: 50 + idx * 160, y: 30 + (idx % 2 === 0 ? 0 : 20) },
      data: {
        label: n.label || 'Step',
        type: n.type || 'transform',
        description: n.status === 'running' ? 'In progress...' : n.status === 'success' ? 'Complete' : 'Waiting',
        status: n.status || 'idle',
      },
    }));
  }, [pipelineProp?.nodes]);

  const compactEdges: Edge[] = useMemo(() => {
    if (!pipelineProp?.nodes || pipelineProp.nodes.length < 2) return [];
    const result: Edge[] = [];
    for (let i = 0; i < pipelineProp.nodes.length - 1; i++) {
      const nextNode = pipelineProp.nodes[i + 1];
      result.push({
        id: `edge-c-${i}`,
        source: pipelineProp.nodes[i].id || `node-${i}`,
        target: nextNode.id || `node-${i + 1}`,
        type: 'smoothstep',
        animated: nextNode?.status === 'running',
        style: { stroke: nextNode?.status === 'running' ? '#7C3AED' : '#374151', strokeWidth: nextNode?.status === 'running' ? 2.5 : 1.5 },
      });
    }
    return result;
  }, [pipelineProp?.nodes]);

  // ── Auto-populate from pipeline prop ──

  const autoPopulateFromPipeline = useCallback(
    (pipeline: any) => {
      const config = pipeline.config || {};
      const src = pipeline.source_type || 'postgres';
      const dst = pipeline.destination_type || 'snowflake';
      const transforms: string[] = config.transformations || [];

      const gapX = 220;
      const startX = 80;

      const newNodes: Node<PipelineNodeData>[] = [
        {
          id: generateNodeId('source'),
          type: 'pipelineNode',
          position: { x: startX, y: 120 },
          data: {
            label: src.charAt(0).toUpperCase() + src.slice(1),
            type: 'source',
            description: config.source_config?.table
              ? `Table: ${config.source_config.table}`
              : `${src} Data Source`,
            status: 'idle',
          },
        },
      ];

      transforms.forEach((t: string, i: number) => {
        newNodes.push({
          id: generateNodeId('transform'),
          type: 'pipelineNode',
          position: { x: startX + (i + 1) * gapX, y: 120 + (i % 2 === 0 ? 0 : 80) },
          data: {
            label: t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            type: 'transform',
            description: `Step ${i + 1} of ${transforms.length}`,
            status: 'idle',
          },
        });
      });

      newNodes.push({
        id: generateNodeId('destination'),
        type: 'pipelineNode',
        position: { x: startX + (transforms.length + 1) * gapX, y: 120 },
        data: {
          label: dst.charAt(0).toUpperCase() + dst.slice(1),
          type: 'destination',
          description: config.destination_config?.schema
            ? `Schema: ${config.destination_config.schema}`
            : `${dst} Destination`,
          status: 'idle',
        },
      });

      const newEdges: Edge[] = [];
      for (let i = 0; i < newNodes.length - 1; i++) {
        newEdges.push({
          id: `edge-auto-${i}-${Date.now()}`,
          source: newNodes[i].id,
          target: newNodes[i + 1].id,
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#A78BFA', strokeWidth: 2 },
        });
      }

      setNodes(newNodes);
      setEdges(newEdges);
      addActivity('Pipeline Builder', `Auto-populated ${newNodes.length} nodes from pipeline`);
    },
    [setNodes, setEdges, addActivity],
  );

  useEffect(() => {
    (window as any).__autoPopulateCanvas = autoPopulateFromPipeline;
    return () => {
      delete (window as any).__autoPopulateCanvas;
    };
  }, [autoPopulateFromPipeline]);

  // ── WebSocket ──

  const { isConnected, subscribe } = useWebSocket({
    url: `${import.meta.env.VITE_WS_URL || 'ws://localhost:8000'}/ws/pipeline-${pipelineId || 'default'}`,
    onMessage: (data) => handleWebSocketMessage(data),
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
  });

  // ── Cleanup agent step timeout on unmount ──────────────────────────────
  useEffect(() => {
    return () => {
      if (agentStepTimeoutRef.current) {
        clearTimeout(agentStepTimeoutRef.current);
      }
    };
  }, []);

  const handleWebSocketMessage = useCallback(
    (data: any) => {
      const { type, payload } = data;
      switch (type) {
        case 'agent_step': {
          const { agent, status, detail } = data;
          setAgentSteps((prev) => {
            const existing = prev.findIndex((s) => s.agent === agent);
            // Normalize agent name: "intent_parser" → "Intent Parser"
            const displayName = agent
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (c) => c.toUpperCase());
            const entry: AgentStep = {
              agent: displayName,
              status,
              detail: detail || '',
              timestamp: Date.now(),
            };
            if (existing >= 0) {
              const updated = [...prev];
              updated[existing] = entry;
              return updated;
            }
            return [...prev, entry];
          });
          // Auto-clear completed/failed steps after 30s
          if (status === 'success' || status === 'failed') {
            if (agentStepTimeoutRef.current) clearTimeout(agentStepTimeoutRef.current);
            agentStepTimeoutRef.current = setTimeout(() => {
              setAgentSteps((prev) => prev.filter((s) => s.status === 'running'));
            }, 30000);
          }
          break;
        }
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
                      status === 'running' ? 'running' :
                      status === 'success' ? 'success' :
                      status === 'error' ? 'error' : 'idle',
                    records: records ?? node.data.records,
                    duration: duration ?? node.data.duration,
                  },
                };
              }
              return node;
            }),
          );
          break;
        }
        case 'pipeline_complete': {
          addNotification({ type: 'success', message: `Pipeline ${payload?.name} completed! 🎉` });
          if (pipelineId) fetchPipeline(pipelineId);
          break;
        }
        case 'pipeline_failed': {
          addNotification({ type: 'error', message: `Pipeline ${payload?.name} failed: ${payload?.error}` });
          break;
        }
        default: break;
      }
    },
    [pipelineId, fetchPipeline, addNotification],
  );

  useEffect(() => {
    if (pipelineId) fetchPipeline(pipelineId);
  }, [pipelineId, fetchPipeline]);

  useEffect(() => {
    if (isConnected && pipelineId) subscribe('pipeline_updates', { pipeline_id: pipelineId });
  }, [isConnected, pipelineId, subscribe]);

  useEffect(() => {
    if (currentPipeline && nodes.length === 0 && !compact) {
      autoPopulateFromPipeline(currentPipeline);
      if (currentPipeline.code) setCodePreview(currentPipeline.code);
    }
  }, [currentPipeline]);

  // ── Drag-and-Drop ──

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData('application/json');
      if (!raw) return;
      let item: PaletteItem;
      try { item = JSON.parse(raw); } catch { return; }
      const position = reactFlowRef.current?.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      if (!position) return;
      const newNode: Node<PipelineNodeData> = {
        id: generateNodeId(item.type),
        type: 'pipelineNode',
        position,
        data: {
          label: item.label,
          type: item.type as 'source' | 'transform' | 'destination',
          description: item.description,
          status: 'idle',
          config: item.defaultConfig || {},
        },
      };
      setNodes((nds) => [...nds, newNode]);
      addNotification({ type: 'info', message: `Added "${item.label}" node to canvas` });
    },
    [setNodes, addNotification],
  );

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({
        ...params,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#A78BFA', strokeWidth: 2 },
      }, eds));
    },
    [setEdges],
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node<PipelineNodeData>) => {
      setSelectedNode(node);
      setShowProperties(true);
    },
    [],
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setShowProperties(false);
  }, []);

  const handleNodeUpdate = useCallback(
    (nodeId: string, data: Partial<PipelineNodeData>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n)),
      );
      addNotification({ type: 'success', message: `Node updated` });
    },
    [setNodes, addNotification],
  );

  const handleNodeDelete = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setSelectedNode(null);
      setShowProperties(false);
      addNotification({ type: 'info', message: `Deleted node` });
    },
    [setNodes, setEdges, addNotification],
  );

  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      if (selectedNode && deleted.some((n) => n.id === selectedNode.id)) {
        setSelectedNode(null);
        setShowProperties(false);
      }
    },
    [selectedNode],
  );

  const onFitView = useCallback(() => {
    reactFlowRef.current?.fitView({ padding: 0.2, duration: 300 });
  }, []);

  const onResetZoom = useCallback(() => {
    reactFlowRef.current?.setViewport({ x: 0, y: 0, zoom: 1 });
    setZoom(1);
  }, []);

  const onExportImage = useCallback(async () => {
    if (!canvasContainerRef.current) return;
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(canvasContainerRef.current, {
        backgroundColor: '#0D1A2A',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement('a');
      link.download = `pipeline-${currentPipeline?.name || 'canvas'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      addNotification({ type: 'success', message: 'Pipeline exported as PNG! 📸' });
    } catch {
      addNotification({ type: 'error', message: 'Failed to export image' });
    }
  }, [currentPipeline, addNotification]);

  const stats = useMemo(() => ({
    nodeCount: compact ? compactNodes.length : nodes.length,
    edgeCount: compact ? compactEdges.length : edges.length,
    running: currentPipeline?.status === 'running',
  }), [nodes, edges, compactNodes, compactEdges, currentPipeline]);

  // ── Compact Preview Mode ────────────────────────────────────────────

  if (compact) {
    if (!pipelineProp?.nodes || pipelineProp.nodes.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-gray-500 text-sm">
          <div className="text-center">
            <GitBranch size={24} className="mx-auto text-gray-600 mb-2" />
            <p>No pipeline generated yet</p>
            <p className="text-xs text-gray-600 mt-1">Describe your pipeline in the chat</p>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full h-full" style={{ background: 'transparent' }}>
        <ReactFlow
          nodes={compactNodes}
          edges={compactEdges}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          zoomOnScroll={false}
          panOnScroll={false}
          nodesDraggable={false}
          elementsSelectable={false}
          nodeTypes={nodeTypes}
        >
          <Background color="#1E293B" gap={20} size={1} />
        </ReactFlow>
      </div>
    );
  }

  // ── Loading / Error / Empty States ──

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-3 text-sm text-gray-400">Loading pipeline...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-gray-500">
        <div className="text-5xl mb-3">😕</div>
        <p className="text-sm font-medium text-gray-300">Failed to load pipeline</p>
        <p className="text-xs text-gray-500 mt-1 mb-4 max-w-xs text-center">{error}</p>
        <button onClick={() => pipelineId && fetchPipeline(pipelineId)} className="btn-secondary text-sm px-4 py-2">
          Retry
        </button>
      </div>
    );
  }

  // ── Full Interactive Mode ──

  return (
    <div ref={canvasContainerRef} className={`flex flex-col h-full overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-[#1E293B] bg-[#111827] px-3 py-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowPalette(!showPalette)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
              showPalette
                ? 'bg-purple-600/20 text-purple-300'
                : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
            }`}
          >
            <LayoutPanelTop size={14} />
            Nodes
          </button>
          <div className="w-px h-4 bg-[#1E293B] mx-1" />
          <span className="text-xs text-gray-500">
            {stats.nodeCount} nodes · {stats.edgeCount} edges
          </span>
        </div>
        <div className="flex items-center gap-2">
          {selectedNode && (
            <button
              onClick={() => setShowProperties(!showProperties)}
              className={`text-xs font-medium px-2 py-1 rounded-lg transition ${
                showProperties
                  ? 'bg-purple-600/20 text-purple-300'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {showProperties ? 'Hide Properties' : 'Properties'}
            </button>
          )}
          <CanvasControls
            onFitView={onFitView}
            onResetZoom={onResetZoom}
            onExportImage={onExportImage}
            zoom={zoom}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0 bg-[#0D1A2A]">
        {showPalette && (
          <div className="w-[200px] border-r border-[#1E293B] bg-[#111827] shrink-0 overflow-hidden">
            <NodePalette />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={(_e, node) => { setSelectedNode(node); setShowProperties(true); }}
            onPaneClick={onPaneClick}
            onNodesDelete={onNodesDelete}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onInit={(instance) => { reactFlowRef.current = instance; }}
            onMoveEnd={(_event, viewport) => setZoom(viewport.zoom)}
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
            <Background color="#1E293B" gap={20} size={1} variant={BackgroundVariant.Dots} />
            <Controls showInteractive={false} position="bottom-right" className="!rounded-xl !border !border-[#1E293B] !bg-[#111827] !shadow-md" />
            <MiniMap
              position="bottom-left"
              className="!rounded-xl !border !border-[#1E293B] !bg-[#111827] !shadow-md"
              nodeColor={(node) => {
                const t = (node.data as PipelineNodeData)?.type || 'default';
                const colors: Record<string, string> = {
                  source: '#A78BFA',
                  transform: '#C4B5FD',
                  destination: '#86EFAC',
                  default: '#374151',
                };
                return colors[t] || colors.default;
              }}
              nodeBorderRadius={8}
            />

            {currentPipeline && (
              <Panel position="top-center" className="!bg-[#111827]/90 backdrop-blur-sm !px-4 !py-2 !rounded-xl !shadow-sm !text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-200">{currentPipeline.name}</span>
                  <span className={`px-2 py-0.5 rounded-full font-medium ${
                    currentPipeline.status === 'running' ? 'bg-yellow-500/20 text-yellow-400' :
                    currentPipeline.status === 'success' ? 'bg-green-500/20 text-green-400' :
                    currentPipeline.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                    'bg-white/5 text-gray-400'
                  }`}>
                    {currentPipeline.status || 'draft'}
                  </span>
                  <span className={`flex items-center gap-1 ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full inline-block ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                    {isConnected ? 'Live' : 'Offline'}
                  </span>
                </div>
              </Panel>
            )}

            {nodes.length === 0 && (
              <Panel position="top-center" className="pointer-events-none !mt-20">
                <div className="text-center">
                  <Database size={32} className="mx-auto text-gray-600 mb-2" />
                  <p className="text-sm text-gray-400 font-medium">Drop nodes here</p>
                  <p className="text-xs text-gray-500 mt-1">Drag from the palette or type a prompt in chat</p>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>

        {showProperties && selectedNode && (
          <div className="w-[260px] shrink-0 overflow-hidden">
            <NodePropertiesPanel
              node={selectedNode}
              isOpen={true}
              onClose={() => { setShowProperties(false); setSelectedNode(null); }}
              onUpdate={handleNodeUpdate}
              onDelete={handleNodeDelete}
            />
          </div>
        )}
      </div>

      {/* Agent Step Cards — real-time agent activity overlay */}
      {agentSteps.length > 0 && (
        <div className="absolute bottom-4 left-4 z-10 w-72 space-y-2 pointer-events-none">
          <AnimatePresence initial={false}>
            {agentSteps.map((step) => (
              <AgentStepCard key={step.agent} step={step} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {codePreview && (
        <div className="border-t border-[#1E293B] bg-[#111827] shrink-0">
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-purple-400" />
              <p className="text-xs font-medium text-gray-400">Generated Code</p>
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(codePreview); addNotification({ type: 'success', message: 'Code copied!' }); }}
              className="rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-medium text-gray-300 transition hover:bg-white/20"
            >
              Copy
            </button>
          </div>
          <div className="max-h-20 overflow-auto bg-[#050816] px-4 py-2">
            <pre className="font-mono text-[11px] leading-relaxed text-green-400 whitespace-pre-wrap">
              {codePreview}
            </pre>
          </div>
        </div>
      )}

      <NodeDetailsModal
        node={selectedNode}
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); }}
      />
    </div>
  );
};

export default PipelineCanvas;
export type { PipelineCanvasProps };
