import { create } from 'zustand';
import type { Problem, Submission } from '../types/coding';

interface CodingState {
  problems: Problem[];
  currentProblem: Problem | null;
  submissions: Submission[];
  currentSubmission: Submission | null;
  isLoading: boolean;
  setProblems: (problems: Problem[]) => void;
  setCurrentProblem: (problem: Problem | null) => void;
  addSubmission: (submission: Submission) => void;
  setCurrentSubmission: (submission: Submission | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useCodingStore = create<CodingState>((set) => ({
  problems: [],
  currentProblem: null,
  submissions: [],
  currentSubmission: null,
  isLoading: false,

  setProblems: (problems) => set({ problems }),
  setCurrentProblem: (problem) => set({ currentProblem: problem }),
  addSubmission: (submission) =>
    set((s) => ({ submissions: [...s.submissions, submission] })),
  setCurrentSubmission: (submission) => set({ currentSubmission: submission }),
  setLoading: (loading) => set({ isLoading: loading }),
}));
