import { useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';

const getSystemTheme = (): 'light' | 'dark' =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

const getStoredTheme = (): Theme => {
  const stored = localStorage.getItem('theme') as Theme | null;
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
};

const getEffectiveTheme = (theme: Theme): 'light' | 'dark' =>
  theme === 'system' ? getSystemTheme() : theme;

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme());
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>(() =>
    getEffectiveTheme(getStoredTheme())
  );

  // Apply theme to <html> element
  useEffect(() => {
    const html = document.documentElement;
    if (effectiveTheme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [effectiveTheme]);

  // Listen for system preference changes when in 'system' mode
  useEffect(() => {
    if (theme !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setEffectiveTheme(getSystemTheme());
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    setEffectiveTheme(getEffectiveTheme(newTheme));
  }, []);

  const toggleTheme = useCallback(() => {
    const next: Theme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(next);
  }, [theme, setTheme]);

  return { theme, effectiveTheme, setTheme, toggleTheme };
}
