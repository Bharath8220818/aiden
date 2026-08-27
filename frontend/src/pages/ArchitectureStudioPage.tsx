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
  Layers, PanelLeftClose, PanelLeftOpen, Activity
} from 'lucide-react';

import ArchitectureNode, { type ArchitectureNodeData } from '../components/architecture/ArchitectureNode';
import AnimatedEdge from '../components/architecture/AnimatedEdge';
import ArchitectureZone, { type ZoneData } from '../components/architecture/ArchitectureZone';
import AssetLibraryPanel from '../components/architecture/AssetLibraryPanel';
import type { AssetItem } from '../components/architecture/AssetLibraryPanel';
import ArchitecturePropertiesPanel from '../components/architecture/ArchitecturePropertiesPanel';
import ArchitectureToolbar from '../components/architecture/ArchitectureToolbar';
import AIGenerationPanel from '../components/architecture/AIGenerationPanel';
import AICopilotPanel from '../components/architecture/AICopilotPanel';
import { ExportModal } from '../components/architecture/ExportModal';
import { useNotificationStore } from '../store/notificationStore';
import { architectureApi, type ArchitectureResult } from '../api/architecture';
import { useLiveMonitor } from '../hooks/useLiveMonitor';
import { Bot } from 'lucide-react';

// ── ReactFlow type registration ──────────────────────────────────────

const nodeTypes: NodeTypes = {
  architectureNode: ArchitectureNode,
  architectureZone: ArchitectureZone,
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

const DEFAULT_NODES: Node<ArchitectureNodeData | ZoneData>[] = [
  // Zones (group containers)
  {
    id: 'zone-sources',
    type: 'architectureZone',
    position: { x: 0, y: 20 },
    data: { label: 'Data Sources', color: 'blue', collapsed: false, nodeCount: 1, description: 'Source databases and APIs' } as ZoneData,
    style: { width: 320, height: 260, zIndex: -1 },
  },
  {
    id: 'zone-streaming',
    type: 'architectureZone',
    position: { x: 320, y: 20 },
    data: { label: 'Ingestion & Streaming', color: 'cyan', collapsed: false, nodeCount: 2, description: 'Event streaming and orchestration' } as ZoneData,
    style: { width: 320, height: 260, zIndex: -1 },
  },
  {
    id: 'zone-processing',
    type: 'architectureZone',
    position: { x: 640, y: 20 },
    data: { label: 'Processing', color: 'amber', collapsed: false, nodeCount: 2, description: 'Transform and process data' } as ZoneData,
    style: { width: 320, height: 260, zIndex: -1 },
  },
  {
    id: 'zone-analytics',
    type: 'architectureZone',
    position: { x: 960, y: 20 },
    data: { label: 'Analytics & Monitoring', color: 'violet', collapsed: false, nodeCount: 2, description: 'Warehouse and dashboards' } as ZoneData,
    style: { width: 320, height: 320, zIndex: -1 },
  },
  // Nodes
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
  const [showAssetLibrary, setShowAssetLibrary] = useState(() => window.innerWidth >= 768);
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showCopilot, setShowCopilot] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationSteps, setGenerationSteps] = useState<string[]>([]);
  const [history, setHistory] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const reactFlowRef = useRef<ReactFlowInstance | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // ── Live infrastructure monitoring ────────────────────────────────
  const liveComponents = useMemo(
    () => nodes
      .filter((n): n is Node<ArchitectureNodeData> => n.type === 'architectureNode')
      .map((n) => ({ id: n.id, service: String(n.data.service || n.data.label) })),
    [nodes]
  );
  const { statuses, isLive, lastUpdate, error: liveError, toggle: toggleLive } = useLiveMonitor(liveComponents, 10000);

  // Apply live statuses to nodes when they change
  useEffect(() => {
    if (!isLive || Object.keys(statuses).length === 0) return;
    setNodes((nds) =>
      nds.map((n) => {
        const live = statuses[n.id];
        if (!live) return n;
        if (n.type !== 'architectureNode') return n;
        return {
          ...n,
          data: {
            ...n.data,
            status: (live.status || n.data.status) as ArchitectureNodeData['status'],
            metrics: { ...(n.data.metrics || {}), ...(live.metrics || {}) },
          },
        };
      })
    );
  }, [statuses, isLive, setNodes]);

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
      if (!params.source || !params.target) return;
      pushHistory();
      setEdges((eds) =>
        addEdge(
          { ...params, source: params.source!, target: params.target!, type: 'animatedEdge', data: { edgeType: 'dataflow', animated: true } },
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
        id: generateNodeId(node.type === 'architectureNode' ? String(node.data.category || 'component') : 'component'),
        position: { x: node.position.x + 40, y: node.position.y + 40 },
        data: { ...node.data } as ArchitectureNodeData,
      };
      setNodes((nds) => [...nds, newNode]);
      addNotification({ type: 'info', message: `Duplicated ${node.data.label}` });
    },
    [nodes, setNodes, pushHistory, addNotification]
  );

  // ── Copilot action handler ──────────────────────────────────────

  const handleCopilotAction = useCallback(
    (action: { type: string; payload?: unknown }) => {
      if (action.type === 'add-node' && action.payload) {
        const p = action.payload as {
          name?: string; icon?: string; category?: string;
          service?: string; status?: string; metrics?: Record<string, string>;
        };
        pushHistory();
        // Read current nodes for positioning (user actions are sequential, so closure is current)
        const archNodes = nodes.filter((n) => n.type === 'architectureNode');
        const maxX = archNodes.length > 0
          ? Math.max(...archNodes.map((n) => n.position.x))
          : 0;
        const existingAtX = archNodes.filter((n) => Math.abs(n.position.x - maxX) < 10).length;
        const rightmost = archNodes.length > 0
          ? archNodes.reduce((a, b) => a.position.x > b.position.x ? a : b)
          : null;

        const newNodeId = generateNodeId(p.category || 'component');
        const newNode: Node<ArchitectureNodeData> = {
          id: newNodeId,
          type: 'architectureNode',
          position: { x: maxX + 260, y: 100 + existingAtX * 160 },
          data: {
            label: p.name || 'New Component',
            category: p.category || 'processing',
            service: p.service || p.name || 'Service',
            icon: p.icon || '\U0001f4e6',
            status: (p.status as ArchitectureNodeData['status']) || 'healthy',
            metrics: p.metrics || {},
          },
        };
        setNodes((nds) => [...nds, newNode]);

        // Auto-connect to the rightmost existing node
        if (rightmost) {
          setEdges((eds) => [
            ...eds,
            {
              id: `e-copilot-${rightmost.id}-${newNodeId}`,
              source: rightmost.id,
              target: newNodeId,
              type: 'animatedEdge',
              data: { edgeType: 'dataflow', label: 'Added by AI', animated: true },
            },
          ]);
        }

        addNotification({ type: 'success', message: `Added ${p.name || 'component'} to canvas` });
        setTimeout(() => reactFlowRef.current?.fitView({ padding: 0.2, duration: 300 }), 50);
      } else if (action.type === 'remove-node' && action.payload) {
        const p = action.payload as { id?: string; name?: string };
        // Find node id from the latest state
        let foundId = p.id || '';
        if (!foundId) {
          setNodes((nds) => {
            const match = nds.find((n) =>
              n.type === 'architectureNode' && (
                n.data.label === p.name || n.data.service === p.name
              )
            );
            if (match) foundId = match.id;
            return nds; // Don't modify, just read
          });
        }
        if (foundId) {
          pushHistory();
          setNodes((nds) => nds.filter((n) => n.id !== foundId));
          setEdges((eds) => eds.filter((e) => e.source !== foundId && e.target !== foundId));
          setSelectedNode(null);
          setShowProperties(false);
          addNotification({ type: 'info', message: 'Node deleted' });
        }
      } else if (action.type === 'add-edge' && action.payload) {
        const p = action.payload as { source?: string; target?: string; label?: string };
        if (p.source && p.target) {
          const edgeSource = p.source;
          const edgeTarget = p.target;
          pushHistory();
          setEdges((eds) => [
            ...eds,
            {
              id: `e-copilot-${edgeSource}-${edgeTarget}`,
              source: edgeSource,
              target: edgeTarget,
              type: 'animatedEdge',
              data: { edgeType: 'dataflow', label: p.label || '', animated: true },
            },
          ]);
          addNotification({ type: 'success', message: `Connected ${p.source} → ${p.target}` });
        }
      }
    },
    [nodes, setNodes, setEdges, pushHistory, addNotification, setSelectedNode, setShowProperties]
  );

  // ── Canvas actions ───────────────────────────────────────────────

  const onFitView = useCallback(() => {
    reactFlowRef.current?.fitView({ padding: 0.2, duration: 300 });
  }, []);

  const onAutoLayout = useCallback(() => {
    // Simple left-to-right layout based on categories
    const categoryOrder = ['databases', 'streaming', 'orchestration', 'processing', 'storage', 'monitoring'];
    const grouped: Record<string, Node[]> = {};
    nodes.forEach((n) => {
      const cat = (n.type === 'architectureNode' ? String(n.data.category || 'default') : 'default');
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(n);
    });

    pushHistory();
    const newNodes = nodes.map((n) => {
      const cat = (n.type === 'architectureNode' ? String(n.data.category || 'default') : 'default');
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

  const [showExport, setShowExport] = useState(false);
  const architectureName = 'E-Commerce Data Platform';

  const onExport = useCallback(() => {
    setShowExport(true);
  }, []);

  const onSave = useCallback(() => {
    pushHistory();
    addNotification({ type: 'success', message: 'Architecture saved!' });
  }, [pushHistory, addNotification]);

  // ── AI Generation ────────────────────────────────────────────────

  /**
   * Convert backend ArchitectureResult into ReactFlow nodes + edges,
   * arranging them in a left-to-right flow based on their position in the array.
   */
  const mapResultToGraph = useCallback((result: ArchitectureResult) => {
    const GAP_X = 260;
    const START_X = 60;
    const START_Y = 120;
    const VERTICAL_OFFSET = 160;

    const nodes: Node<ArchitectureNodeData>[] = result.components.map((comp, i) => {
      // Arrange in a left-to-right pipeline; stagger vertically for variety
      const col = i;
      const row = i % 2 === 0 ? 0 : 1;
      return {
        id: comp.id || `gen-${i}`,
        type: 'architectureNode',
        position: {
          x: START_X + col * GAP_X,
          y: START_Y + row * VERTICAL_OFFSET,
        },
        data: {
          label: comp.name,
          category: comp.category || comp.type || 'processing',
          service: comp.service || comp.name,
          icon: comp.icon || '\U0001f4e6',
          status: (comp.status as ArchitectureNodeData['status']) || 'healthy',
          metrics: comp.metrics || {},
        },
      };
    });

    const edges: Edge[] = result.connections.map((conn, i) => ({
      id: conn.id || `edge-${i}`,
      source: conn.source || conn.from_id || '',
      target: conn.target || conn.to_id || '',
      type: 'animatedEdge',
      data: {
        edgeType: conn.edgeType || 'dataflow',
        label: conn.label || '',
        animated: true,
      },
    }));

    return { nodes, edges };
  }, []);

  const handleAIGenerate = useCallback(
    async (prompt: string) => {
      setIsGenerating(true);
      setGenerationSteps([]);
      setShowAIPanel(false);

      // Show animated steps while waiting for the backend
      AI_GENERATION_STEPS.forEach((step, i) => {
        setTimeout(() => {
          setGenerationSteps((prev) => [...prev, step]);
        }, (i + 1) * 600);
      });

      try {
        const result = await architectureApi.generate(prompt, 'aws');
        const { nodes: newNodes, edges: newEdges } = mapResultToGraph(result);

        pushHistory();
        setNodes(newNodes);
        setEdges(newEdges);

        addNotification({
          type: 'success',
          message: `${result.title || 'Architecture'} generated! ${newNodes.length} components, ${newEdges.length} connections`,
        });

        setTimeout(() => reactFlowRef.current?.fitView({ padding: 0.2, duration: 500 }), 100);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Generation failed';
        addNotification({ type: 'error', message: `AI generation failed: ${msg}` });
      } finally {
        setIsGenerating(false);
        setGenerationSteps([]);
      }
    },
    [mapResultToGraph, setNodes, setEdges, pushHistory, addNotification]
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
    <div className="flex flex-col h-[calc(100vh-8rem)] -mt-4 -mx-4 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-8 max-w-full">
      {/* ── Top Bar ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1F2937] bg-[#0E131D] shrink-0 gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-cyan-500 shrink-0">
            <Layers size={14} className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-[var(--color-text)] truncate">Architecture Studio</h1>
            <p className="text-[10px] text-[var(--color-text-muted)] truncate">E-Commerce Data Platform</p>
          </div>
          <div className="hidden lg:flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
              v1.0
            </span>
            <span className="text-[10px] text-[var(--color-text-muted)] whitespace-nowrap">
              {stats.nodeCount} nodes · {stats.edgeCount} edges
            </span>
            {isLive && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                LIVE
              </span>
            )}
            {liveError && isLive && (
              <span className="text-[10px] text-amber-400" title={liveError}>
                ⚠
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap justify-end min-w-0">
          {/* Status indicators */}
          <div className="hidden lg:flex items-center gap-1.5 mr-1">
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
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600/20 to-cyan-600/20 border border-purple-500/20 px-2.5 py-1.5 text-xs font-medium text-purple-300 hover:from-purple-600/30 hover:to-cyan-600/30 transition whitespace-nowrap"
          >
            <Sparkles size={12} />
            <span className="hidden sm:inline">Generate with AI</span>
            <span className="sm:hidden">AI</span>
          </button>
          <button
            onClick={() => setShowCopilot(!showCopilot)}
            className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium transition ${
              showCopilot
                ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
                : 'border-[#1F2937] text-[var(--color-text-muted)] hover:bg-white/5'
            }`}
          >
            <Bot size={12} />
            <span className="hidden md:inline">Copilot</span>
          </button>
          {/* Live mode toggle */}
          <button
            onClick={toggleLive}
            className={`hidden sm:flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium transition ${
              isLive
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-[#1F2937] text-[var(--color-text-muted)] hover:bg-white/5'
            }`}
          >
            <Activity size={12} className={isLive ? 'animate-pulse' : ''} />
            {isLive ? 'Live' : 'Static'}
            {isLive && lastUpdate && (
              <span className="text-[9px] opacity-60">
                {Math.round((Date.now() - lastUpdate) / 1000)}s ago
              </span>
            )}
          </button>
          <button className="hidden md:flex items-center gap-1.5 rounded-lg border border-[#1F2937] px-2 py-1.5 text-xs text-[var(--color-text-muted)] hover:bg-white/5 transition">
            <History size={12} />
            <span className="hidden lg:inline">History</span>
          </button>
          <button
            onClick={onSave}
            className="flex items-center gap-1.5 rounded-lg border border-[#1F2937] px-2 py-1.5 text-xs text-[var(--color-text-muted)] hover:bg-white/5 transition"
          >
            <Save size={12} />
            <span className="hidden md:inline">Save</span>
          </button>
          <button className="hidden md:flex items-center gap-1.5 rounded-lg border border-[#1F2937] px-2 py-1.5 text-xs text-[var(--color-text-muted)] hover:bg-white/5 transition">
            <Share2 size={12} />
          </button>
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-purple-500 transition"
          >
            <Download size={12} />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* ── Main Content (3-panel layout) ──────────────────────── */}
      <div className="flex flex-1 min-h-0 relative overflow-hidden">
        {/* Asset Library (left) */}
        <AnimatePresence mode="wait">
          {showAssetLibrary && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: typeof window !== 'undefined' && window.innerWidth < 640 ? 200 : 240, opacity: 1 }}
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
              className="!rounded-xl !border !border-[#1F2937] !bg-[#111827] !shadow-lg max-sm:!hidden"
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

        {/* AI Copilot Panel (outside canvas to avoid ReactFlow event capture) */}
        <AICopilotPanel
          isOpen={showCopilot}
          onClose={() => setShowCopilot(false)}
          onAction={handleCopilotAction}
          architectureContext={
            {
              nodes: nodes
                .filter((n): n is Node<ArchitectureNodeData> => n.type === 'architectureNode')
                .map((n) => ({
                  id: n.id,
                  label: n.data.label,
                  category: String(n.data.category || ''),
                  service: String(n.data.service || ''),
                  status: String(n.data.status || 'unknown'),
                  metrics: n.data.metrics,
                })),
              edges: edges.map((e) => ({
                source: e.source,
                target: e.target,
                label: e.data?.label,
                edgeType: e.data?.edgeType,
              })),
              architectureName: 'E-Commerce Data Platform',
            }
          }
        />

        {/* Properties Panel (right) */}
        <AnimatePresence mode="wait">
          {showProperties && selectedNode && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: typeof window !== 'undefined' && window.innerWidth < 640 ? 260 : 288, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0 overflow-hidden max-sm:absolute max-sm:right-0 max-sm:top-0 max-sm:bottom-0 max-sm:z-40 max-sm:bg-[#0E131D] max-sm:border-l max-sm:border-[#1F2937] max-sm:shadow-2xl"
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

      {/* Export Modal */}
      <ExportModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        reactFlowWrapper={canvasRef}
        nodes={nodes}
        edges={edges}
        architectureName={architectureName}
      />
    </div>
  );
}
