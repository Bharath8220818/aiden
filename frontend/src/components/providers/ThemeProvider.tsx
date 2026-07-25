import { useEffect, type ReactNode } from 'react';
import { type ThemeMode, useThemeStore } from '../../store/themeStore';

export type ResolvedTheme = 'light' | 'dark';

export const getSystemTheme = (): ResolvedTheme =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

export const resolveTheme = (theme: ThemeMode): ResolvedTheme =>
  theme === 'system' ? getSystemTheme() : theme;

export const applyTheme = (theme: ThemeMode) => {
  const resolvedTheme = resolveTheme(theme);
  const root = document.documentElement;

  root.classList.toggle('dark', resolvedTheme === 'dark');
  root.style.colorScheme = resolvedTheme;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    applyTheme(theme);

    if (theme !== 'system') return undefined;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mediaQuery.addEventListener('change', onChange);

    return () => mediaQuery.removeEventListener('change', onChange);
  }, [theme]);

  return <>{children}</>;
};
