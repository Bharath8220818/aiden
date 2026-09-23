import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Connection,
  EdgeChange,
  NodeChange,
} from 'reactflow';
import {
  ArchitectureFlowNode,
  ArchitectureFlowEdge,
  ArchitectureNodeKind,
  ArchitectureValidationReport,
  ArchitectureTemplate,
} from '../types';
import {
  autoLayout as runAutoLayout,
  createNodeFromPalette,
  exportBlueprintJson,
  exportBlueprintYaml,
  fetchBlueprint,
  generateBlueprint,
  publishGraphToPipelineBuilder,
  validateArchitecture,
} from '../services/architecture.service';

const DEFAULT_BLUEPRINT_NAME = 'Orders CDC Blueprint';

export function useArchitecture() {
  const [blueprintName, setBlueprintName] = useState(DEFAULT_BLUEPRINT_NAME);
  const [nodes, setNodes] = useState<ArchitectureFlowNode[]>([]);
  const [edges, setEdges] = useState<ArchitectureFlowEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [validation, setValidation] = useState<ArchitectureValidationReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationRationale, setGenerationRationale] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  /* ---------------- initial load via TanStack Query ---------------- */
  const blueprintQuery = useQuery({
    queryKey: ['architecture-blueprint'],
    queryFn: fetchBlueprint,
    staleTime: Infinity,
  });

  // Hydrate canvas once, when query data first arrives. `hydrationKey` tracks
  // whether we already seeded local canvas state from the server blueprint.
  const [hydrationKey, setHydrationKey] = useState<string | null>(null);
  const blueprintData = blueprintQuery.data;
  if (blueprintData && hydrationKey !== 'blueprint' && nodes.length === 0) {
    setNodes(blueprintData.nodes);
    setEdges(blueprintData.edges);
    setValidation(validateArchitecture(blueprintData.nodes, blueprintData.edges));
    setHydrationKey('blueprint');
  }
  void blueprintQuery.data;

  /* ---------------- selection ---------------- */
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;

  const selectNode = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  }, []);

  /* ---------------- canvas change handlers ---------------- */
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((current) => applyNodeChanges(changes, current));
      setHasUnsavedChanges(true);
    },
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((current) => applyEdgeChanges(changes, current));
      setHasUnsavedChanges(true);
    },
    []
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((current) =>
        addEdge(
          {
            ...connection,
            animated: true,
            style: { stroke: '#6366F1' },
          },
          current
        )
      );
      setHasUnsavedChanges(true);
    },
    []
  );

  /* ---------------- palette / node operations ---------------- */
  const addNode = useCallback(
    (kind: ArchitectureNodeKind) => {
      setNodes((current) => {
        const index = current.length + 1;
        const position = {
          x: 120 + Math.round(Math.random() * 400),
          y: 120 + Math.round(Math.random() * 260),
        };
        const newNode = createNodeFromPalette(kind, position, index);
        return [...current, newNode];
      });
      setHasUnsavedChanges(true);
    },
    []
  );

  const updateNodeData = useCallback((nodeId: string, patch: Partial<ArchitectureFlowNode['data']>) => {
    setNodes((current) =>
      current.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...patch } } : node
      )
    );
    setHasUnsavedChanges(true);
  }, []);

  const deleteSelectedNode = useCallback(() => {
    setSelectedNodeId((currentId) => {
      if (currentId) {
        setNodes((current) => current.filter((n) => n.id !== currentId));
        setEdges((current) => current.filter((e) => e.source !== currentId && e.target !== currentId));
        setHasUnsavedChanges(true);
      }
      return null;
    });
  }, []);

  /* ---------------- canvas-level actions ---------------- */
  const applyAutoLayout = useCallback(() => {
    setNodes((current) => runAutoLayout(current, edges));
    setHasUnsavedChanges(true);
  }, [edges]);

  const runValidation = useCallback(() => {
    const report = validateArchitecture(nodes, edges);
    setValidation(report);
    return report;
  }, [nodes, edges]);

  const generateWithAI = useCallback(async (prompt: string) => {
    setIsGenerating(true);
    try {
      const result = await generateBlueprint({ prompt });
      setNodes(result.nodes);
      setEdges(result.edges);
      setGenerationRationale(result.rationale);
      setSelectedNodeId(null);
      const report = validateArchitecture(result.nodes, result.edges);
      setValidation(report);
      setHasUnsavedChanges(false);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const loadTemplate = useCallback((template: ArchitectureTemplate) => {
    setNodes(template.nodes.map((n) => ({ ...n, data: { ...n.data } })));
    setEdges(template.edges.map((e) => ({ ...e })));
    setBlueprintName(template.name);
    setSelectedNodeId(null);
    const report = validateArchitecture(template.nodes, template.edges);
    setValidation(report);
    setHasUnsavedChanges(false);
  }, []);

  const resetCanvas = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
    setValidation(null);
    setGenerationRationale(null);
    setHasUnsavedChanges(true);
  }, []);

  /* ---------------- export & handoff ---------------- */
  const exportJson = useCallback(() => exportBlueprintJson(blueprintName, nodes, edges), [blueprintName, nodes, edges]);
  const exportYaml = useCallback(() => exportBlueprintYaml(blueprintName, nodes, edges), [blueprintName, nodes, edges]);

  const publishToPipelineBuilder = useCallback(() => {
    publishGraphToPipelineBuilder(blueprintName, nodes, edges);
    return validateArchitecture(nodes, edges);
  }, [blueprintName, nodes, edges]);

  const stats = {
    nodes: nodes.length,
    edges: edges.length,
    sources: nodes.filter((n) => n.data?.kind === 'source').length,
    sinks: nodes.filter((n) => n.data?.kind === 'sink').length,
  };

  return {
    // state
    blueprintName,
    setBlueprintName,
    nodes,
    edges,
    selectedNode,
    selectedNodeId,
    validation,
    isGenerating,
    generationRationale,
    hasUnsavedChanges,
    stats,
    isLoading: blueprintQuery.isLoading,
    // selection
    selectNode,
    // canvas handlers
    onNodesChange,
    onEdgesChange,
    onConnect,
    // node operations
    addNode,
    updateNodeData,
    deleteSelectedNode,
    // canvas actions
    applyAutoLayout,
    runValidation,
    generateWithAI,
    loadTemplate,
    resetCanvas,
    exportJson,
    exportYaml,
    publishToPipelineBuilder,
  };
}
