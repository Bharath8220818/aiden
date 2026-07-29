import { create } from 'zustand';
import type { Table, Relationship, SchemaModel } from '../types/schema';

interface SchemaState {
  currentSchema: SchemaModel | null;
  tables: Table[];
  relationships: Relationship[];
  selectedTableId: string | null;
  addTable: (table: Table) => void;
  updateTable: (id: string, updates: Partial<Table>) => void;
  removeTable: (id: string) => void;
  addRelationship: (rel: Relationship) => void;
  removeRelationship: (id: string) => void;
  selectTable: (id: string | null) => void;
  setCurrentSchema: (schema: SchemaModel | null) => void;
  clear: () => void;
}

export const useSchemaStore = create<SchemaState>((set) => ({
  currentSchema: null,
  tables: [],
  relationships: [],
  selectedTableId: null,

  addTable: (table) => set((s) => ({ tables: [...s.tables, table] })),
  updateTable: (id, updates) =>
    set((s) => ({
      tables: s.tables.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),
  removeTable: (id) =>
    set((s) => ({
      tables: s.tables.filter((t) => t.id !== id),
      relationships: s.relationships.filter(
        (r) => r.fromTable !== id && r.toTable !== id
      ),
    })),
  addRelationship: (rel) => set((s) => ({ relationships: [...s.relationships, rel] })),
  removeRelationship: (id) =>
    set((s) => ({
      relationships: s.relationships.filter((r) => r.id !== id),
    })),
  selectTable: (id) => set({ selectedTableId: id }),
  setCurrentSchema: (schema) => set({ currentSchema: schema }),
  clear: () => set({ tables: [], relationships: [], selectedTableId: null, currentSchema: null }),
}));
