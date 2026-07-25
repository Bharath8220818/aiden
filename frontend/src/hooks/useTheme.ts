import { useCallback } from 'react';
import { resolveTheme } from '../components/providers/ThemeProvider';
import { useThemeStore } from '../store/themeStore';

export function useTheme() {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const effectiveTheme = resolveTheme(theme);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light');
  }, [setTheme, theme]);

  return { theme, effectiveTheme, setTheme, toggleTheme };
}
