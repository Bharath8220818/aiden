import { api } from './index';
import type { LearningPath, Course, ProgressStats } from '../types/learning';

export const learningApi = {
  listPaths: () =>
    api.get<LearningPath[]>('/api/v1/learning/paths').then(r => r.data),

  getPath: (id: number) =>
    api.get<LearningPath>(`/api/v1/learning/paths/${id}`).then(r => r.data),

  getCourses: (pathId: number) =>
    api.get<Course[]>(`/api/v1/learning/paths/${pathId}/courses`).then(r => r.data),

  markComplete: (courseId: number) =>
    api.post(`/api/v1/learning/courses/${courseId}/complete`).then(r => r.data),

  getProgress: () =>
    api.get<ProgressStats>('/api/v1/learning/progress').then(r => r.data),
};
