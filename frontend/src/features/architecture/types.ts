import { Node, Edge } from 'reactflow';

export type ArchitectureNodeKind =
  | 'source'
  | 'ingestion'
  | 'processing'
  | 'storage'
  | 'sink'
  | 'quality'
  | 'orchestration';

export type NodeStatus = 'healthy' | 'warning' | 'error' | 'idle';

export interface NodeTechMetadata {
  technology: string;
  /** Extra key metrics displayed inside the node card */
  metrics: { label: string; value: string }[];
  description: string;
}

export interface NodeContractSummary {
  contractId: string;
  version: string;
  /** Rows ingested per day at this hop */
  rowsPerDay: string;
  schemaFields: number;
}

export interface ArchitectureNodeData extends NodeTechMetadata {
  label: string;
  kind: ArchitectureNodeKind;
  status: NodeStatus;
  contract?: NodeContractSummary;
  [key: string]: unknown;
}

export type ArchitectureFlowNode = Node<ArchitectureNodeData>;
export type ArchitectureFlowEdge = Edge;

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ArchitectureValidationIssue {
  id: string;
  severity: ValidationSeverity;
  title: string;
  message: string;
  nodeId?: string;
}

export interface ArchitectureValidationReport {
  passed: boolean;
  checkedAt: string;
  issues: ArchitectureValidationIssue[];
  stats: {
    nodes: number;
    edges: number;
    sources: number;
    sinks: number;
    orphanNodes: number;
    cyclicConnections: number;
    contractCoverage: number; // percent of nodes with attached contract
  };
}

export interface ArchitectureTemplate {
  id: string;
  name: string;
  description: string;
  pattern: string;
  nodes: ArchitectureFlowNode[];
  edges: ArchitectureFlowEdge[];
}

export interface ArchitectureBlueprint {
  id: string;
  name: string;
  version: string;
  updatedAt: string;
  nodes: ArchitectureFlowNode[];
  edges: ArchitectureFlowEdge[];
  validation: ArchitectureValidationReport;
}
