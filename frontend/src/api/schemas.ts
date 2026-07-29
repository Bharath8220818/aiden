import { api } from './index';
import type { SchemaModel, DDLResult } from '../types/schema';

export const schemasApi = {
  generate: (prompt: string) =>
    api.post<SchemaModel>('/api/v1/schemas/generate', { prompt }).then(r => r.data),

  validate: (schema: Partial<SchemaModel>) =>
    api.post<{ valid: boolean; errors: string[]; warnings: string[] }>('/api/v1/schemas/validate', schema).then(r => r.data),

  generateDDL: (schema: Partial<SchemaModel>) =>
    api.post<DDLResult>('/api/v1/schemas/ddl', schema).then(r => r.data),

  normalize: (schema: Partial<SchemaModel>) =>
    api.post<SchemaModel>('/api/v1/schemas/normalize', schema).then(r => r.data),

  save: (schema: Partial<SchemaModel>) =>
    api.post<SchemaModel>('/api/v1/schemas', schema).then(r => r.data),

  list: () =>
    api.get<SchemaModel[]>('/api/v1/schemas').then(r => r.data),
};
