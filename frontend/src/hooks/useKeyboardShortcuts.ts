import { useEffect } from 'react';

interface Shortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: () => void;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const matchKey = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const matchCtrl = shortcut.ctrl ? e.ctrlKey : !e.ctrlKey;
        const matchMeta = shortcut.meta ? e.metaKey : !e.metaKey;
        const matchShift = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const matchAlt = shortcut.alt ? e.altKey : !e.altKey;

        if (matchKey && matchCtrl && matchMeta && matchShift && matchAlt) {
          e.preventDefault();
          shortcut.handler();
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}
