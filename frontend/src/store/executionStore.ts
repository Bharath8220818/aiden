import { create } from 'zustand';
import type { Execution } from '../api/executions';
import { executionsApi } from '../api/executions';

interface ExecutionState {
  executions: Record<number, Execution[]>;
  currentExecution: Execution | null;
  isLoading: boolean;
  fetchExecutions: (pipelineId: number) => Promise<void>;
  fetchExecution: (id: number) => Promise<void>;
  updateStatus: (executionId: number, status: Execution['status']) => void;
}

export const useExecutionStore = create<ExecutionState>((set, get) => ({
  executions: {},
  currentExecution: null,
  isLoading: false,

  fetchExecutions: async (pipelineId: number) => {
    set({ isLoading: true });
    try {
      const executions = await executionsApi.getPipelineExecutions(pipelineId);
      set((state) => ({
        executions: { ...state.executions, [pipelineId]: executions },
        isLoading: false,
      }));
    } catch {
      set({ isLoading: false });
    }
  },

  fetchExecution: async (id: number) => {
    set({ isLoading: true });
    try {
      const execution = await executionsApi.getExecution(id);
      set({ currentExecution: execution, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  updateStatus: (executionId: number, status: Execution['status']) => {
    const { executions, currentExecution } = get();
    const updated = { ...executions };
    for (const key of Object.keys(updated)) {
      const pipelineId = Number(key);
      updated[pipelineId] = updated[pipelineId].map((e) =>
        e.id === executionId ? { ...e, status } : e
      );
    }
    set({
      executions: updated,
      currentExecution:
        currentExecution?.id === executionId
          ? { ...currentExecution, status }
          : currentExecution,
    });
  },
}));
