import { useEffect, useMemo } from 'react';
import type { ShortcutBinding } from '../../store/shortcutStore';
import { useShortcutStore } from '../../store/shortcutStore';
import { formatShortcut } from '../../hooks/useKeyboardShortcuts';

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  scopes: string[];
}

interface ShortcutsTriggerProps {
  onClick: () => void;
}

export function ShortcutsTrigger({ onClick }: ShortcutsTriggerProps) {
  return (
    <button
      onClick={onClick}
      className="btn-icon btn-sm"
      title="Keyboard shortcuts"
    >
      <kbd className="text-[10px] font-mono font-bold">?</kbd>
    </button>
  );
}

export function ShortcutsHelpModal({ isOpen, onClose, scopes }: ShortcutsHelpModalProps) {
  const registry = useShortcutStore((s) => s.registry);

  const bindings = useMemo(() => {
    return Object.values(registry).filter(
      (b) => scopes.includes(b.scope) || b.scope === 'common'
    );
  }, [registry, scopes]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <kbd className="px-2 py-0.5 text-xs font-mono bg-[var(--color-surface-2)] rounded">Esc</kbd>
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-1">
          {bindings.map((b) => (
            <ShortcutRow key={b.id} binding={b} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ShortcutRow({ binding }: { binding: ShortcutBinding }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors">
      <div>
        <span className="text-sm font-medium text-[var(--color-text-primary)]">{binding.label}</span>
        {binding.description && (
          <p className="text-xs text-[var(--color-text-muted)]">{binding.description}</p>
        )}
      </div>
      <kbd className="px-2.5 py-1 text-xs font-mono bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded">
        {formatShortcut(binding)}
      </kbd>
    </div>
  );
}
