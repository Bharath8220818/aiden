import { api } from './index';
import type { ArchitectureModel } from '../types/architecture';

export const architectureApi = {
  generate: (prompt: string) =>
    api.post<ArchitectureModel>('/api/v1/architecture/generate', { prompt }).then(r => r.data),

  optimize: (architecture: Partial<ArchitectureModel>) =>
    api.post<ArchitectureModel>('/api/v1/architecture/optimize', architecture).then(r => r.data),

  exportTerraform: (architecture: Partial<ArchitectureModel>) =>
    api.post<{ terraform: string }>('/api/v1/architecture/export-terraform', architecture).then(r => r.data),

  exportPng: (architecture: Partial<ArchitectureModel>) =>
    api.post<{ image: string }>('/api/v1/architecture/export-png', architecture).then(r => r.data),

  save: (architecture: Partial<ArchitectureModel>) =>
    api.post<ArchitectureModel>('/api/v1/architecture', architecture).then(r => r.data),

  list: () =>
    api.get<ArchitectureModel[]>('/api/v1/architecture').then(r => r.data),
};
