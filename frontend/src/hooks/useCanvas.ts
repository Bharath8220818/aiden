import { useCallback } from 'react';
import {
  type ReactFlowJsonObject,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow';

interface UseCanvasOptions {
  nodes: Node[];
  edges: Edge[];
  setNodes: (nodes: Node[] | ((prev: Node[]) => Node[])) => void;
  setEdges: (edges: Edge[] | ((prev: Edge[]) => Edge[])) => void;
}

export function useCanvas({ nodes, edges, setNodes, setEdges }: UseCanvasOptions) {
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  const exportToJson = useCallback((): ReactFlowJsonObject | null => {
    if (!nodes.length) return null;
    return { nodes, edges, viewport: { x: 0, y: 0, zoom: 1 } };
  }, [nodes, edges]);

  const clearCanvas = useCallback(() => {
    setNodes([]);
    setEdges([]);
  }, [setNodes, setEdges]);

  return { onNodesChange, onEdgesChange, onConnect, exportToJson, clearCanvas };
}
