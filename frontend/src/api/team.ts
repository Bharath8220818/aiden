import { api } from './index';
import type { TeamMember, Comment, SharedPipeline, TeamActivity } from '../types/team';

export const teamApi = {
  listMembers: () =>
    api.get<TeamMember[]>('/api/v1/team/members').then(r => r.data),

  getMember: (id: number) =>
    api.get<TeamMember>(`/api/v1/team/members/${id}`).then(r => r.data),

  invite: (email: string, role: string) =>
    api.post('/api/v1/team/invite', { email, role }).then(r => r.data),

  sharePipeline: (pipelineId: number, memberIds: number[], permission: string) =>
    api.post<SharedPipeline>('/api/v1/team/share', { pipelineId, memberIds, permission }).then(r => r.data),

  getComments: (pipelineId: number) =>
    api.get<Comment[]>(`/api/v1/team/pipelines/${pipelineId}/comments`).then(r => r.data),

  addComment: (pipelineId: number, content: string) =>
    api.post<Comment>(`/api/v1/team/pipelines/${pipelineId}/comments`, { content }).then(r => r.data),

  getActivity: () =>
    api.get<TeamActivity[]>('/api/v1/team/activity').then(r => r.data),
};
