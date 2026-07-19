import { create } from 'zustand';

export interface Agent {
  name: string;
  description: string;
  status: 'idle' | 'running' | 'success' | 'error';
  progress?: number;
  log?: string;
}

export interface ActivityEntry {
  time: string;
  agent: string;
  message: string;
}

interface AgentState {
  agents: Agent[];
  activityLog: ActivityEntry[];
  isPipelineRunning: boolean;
  lastSync: string | null;

  addActivity: (agent: string, message: string) => void;
  updateAgentStatus: (name: string, status: Agent['status'], progress?: number) => void;
  updateAgentLog: (name: string, log: string) => void;
  setPipelineRunning: (running: boolean) => void;
  resetAgents: () => void;
}

const DEFAULT_AGENTS: Agent[] = [
  { name: 'Intent Parser', description: 'Understanding your request', status: 'idle' },
  { name: 'Extraction Agent', description: 'Connecting to data sources', status: 'idle' },
  { name: 'Analysis Agent', description: 'Profiling data quality', status: 'idle' },
  { name: 'Pipeline Builder', description: 'Generating pipeline code', status: 'idle' },
];

export const useAgentStore = create<AgentState>((set) => ({
  agents: DEFAULT_AGENTS,
  activityLog: [],
  isPipelineRunning: false,
  lastSync: null,

  addActivity: (agent, message) =>
    set((state) => ({
      activityLog: [
        { time: new Date().toLocaleTimeString('en-US', { hour12: false }), agent, message },
        ...state.activityLog,
      ].slice(0, 100),
      lastSync: new Date().toLocaleTimeString('en-US', { hour12: false }),
    })),

  updateAgentStatus: (name, status, progress) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.name === name ? { ...a, status, ...(progress !== undefined ? { progress } : {}) } : a
      ),
    })),

  updateAgentLog: (name, log) =>
    set((state) => ({
      agents: state.agents.map((a) => (a.name === name ? { ...a, log } : a)),
    })),

  setPipelineRunning: (running) =>
    set({ isPipelineRunning: running }),

  resetAgents: () =>
    set({
      agents: DEFAULT_AGENTS.map((a) => ({ ...a })),
      activityLog: [],
      isPipelineRunning: false,
    }),
}));
