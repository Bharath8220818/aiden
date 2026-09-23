import { create } from 'zustand';
import { ArchitectureNodeKind } from '@/features/architecture/types';

export interface HandoffNodeSummary {
  id: string;
  label: string;
  kind: ArchitectureNodeKind;
  technology: string;
}

export interface HandoffGraph {
  name: string;
  nodeCount: number;
  edgeCount: number;
  sources: string[];
  sinks: string[];
  pattern: string;
  nodes: HandoffNodeSummary[];
  validationPassed: boolean;
  publishedAt: string;
}

interface HandoffState {
  architectureGraph: HandoffGraph | null;
  publishGraph: (graph: HandoffGraph) => void;
  clearGraph: () => void;
}

export const useHandoffStore = create<HandoffState>((set) => ({
  architectureGraph: null,
  publishGraph: (graph) => set({ architectureGraph: graph }),
  clearGraph: () => set({ architectureGraph: null }),
}));
