import { create } from 'zustand';
import type { TeamMember, Comment, TeamActivity } from '../types/team';

interface TeamState {
  members: TeamMember[];
  comments: Record<number, Comment[]>;
  activities: TeamActivity[];
  isLoading: boolean;
  setMembers: (members: TeamMember[]) => void;
  setComments: (pipelineId: number, comments: Comment[]) => void;
  addComment: (pipelineId: number, comment: Comment) => void;
  setActivities: (activities: TeamActivity[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useTeamStore = create<TeamState>((set) => ({
  members: [],
  comments: {},
  activities: [],
  isLoading: false,

  setMembers: (members) => set({ members }),
  setComments: (pipelineId, comments) =>
    set((s) => ({ comments: { ...s.comments, [pipelineId]: comments } })),
  addComment: (pipelineId, comment) =>
    set((s) => ({
      comments: {
        ...s.comments,
        [pipelineId]: [...(s.comments[pipelineId] || []), comment],
      },
    })),
  setActivities: (activities) => set({ activities }),
  setLoading: (loading) => set({ isLoading: loading }),
}));
