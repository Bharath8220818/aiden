import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'aiden-theme';

const readStoredTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'light';

  const value = window.localStorage.getItem(THEME_STORAGE_KEY);
  return value === 'dark' || value === 'system' || value === 'light' ? value : 'light';
};

const persistTheme = (theme: ThemeMode) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }
};

interface ThemeState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  setLight: () => void;
  setDark: () => void;
  setSystem: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: readStoredTheme(),
  setTheme: (theme) => {
    persistTheme(theme);
    set({ theme });
  },
  setLight: () => {
    persistTheme('light');
    set({ theme: 'light' });
  },
  setDark: () => {
    persistTheme('dark');
    set({ theme: 'dark' });
  },
  setSystem: () => {
    persistTheme('system');
    set({ theme: 'system' });
  },
}));

export { THEME_STORAGE_KEY };
