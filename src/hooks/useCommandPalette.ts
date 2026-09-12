import { useEffect } from 'react';
import { useUIStore } from '@/store/uiStore';

export function useCommandPalette() {
  const { toggleCommandPalette, toggleAskAiden } = useUIStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K => Command Palette / Search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleCommandPalette();
      }
      // Cmd/Ctrl + Space or Cmd/Ctrl + Shift + A => Ask AIDEN
      if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === 'j' || (e.shiftKey && e.key.toLowerCase() === 'a'))) {
        e.preventDefault();
        toggleAskAiden();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleCommandPalette, toggleAskAiden]);
}
