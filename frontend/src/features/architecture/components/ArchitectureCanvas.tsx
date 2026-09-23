import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlowProvider,
  ConnectionLineType,
  Panel,
  Connection,
  NodeChange,
  EdgeChange,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { ArchitectureFlowNode, ArchitectureFlowEdge } from '../types';
import { ArchitectureNode } from './ArchitectureNode';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Network, Sparkles } from 'lucide-react';

export interface ArchitectureCanvasProps {
  nodes: ArchitectureFlowNode[];
  edges: ArchitectureFlowEdge[];
  selectedNodeId: string | null;
  isLoading?: boolean;
  isGenerating?: boolean;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  onSelectNode: (nodeId: string | null) => void;
  onOpenAIGenerate: () => void;
}

const nodeTypes = { architecture: ArchitectureNode };

const CanvasInner: React.FC<ArchitectureCanvasProps> = ({
  nodes,
  edges,
  selectedNodeId: _selectedNodeId,
  isLoading,
  isGenerating,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onSelectNode,
  onOpenAIGenerate,
}) => {

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: ArchitectureFlowNode) => {
      onSelectNode(node.id);
    },
    [onSelectNode]
  );

  const handlePaneClick = useCallback(() => {
    onSelectNode(null);
  }, [onSelectNode]);

  const minimapNodeColor = useMemo(() => {
    return (node: ArchitectureFlowNode) => {
      switch (node.data?.kind) {
        case 'source': return '#10B981';
        case 'ingestion': return '#06B6D4';
        case 'processing': return '#6366F1';
        case 'storage': return '#F59E0B';
        case 'quality': return '#8B5CF6';
        case 'sink': return '#3B82F6';
        case 'orchestration': return '#D946EF';
        default: return '#9CA3AF';
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="h-full w-full flex flex-col gap-3 p-6">
        <Skeleton className="h-8 w-56" />
        <div className="flex-1 grid grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        connectionLineType={ConnectionLineType.SmoothStep}
        defaultEdgeOptions={{ type: 'smoothstep', style: { stroke: '#6366F1', strokeWidth: 1.5 } }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={1.75}
        proOptions={{ hideAttribution: true }}
        className="bg-background"
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.4} color="#E5E7EB" />
        <Controls
          className={cn(
            '!bg-card !border !border-border !rounded-lg overflow-hidden',
            '[&>button]:!bg-card [&>button]:!border-b !border-border [&>button]:!fill-[#6B7280] [&>button:hover]:!bg-card-active'
          )}
        />
        <MiniMap
          pannable
          zoomable
          nodeColor={(node: ArchitectureFlowNode) => minimapNodeColor(node)}
          maskColor="rgba(243, 244, 246, 0.85)"
          className="!bg-card !border !border-border !rounded-lg"
          style={{ width: 160, height: 110 }}
        />
        {nodes.length === 0 && !isGenerating && (
          <Panel position="top-center">
            <EmptyState
              icon={<Network className="w-6 h-6" />}
              title="Canvas is empty"
              description="Drag components from the palette, load a template, or let the AIDEN Architect Agent generate a topology for you."
              actionLabel="Generate with AIDEN"
              onAction={onOpenAIGenerate}
            />
          </Panel>
        )}
        {isGenerating && (
          <Panel position="top-center">
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-card border border-indigo-500/40 shadow-ai-glow">
              <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
              <span className="text-xs font-medium text-text-primary">AIDEN Architect Agent is designing your topology…</span>
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
};

export const ArchitectureCanvas: React.FC<ArchitectureCanvasProps> = (props) => (
  <ReactFlowProvider>
    <CanvasInner {...props} />
  </ReactFlowProvider>
);
