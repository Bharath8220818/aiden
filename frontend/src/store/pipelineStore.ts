import { create } from 'zustand';
import { pipelineApi } from '../api/pipelines';
import type { Pipeline, PipelineExecution } from '../types/pipeline';

interface PipelineState {
  pipelines: Pipeline[];
  currentPipeline: Pipeline | null;
  executions: PipelineExecution[];
  isLoading: boolean;
  error: string | null;

  fetchPipelines: () => Promise<void>;
  fetchPipeline: (id: number) => Promise<void>;
  createFromPrompt: (prompt: string) => Promise<Pipeline>;
  createPipeline: (data: any) => Promise<Pipeline>;
  updatePipeline: (id: number, data: any) => Promise<Pipeline>;
  deletePipeline: (id: number) => Promise<void>;
  runPipeline: (id: number) => Promise<PipelineExecution>;
  fetchExecutions: (id: number) => Promise<void>;
  setCurrentPipeline: (pipeline: Pipeline | null) => void;
  clearError: () => void;
}

export const usePipelineStore = create<PipelineState>((set) => ({
  pipelines: [],
  currentPipeline: null,
  executions: [],
  isLoading: false,
  error: null,

  fetchPipelines: async () => {
    set({ isLoading: true, error: null });
    try {
      const pipelines = await pipelineApi.getAll();
      set({ pipelines });
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to fetch pipelines' });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchPipeline: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      const pipeline = await pipelineApi.getById(id);
      set({ currentPipeline: pipeline });
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to fetch pipeline' });
    } finally {
      set({ isLoading: false });
    }
  },

  createFromPrompt: async (prompt: string) => {
    set({ isLoading: true, error: null });
    try {
      const pipeline = await pipelineApi.createFromPrompt(prompt);
      set((state) => ({ 
        pipelines: [pipeline, ...state.pipelines],
        currentPipeline: pipeline 
      }));
      return pipeline;
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to create pipeline' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  createPipeline: async (data: any) => {
    set({ isLoading: true, error: null });
    try {
      const pipeline = await pipelineApi.create(data);
      set((state) => ({ pipelines: [pipeline, ...state.pipelines] }));
      return pipeline;
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to create pipeline' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updatePipeline: async (id: number, data: any) => {
    set({ isLoading: true, error: null });
    try {
      const pipeline = await pipelineApi.update(id, data);
      set((state) => ({
        pipelines: state.pipelines.map((p) => (p.id === id ? pipeline : p)),
        currentPipeline: state.currentPipeline?.id === id ? pipeline : state.currentPipeline,
      }));
      return pipeline;
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to update pipeline' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  deletePipeline: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      await pipelineApi.delete(id);
      set((state) => ({
        pipelines: state.pipelines.filter((p) => p.id !== id),
        currentPipeline: state.currentPipeline?.id === id ? null : state.currentPipeline,
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to delete pipeline' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  runPipeline: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      const execution = await pipelineApi.run(id);
      return execution;
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to run pipeline' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchExecutions: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      const executions = await pipelineApi.getExecutions(id);
      set({ executions });
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to fetch executions' });
    } finally {
      set({ isLoading: false });
    }
  },

  setCurrentPipeline: (pipeline: Pipeline | null) => {
    set({ currentPipeline: pipeline });
  },

  clearError: () => set({ error: null }),
}));