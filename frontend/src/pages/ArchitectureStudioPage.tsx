import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
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
import type { Node, Edge, Connection, NodeTypes, EdgeTypes, ReactFlowInstance } from 'reactflow';
import 'reactflow/dist/style.css';

import {
  Save, Share2, Download, Sparkles, History,
  Layers, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';

import ArchitectureNode, { type ArchitectureNodeData } from '../components/architecture/ArchitectureNode';
import AnimatedEdge from '../components/architecture/AnimatedEdge';
import AssetLibraryPanel from '../components/architecture/AssetLibraryPanel';
import type { AssetItem } from '../components/architecture/AssetLibraryPanel';
import ArchitecturePropertiesPanel from '../components/architecture/ArchitecturePropertiesPanel';
import ArchitectureToolbar from '../components/architecture/ArchitectureToolbar';
import AIGenerationPanel from '../components/architecture/AIGenerationPanel';
import { useNotificationStore } from '../store/notificationStore';

// ── ReactFlow type registration ──────────────────────────────────────

const nodeTypes: NodeTypes = {
  architectureNode: ArchitectureNode,
};

const edgeTypes: EdgeTypes = {
  animatedEdge: AnimatedEdge,
};

// ── Node ID generator ────────────────────────────────────────────────

let nodeCounter = 0;
const generateNodeId = (type: string): string => {
  nodeCounter += 1;
  return `${type}-${nodeCounter}-${Date.now()}`;
};

// ── Default architecture (E-Commerce Data Platform) ───────────────────

const DEFAULT_NODES: Node<ArchitectureNodeData>[] = [
  {
    id: 'pg-1',
    type: 'architectureNode',
    position: { x: 60, y: 120 },
    data: {
      label: 'PostgreSQL',
      category: 'databases',
      service: 'PostgreSQL 15',
      icon: '🐘',
      status: 'healthy',
      metrics: { Connections: '124', CPU: '42%', Storage: '67%' },
    },
  },
  {
    id: 'kafka-1',
    type: 'architectureNode',
    position: { x: 340, y: 80 },
    data: {
      label: 'Apache Kafka',
      category: 'streaming',
      service: 'Kafka Cluster',
      icon: '📡',
      status: 'healthy',
      metrics: { Topics: '42', Throughput: '18K msg/s', Lag: '120ms' },
    },
  },
  {
    id: 'airflow-1',
    type: 'architectureNode',
    position: { x: 340, y: 260 },
    data: {
      label: 'Apache Airflow',
      category: 'orchestration',
      service: 'Airflow 2.8',
      icon: '🌬️',
      status: 'warning',
      metrics: { DAGs: '82', Running: '7', Failed: '2' },
    },
  },
  {
    id: 'spark-1',
    type: 'architectureNode',
    position: { x: 620, y: 120 },
    data: {
      label: 'Apache Spark',
      category: 'processing',
      service: 'Spark 3.5',
      icon: '✨',
      status: 'healthy',
      metrics: { Jobs: '12', Executors: '8', Memory: '4.2GB' },
    },
  },
  {
    id: 'dbt-1',
    type: 'architectureNode',
    position: { x: 620, y: 280 },
    data: {
      label: 'dbt',
      category: 'processing',
      service: 'dbt Core 1.7',
      icon: '🔧',
      status: 'healthy',
      metrics: { Models: '47', Tests: '128', Last: '2min' },
    },
  },
  {
    id: 'snow-1',
    type: 'architectureNode',
    position: { x: 900, y: 160 },
    data: {
      label: 'Snowflake',
      category: 'databases',
      service: 'Snowflake Enterprise',
      icon: '❄️',
      status: 'healthy',
      metrics: { Tables: '234', Queries: '1.2K/day', Cost: '$420' },
    },
  },
  {
    id: 'grafana-1',
    type: 'architectureNode',
    position: { x: 900, y: 340 },
    data: {
      label: 'Grafana',
      category: 'monitoring',
      service: 'Grafana 10',
      icon: '📈',
      status: 'healthy',
      metrics: { Dashboards: '12', Alerts: '34' },
    },
  },
];

const DEFAULT_EDGES: Edge[] = [
  { id: 'e-pg-kafka', source: 'pg-1', target: 'kafka-1', type: 'animatedEdge', data: { edgeType: 'dataflow', label: 'CDC', animated: true } },
  { id: 'e-pg-airflow', source: 'pg-1', target: 'airflow-1', type: 'animatedEdge', data: { edgeType: 'control', label: 'Trigger' } },
  { id: 'e-kafka-spark', source: 'kafka-1', target: 'spark-1', type: 'animatedEdge', data: { edgeType: 'dataflow', label: 'Stream', animated: true } },
  { id: 'e-airflow-dbt', source: 'airflow-1', target: 'dbt-1', type: 'animatedEdge', data: { edgeType: 'control', label: 'Orchestrate' } },
  { id: 'e-spark-snow', source: 'spark-1', target: 'snow-1', type: 'animatedEdge', data: { edgeType: 'dataflow', label: 'Load', animated: true } },
  { id: 'e-dbt-snow', source: 'dbt-1', target: 'snow-1', type: 'animatedEdge', data: { edgeType: 'dataflow', label: 'Transform' } },
  { id: 'e-snow-grafana', source: 'snow-1', target: 'grafana-1', type: 'animatedEdge', data: { edgeType: 'monitoring', label: 'Metrics' } },
];

// ── Component ────────────────────────────────────────────────────────

type Tool = 'select' | 'pan' | 'add' | 'connect' | 'text' | 'group' | 'comment';

const AI_GENERATION_STEPS = [
  'Understanding requirement',
  'Discovering components',
  'Selecting services',
  'Building dependencies',
  'Validating architecture',
  'Checking security',
  'Generating diagram',
];

export default function ArchitectureStudioPage() {
  const { addNotification } = useNotificationStore();

  // ── State ────────────────────────────────────────────────────────
  const [nodes, setNodes, onNodesChange] = useNodesState(DEFAULT_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(DEFAULT_EDGES);
  const [selectedNode, setSelectedNode] = useState<Node<ArchitectureNodeData> | null>(null);
  const [showProperties, setShowProperties] = useState(false);
  const [showAssetLibrary, setShowAssetLibrary] = useState(true);
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationSteps, setGenerationSteps] = useState<string[]>([]);
  const [history, setHistory] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const reactFlowRef = useRef<ReactFlowInstance | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // ── History (undo/redo) ──────────────────────────────────────────

  const pushHistory = useCallback(() => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ nodes: [...nodes], edges: [...edges] });
      return newHistory.slice(-50); // Keep last 50 states
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 49));
  }, [nodes, edges, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const prev = history[historyIndex - 1];
    setNodes(prev.nodes);
    setEdges(prev.edges);
    setHistoryIndex((i) => i - 1);
  }, [history, historyIndex, setNodes, setEdges]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    setNodes(next.nodes);
    setEdges(next.edges);
    setHistoryIndex((i) => i + 1);
  }, [history, historyIndex, setNodes, setEdges]);

  // ── ReactFlow callbacks ──────────────────────────────────────────

  const onConnect = useCallback(
    (params: Connection) => {
      pushHistory();
      setEdges((eds) =>
        addEdge(
          { ...params, type: 'animatedEdge', data: { edgeType: 'dataflow', animated: true } },
          eds
        )
      );
    },
    [setEdges, pushHistory]
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node<ArchitectureNodeData>) => {
      setSelectedNode(node);
      setShowProperties(true);
    },
    []
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setShowProperties(false);
  }, []);

  const onMoveEnd = useCallback((_event: unknown, viewport: { zoom: number }) => {
    setZoom(viewport.zoom);
  }, []);

  // ── Asset actions ────────────────────────────────────────────────

  const onAddAsset = useCallback(
    (item: AssetItem) => {
      pushHistory();
      const newNode: Node<ArchitectureNodeData> = {
        id: generateNodeId(item.id),
        type: 'architectureNode',
        position: {
          x: 200 + Math.random() * 400,
          y: 100 + Math.random() * 300,
        },
        data: {
          label: item.name,
          category: item.category,
          service: item.service,
          icon: item.icon,
          status: 'unknown',
          metrics: item.defaultMetrics || {},
        },
      };
      setNodes((nds) => [...nds, newNode]);
      addNotification({ type: 'info', message: `Added ${item.name} to canvas` });
    },
    [setNodes, pushHistory, addNotification]
  );

  // ── Drag & Drop ──────────────────────────────────────────────────

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData('application/aiden-asset');
      if (!raw) return;
      let item: AssetItem;
      try {
        item = JSON.parse(raw);
      } catch {
        return;
      }
      const position = reactFlowRef.current?.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      if (!position) return;

      pushHistory();
      const newNode: Node<ArchitectureNodeData> = {
        id: generateNodeId(item.id),
        type: 'architectureNode',
        position,
        data: {
          label: item.name,
          category: item.category,
          service: item.service,
          icon: item.icon,
          status: 'unknown',
          metrics: item.defaultMetrics || {},
        },
      };
      setNodes((nds) => [...nds, newNode]);
      addNotification({ type: 'info', message: `Added "${item.name}" to canvas` });
    },
    [setNodes, pushHistory, addNotification]
  );

  // ── Node actions ─────────────────────────────────────────────────

  const handleUpdateNode = useCallback(
    (nodeId: string, data: Partial<ArchitectureNodeData>) => {
      pushHistory();
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
        )
      );
      // Update selectedNode if it's the one being edited
      setSelectedNode((prev) =>
        prev && prev.id === nodeId
          ? { ...prev, data: { ...prev.data, ...data } }
          : prev
      );
    },
    [setNodes, pushHistory]
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      pushHistory();
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setSelectedNode(null);
      setShowProperties(false);
      addNotification({ type: 'info', message: 'Node deleted' });
    },
    [setNodes, setEdges, pushHistory, addNotification]
  );

  const handleDuplicateNode = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      pushHistory();
      const newNode: Node<ArchitectureNodeData> = {
        ...node,
        id: generateNodeId(node.data.category),
        position: { x: node.position.x + 40, y: node.position.y + 40 },
        data: { ...node.data },
      };
      setNodes((nds) => [...nds, newNode]);
      addNotification({ type: 'info', message: `Duplicated ${node.data.label}` });
    },
    [nodes, setNodes, pushHistory, addNotification]
  );

  // ── Canvas actions ───────────────────────────────────────────────

  const onFitView = useCallback(() => {
    reactFlowRef.current?.fitView({ padding: 0.2, duration: 300 });
  }, []);

  const onAutoLayout = useCallback(() => {
    // Simple left-to-right layout based on categories
    const categoryOrder = ['databases', 'streaming', 'orchestration', 'processing', 'storage', 'monitoring'];
    const grouped: Record<string, Node<ArchitectureNodeData>[]> = {};
    nodes.forEach((n) => {
      const cat = n.data.category || 'default';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(n);
    });

    pushHistory();
    const newNodes = nodes.map((n) => {
      const cat = n.data.category || 'default';
      const catIdx = categoryOrder.indexOf(cat);
      const col = catIdx >= 0 ? catIdx : categoryOrder.length;
      const rowIdx = (grouped[cat] || []).indexOf(n);
      return {
        ...n,
        position: { x: 80 + col * 260, y: 80 + rowIdx * 140 },
      };
    });
    setNodes(newNodes);
    setTimeout(() => reactFlowRef.current?.fitView({ padding: 0.2, duration: 300 }), 50);
    addNotification({ type: 'success', message: 'Auto-layout applied' });
  }, [nodes, setNodes, pushHistory, addNotification]);

  const onZoomIn = useCallback(() => {
    reactFlowRef.current?.zoomIn({ duration: 200 });
  }, []);

  const onZoomOut = useCallback(() => {
    reactFlowRef.current?.zoomOut({ duration: 200 });
  }, []);

  const onExport = useCallback(() => {
    addNotification({ type: 'success', message: 'Architecture exported! (PNG)' });
  }, [addNotification]);

  const onSave = useCallback(() => {
    pushHistory();
    addNotification({ type: 'success', message: 'Architecture saved!' });
  }, [pushHistory, addNotification]);

  // ── AI Generation ────────────────────────────────────────────────

  const handleAIGenerate = useCallback(
    (_prompt: string) => {
      setIsGenerating(true);
      setGenerationSteps([]);
      setShowAIPanel(false);

      // Simulate AI generation with animated steps
      AI_GENERATION_STEPS.forEach((step, i) => {
        setTimeout(() => {
          setGenerationSteps((prev) => [...prev, step]);
        }, (i + 1) * 800);
      });

      // After all steps, generate the architecture
      setTimeout(() => {
        pushHistory();
        const generatedNodes: Node<ArchitectureNodeData>[] = [
          {
            id: 'ai-pg-1',
            type: 'architectureNode',
            position: { x: 60, y: 120 },
            data: {
              label: 'PostgreSQL',
              category: 'databases',
              service: 'PostgreSQL 15',
              icon: '🐘',
              status: 'healthy',
              metrics: { Connections: '124', CPU: '42%' },
            },
          },
          {
            id: 'ai-kafka-1',
            type: 'architectureNode',
            position: { x: 320, y: 120 },
            data: {
              label: 'Apache Kafka',
              category: 'streaming',
              service: 'Kafka Cluster',
              icon: '📡',
              status: 'healthy',
              metrics: { Topics: '42', Throughput: '18K msg/s' },
            },
          },
          {
            id: 'ai-spark-1',
            type: 'architectureNode',
            position: { x: 580, y: 120 },
            data: {
              label: 'Apache Spark',
              category: 'processing',
              service: 'Spark 3.5',
              icon: '✨',
              status: 'healthy',
              metrics: { Jobs: '12', Executors: '8' },
            },
          },
          {
            id: 'ai-snow-1',
            type: 'architectureNode',
            position: { x: 840, y: 120 },
            data: {
              label: 'Snowflake',
              category: 'databases',
              service: 'Snowflake Enterprise',
              icon: '❄️',
              status: 'healthy',
              metrics: { Tables: '234', Queries: '1.2K/day' },
            },
          },
          {
            id: 'ai-grafana-1',
            type: 'architectureNode',
            position: { x: 840, y: 300 },
            data: {
              label: 'Grafana',
              category: 'monitoring',
              service: 'Grafana 10',
              icon: '📈',
              status: 'healthy',
              metrics: { Dashboards: '12' },
            },
          },
        ];

        const generatedEdges: Edge[] = [
          { id: 'ai-e-1', source: 'ai-pg-1', target: 'ai-kafka-1', type: 'animatedEdge', data: { edgeType: 'dataflow', label: 'CDC', animated: true } },
          { id: 'ai-e-2', source: 'ai-kafka-1', target: 'ai-spark-1', type: 'animatedEdge', data: { edgeType: 'dataflow', label: 'Stream', animated: true } },
          { id: 'ai-e-3', source: 'ai-spark-1', target: 'ai-snow-1', type: 'animatedEdge', data: { edgeType: 'dataflow', label: 'Load', animated: true } },
          { id: 'ai-e-4', source: 'ai-snow-1', target: 'ai-grafana-1', type: 'animatedEdge', data: { edgeType: 'monitoring', label: 'Metrics' } },
        ];

        setNodes(generatedNodes);
        setEdges(generatedEdges);
        setIsGenerating(false);
        setGenerationSteps([]);
        addNotification({
          type: 'success',
          message: 'Architecture generated! 5 components, 4 connections',
        });

        setTimeout(() => reactFlowRef.current?.fitView({ padding: 0.2, duration: 500 }), 100);
      }, AI_GENERATION_STEPS.length * 800 + 600);
    },
    [setNodes, setEdges, pushHistory, addNotification]
  );

  // ── Keyboard shortcuts ───────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const ctrl = e.metaKey || e.ctrlKey;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNode) {
          handleDeleteNode(selectedNode.id);
        }
      }
      if (ctrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if (ctrl && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      }
      if (ctrl && e.key === 's') {
        e.preventDefault();
        onSave();
      }
      if (e.key === 'f' || e.key === 'F') {
        if (!ctrl) onFitView();
      }
      if (e.key === 'l' || e.key === 'L') {
        if (!ctrl) onAutoLayout();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, handleDeleteNode, undo, redo, onSave, onFitView, onAutoLayout]);

  // ── Stats ────────────────────────────────────────────────────────

  const stats = useMemo(
    () => ({
      nodeCount: nodes.length,
      edgeCount: edges.length,
      healthy: nodes.filter((n) => n.data.status === 'healthy').length,
      warnings: nodes.filter((n) => n.data.status === 'warning').length,
      errors: nodes.filter((n) => n.data.status === 'error' || n.data.status === 'critical').length,
    }),
    [nodes, edges]
  );

  // ── Minimap node color ───────────────────────────────────────────

  const minimapNodeColor = useCallback((node: Node) => {
    const status = (node.data as ArchitectureNodeData)?.status;
    const colors: Record<string, string> = {
      healthy: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      critical: '#dc2626',
      disconnected: '#6b7280',
      unknown: '#374151',
      monitoring: '#3b82f6',
    };
    return colors[status || 'unknown'] || '#374151';
  }, []);

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] -mt-4 -mx-4 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-8">
      {/* ── Top Bar ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1F2937] bg-[#0E131D] shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-cyan-500">
            <Layers size={14} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-[var(--color-text)]">Architecture Studio</h1>
            <p className="text-[10px] text-[var(--color-text-muted)]">E-Commerce Data Platform</p>
          </div>
          <div className="flex items-center gap-1.5 ml-4">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
              v1.0
            </span>
            <span className="text-[10px] text-[var(--color-text-muted)]">
              {stats.nodeCount} nodes · {stats.edgeCount} edges
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status indicators */}
          <div className="flex items-center gap-2 mr-2">
            <span className="flex items-center gap-1 text-[10px] text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {stats.healthy}
            </span>
            {stats.warnings > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {stats.warnings}
              </span>
            )}
            {stats.errors > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-red-400">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                {stats.errors}
              </span>
            )}
          </div>

          <button
            onClick={() => setShowAIPanel(true)}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600/20 to-cyan-600/20 border border-purple-500/20 px-3 py-1.5 text-xs font-medium text-purple-300 hover:from-purple-600/30 hover:to-cyan-600/30 transition"
          >
            <Sparkles size={12} />
            Generate with AI
          </button>
          <button className="flex items-center gap-1.5 rounded-lg border border-[#1F2937] px-2.5 py-1.5 text-xs text-[var(--color-text-muted)] hover:bg-white/5 transition">
            <History size={12} />
            History
          </button>
          <button
            onClick={onSave}
            className="flex items-center gap-1.5 rounded-lg border border-[#1F2937] px-2.5 py-1.5 text-xs text-[var(--color-text-muted)] hover:bg-white/5 transition"
          >
            <Save size={12} />
            Save
          </button>
          <button className="flex items-center gap-1.5 rounded-lg border border-[#1F2937] px-2.5 py-1.5 text-xs text-[var(--color-text-muted)] hover:bg-white/5 transition">
            <Share2 size={12} />
            Share
          </button>
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-500 transition"
          >
            <Download size={12} />
            Export
          </button>
        </div>
      </div>

      {/* ── Main Content (3-panel layout) ──────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* Asset Library (left) */}
        <AnimatePresence mode="wait">
          {showAssetLibrary && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 240, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0 overflow-hidden"
            >
              <AssetLibraryPanel onAddAsset={onAddAsset} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle asset library */}
        <button
          onClick={() => setShowAssetLibrary(!showAssetLibrary)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-30 flex h-8 w-5 items-center justify-center rounded-r-lg border border-l-0 border-[#1F2937] bg-[#0E131D] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition"
          style={{ left: showAssetLibrary ? 240 : 0 }}
        >
          {showAssetLibrary ? <PanelLeftClose size={12} /> : <PanelLeftOpen size={12} />}
        </button>

        {/* Canvas (center) */}
        <div ref={canvasRef} className="flex-1 relative bg-[#080B12]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onInit={(instance) => { reactFlowRef.current = instance; }}
            onMoveEnd={onMoveEnd}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            snapToGrid
            snapGrid={[15, 15]}
            deleteKeyCode={['Backspace', 'Delete']}
            multiSelectionKeyCode="Shift"
            minZoom={0.1}
            maxZoom={3}
            attributionPosition="bottom-right"
            proOptions={{ hideAttribution: true }}
          >
            {showGrid && (
              <Background color="#1F2937" gap={20} size={1} variant={BackgroundVariant.Dots} />
            )}
            <Controls
              showInteractive={false}
              position="bottom-right"
              className="!rounded-xl !border !border-[#1F2937] !bg-[#111827] !shadow-lg !hidden"
            />
            <MiniMap
              position="bottom-right"
              className="!rounded-xl !border !border-[#1F2937] !bg-[#111827] !shadow-lg"
              nodeColor={minimapNodeColor}
              nodeBorderRadius={6}
              maskColor="rgba(8, 11, 18, 0.7)"
              style={{ marginBottom: 8 }}
            />

            {/* Empty state */}
            {nodes.length === 0 && (
              <Panel position="top-center" className="pointer-events-none !mt-32">
                <div className="text-center">
                  <Layers size={40} className="mx-auto text-[#1F2937] mb-3" />
                  <p className="text-sm text-[var(--color-text-muted)] font-medium">Drop components here</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    Drag from the asset library or click "Generate with AI"
                  </p>
                </div>
              </Panel>
            )}
          </ReactFlow>

          {/* AI Generation Panel */}
          <AIGenerationPanel
            isOpen={showAIPanel}
            onClose={() => setShowAIPanel(false)}
            onGenerate={handleAIGenerate}
            isGenerating={isGenerating}
            generationSteps={generationSteps}
          />

          {/* Floating Toolbar */}
          <ArchitectureToolbar
            activeTool={activeTool}
            onToolChange={setActiveTool}
            onUndo={undo}
            onRedo={redo}
            onAutoLayout={onAutoLayout}
            onFitView={onFitView}
            onToggleGrid={() => setShowGrid(!showGrid)}
            onZoomIn={onZoomIn}
            onZoomOut={onZoomOut}
            showGrid={showGrid}
            zoom={zoom}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
          />
        </div>

        {/* Properties Panel (right) */}
        <AnimatePresence mode="wait">
          {showProperties && selectedNode && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 288, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0 overflow-hidden"
            >
              <ArchitecturePropertiesPanel
                node={selectedNode}
                onClose={() => { setShowProperties(false); setSelectedNode(null); }}
                onUpdate={handleUpdateNode}
                onDelete={handleDeleteNode}
                onDuplicate={handleDuplicateNode}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
