/**
 * Theme store — light / dark / system with localStorage persistence.
 *
 * Applies `data-theme="light|dark"` to <html>; "system" resolves against
 * prefers-color-scheme and live-updates when the OS flips. Boot application
 * happens in main.tsx BEFORE first paint (no flash of wrong theme).
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  cycleMode: () => void;
}

const STORAGE_KEY = 'aiden-theme';

/** Resolve "system" against the OS preference. */
const resolve = (mode: ThemeMode): 'light' | 'dark' =>
  mode === 'system'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    : mode;

/** Apply the resolved theme to <html> (idempotent). */
export const applyTheme = (mode: ThemeMode): void => {
  const resolved = resolve(mode);
  document.documentElement.setAttribute('data-theme', resolved);
  document.documentElement.classList.toggle('dark', resolved === 'dark');
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'system',
      setMode: (mode) => {
        applyTheme(mode);
        set({ mode });
      },
      cycleMode: () => {
        const order: ThemeMode[] = ['light', 'dark', 'system'];
        const next = order[(order.indexOf(get().mode) + 1) % order.length];
        applyTheme(next);
        set({ mode: next });
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({ mode: state.mode }),
      // Re-apply on hydration (e.g. after reload).
      onRehydrateStorage: () => (state) => {
        applyTheme(state?.mode ?? 'system');
      },
    }
  )
);

/**
 * Boot-time theme application — call once before React renders
 * (in main.tsx) so the first paint already matches the stored/OS theme.
 */
export const initTheme = (): void => {
  let stored: ThemeMode = 'system';
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.state?.mode) stored = parsed.state.mode;
    }
  } catch {
    /* corrupted storage → default to system */
  }
  applyTheme(stored);

  // Live-follow OS changes while in "system" mode.
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (useThemeStore.getState().mode === 'system') applyTheme('system');
  });
};
