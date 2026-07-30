import { create } from 'zustand';
import type { LearningPath, Course, ProgressStats } from '../types/learning';

interface LearningState {
  paths: LearningPath[];
  currentPath: LearningPath | null;
  currentCourse: Course | null;
  progress: ProgressStats | null;
  isLoading: boolean;
  setPaths: (paths: LearningPath[]) => void;
  setCurrentPath: (path: LearningPath | null) => void;
  setCurrentCourse: (course: Course | null) => void;
  setProgress: (stats: ProgressStats | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useLearningStore = create<LearningState>((set) => ({
  paths: [],
  currentPath: null,
  currentCourse: null,
  progress: null,
  isLoading: false,

  setPaths: (paths) => set({ paths }),
  setCurrentPath: (path) => set({ currentPath: path }),
  setCurrentCourse: (course) => set({ currentCourse: course }),
  setProgress: (stats) => set({ progress: stats }),
  setLoading: (loading) => set({ isLoading: loading }),
}));
