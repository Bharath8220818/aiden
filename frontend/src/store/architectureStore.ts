import { create } from 'zustand';
import type { ArchitectureComponent, Connection, DesignPrinciple } from '../types/architecture';

interface ArchitectureState {
  components: ArchitectureComponent[];
  connections: Connection[];
  principles: DesignPrinciple[];
  selectedComponentId: string | null;
  addComponent: (component: ArchitectureComponent) => void;
  updateComponent: (id: string, updates: Partial<ArchitectureComponent>) => void;
  removeComponent: (id: string) => void;
  addConnection: (conn: Connection) => void;
  removeConnection: (id: string) => void;
  selectComponent: (id: string | null) => void;
  togglePrinciple: (id: string) => void;
  clear: () => void;
  setComponents: (components: ArchitectureComponent[]) => void;
  setConnections: (connections: Connection[]) => void;
}

export const useArchitectureStore = create<ArchitectureState>((set) => ({
  components: [],
  connections: [],
  principles: [],
  selectedComponentId: null,

  addComponent: (component) => set((s) => ({ components: [...s.components, component] })),
  updateComponent: (id, updates) =>
    set((s) => ({
      components: s.components.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })),
  removeComponent: (id) =>
    set((s) => ({
      components: s.components.filter((c) => c.id !== id),
      connections: s.connections.filter((c) => c.from !== id && c.to !== id),
    })),
  addConnection: (conn) => set((s) => ({ connections: [...s.connections, conn] })),
  removeConnection: (id) =>
    set((s) => ({ connections: s.connections.filter((c) => c.id !== id) })),
  selectComponent: (id) => set({ selectedComponentId: id }),
  togglePrinciple: (id) =>
    set((s) => ({
      principles: s.principles.map((p) =>
        p.id === id ? { ...p, active: !p.active } : p
      ),
    })),
  clear: () =>
    set({ components: [], connections: [], selectedComponentId: null }),
  setComponents: (components) => set({ components }),
  setConnections: (connections) => set({ connections }),
}));
