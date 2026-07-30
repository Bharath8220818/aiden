import { useEffect, useCallback, useMemo } from 'react';
import { useShortcutStore } from '../store/shortcutStore';

// ─── Re-export types so consumers get everything from one file ──────

export type { ShortcutBinding } from '../store/shortcutStore';

export interface ShortcutDef {
  key: string;
  ctrlOrMeta?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: () => void;
  label?: string;
  description?: string;
}

// ─── Multi‑source hook ─────────────────────────────────────────────

interface UseKeyboardShortcutsOptions {
  /** A registry scope key (e.g. 'pipeline-designer'). Bindings are looked up from shortcutStore. */
  scopeKey?: string;
  /** Handlers keyed by shortcut id (e.g. { 'common.delete': handleDelete, 'pipeline-designer.save': handleSave }) */
  handlers?: Record<string, () => void>;
  /** Inline shortcuts — used when scopeKey is not provided, or merged on top of scope bindings */
  inline?: ShortcutDef[];
  /** Optional DOM scope ref */
  scopeRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Register keyboard shortcuts from either the shared registry, inline definitions, or both.
 *
 * Usage:
 *   // From registry + handlers
 *   useKeyboardShortcuts({ scopeKey: 'pipeline-designer', handlers: { 'common.delete': handleDelete } });
 *
 *   // Inline only (legacy)
 *   useKeyboardShortcuts({ inline: [{ key: '?', shift: true, handler: () => {} }] });
 */
export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions) {
  const { scopeKey, handlers, inline, scopeRef } = options;
  const registry = useShortcutStore((s) => s.registry);

  // Merge registry bindings + inline shortcuts into a single handler array
  const shortcuts: ShortcutDef[] = useMemo(() => {
    const result: ShortcutDef[] = [];

    // 1. Registry-based bindings
    if (scopeKey && registry) {
      const bindings = Object.values(registry).filter(
        (b) => b.scope === scopeKey || b.scope === 'common'
      );
      for (const b of bindings) {
        const handler = handlers?.[b.id];
        if (handler) {
          result.push({
            key: b.key,
            ctrlOrMeta: b.ctrlOrMeta,
            shift: b.shift,
            alt: b.alt,
            handler,
            label: b.label,
            description: b.description,
          });
        }
      }
    }

    // 2. Inline shortcuts (always included)
    if (inline) {
      result.push(...inline);
    }

    return result;
  }, [scopeKey, registry, handlers, inline]);

  const handler = useCallback(
    (e: Event) => {
      const ke = e as KeyboardEvent;
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

      for (const s of shortcuts) {
        const keyMatch = ke.key.toLowerCase() === s.key.toLowerCase();
        if (!keyMatch) continue;

        const ctrlOrMeta = s.ctrlOrMeta
          ? isMac ? ke.metaKey : ke.ctrlKey
          : true;

        const shiftMatch = s.shift ? ke.shiftKey : !ke.shiftKey;
        const altMatch = s.alt ? ke.altKey : !ke.altKey;

        if (ctrlOrMeta && shiftMatch && altMatch) {
          ke.preventDefault();
          ke.stopPropagation();
          s.handler();
          break;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    const el = scopeRef?.current ?? document;
    el.addEventListener('keydown', handler);
    return () => el.removeEventListener('keydown', handler);
  }, [handler, scopeRef]);
}

// ─── Convenience: scope‑only hook (no inline) ──────────────────────

export function useRegistryShortcuts(
  scopeKey: string,
  handlers: Record<string, () => void>,
  scopeRef?: React.RefObject<HTMLElement | null>
) {
  useKeyboardShortcuts({ scopeKey, handlers, scopeRef });
}

// ─── Legacy hook (backward compatible) ─────────────────────────────

export function useLegacyKeyboardShortcuts(
  shortcuts: ShortcutDef[],
  scopeRef?: React.RefObject<HTMLElement | null>
) {
  useKeyboardShortcuts({ inline: shortcuts, scopeRef });
}

/**
 * Build a human-readable label for a ShortcutDef suitable for the help modal.
 */
export function formatShortcut(s: { key: string; ctrlOrMeta?: boolean; shift?: boolean; alt?: boolean }): string {
  const parts: string[] = [];
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  if (s.ctrlOrMeta) parts.push(isMac ? '⌘' : 'Ctrl');
  if (s.shift) parts.push('⇧');
  if (s.alt) parts.push('⌥');

  const keyMap: Record<string, string> = {
    escape: 'Esc',
    ' ': 'Space',
    '=': '=',
    '-': '-',
    '0': '0',
    delete: 'Del',
    backspace: '⌫',
    enter: '⏎',
    tab: '⇥',
  };
  parts.push(keyMap[s.key.toLowerCase()] ?? s.key.toUpperCase());

  return parts.join(' + ');
}
