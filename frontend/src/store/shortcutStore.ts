import { create } from 'zustand';

export interface ShortcutBinding {
  id: string;
  key: string;
  ctrlOrMeta?: boolean;
  shift?: boolean;
  alt?: boolean;
  scope: string;
  label: string;
  description?: string;
}

export interface ShortcutDefWithHandler extends ShortcutBinding {
  handler: () => void;
}

interface ShortcutState {
  registry: Record<string, ShortcutBinding>;
}

export const useShortcutStore = create<ShortcutState>(() => ({
  registry: {
    'common.help': {
      id: 'common.help',
      key: '?',
      shift: true,
      scope: 'common',
      label: 'Keyboard Shortcuts',
      description: 'Show keyboard shortcuts help',
    },
    'common.delete': {
      id: 'common.delete',
      key: 'Delete',
      scope: 'common',
      label: 'Delete',
      description: 'Delete selected item',
    },
    'common.escape': {
      id: 'common.escape',
      key: 'Escape',
      scope: 'common',
      label: 'Close',
      description: 'Close modal or cancel',
    },
    'common.save': {
      id: 'common.save',
      key: 's',
      ctrlOrMeta: true,
      scope: 'common',
      label: 'Save',
      description: 'Save current changes',
    },
    'pipeline-designer.save': {
      id: 'pipeline-designer.save',
      key: 's',
      ctrlOrMeta: true,
      scope: 'pipeline-designer',
      label: 'Save Pipeline',
      description: 'Save the pipeline',
    },
    'pipeline-designer.run': {
      id: 'pipeline-designer.run',
      key: 'Enter',
      ctrlOrMeta: true,
      scope: 'pipeline-designer',
      label: 'Run Pipeline',
      description: 'Execute the pipeline',
    },
    'architecture-canvas.export': {
      id: 'architecture-canvas.export',
      key: 'e',
      ctrlOrMeta: true,
      scope: 'architecture-canvas',
      label: 'Export PNG',
      description: 'Export canvas as PNG',
    },
    'schema-designer.save': {
      id: 'schema-designer.save',
      key: 's',
      ctrlOrMeta: true,
      scope: 'schema-designer',
      label: 'Save Schema',
      description: 'Save the schema',
    },
    'schema-designer.generate': {
      id: 'schema-designer.generate',
      key: 'g',
      ctrlOrMeta: true,
      scope: 'schema-designer',
      label: 'Generate DDL',
      description: 'Generate DDL from schema',
    },
  },
}));
