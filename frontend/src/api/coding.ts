import { api } from './index';
import type { Problem, Submission, CodeExecution } from '../types/coding';

export const codingApi = {
  listProblems: (params?: { difficulty?: string; category?: string; company?: string }) =>
    api.get<Problem[]>('/api/v1/coding/problems', { params }).then(r => r.data),

  getProblem: (id: number) =>
    api.get<Problem>(`/api/v1/coding/problems/${id}`).then(r => r.data),

  submit: (problemId: number, code: string, language: string) =>
    api.post<Submission>('/api/v1/coding/submit', { problemId, code, language }).then(r => r.data),

  run: (problemId: number, code: string, language: string) =>
    api.post<CodeExecution>('/api/v1/coding/run', { problemId, code, language }).then(r => r.data),

  getSubmission: (id: number) =>
    api.get<Submission>(`/api/v1/coding/submissions/${id}`).then(r => r.data),
};
