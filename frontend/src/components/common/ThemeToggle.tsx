import React from 'react';
import { useTheme } from '../../hooks/useTheme';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className }) => {
  const { theme, toggleTheme } = useTheme();

  const getIcon = () => {
    if (theme === 'light') return '☀️';
    if (theme === 'dark') return '🌙';
    return '💻';
  };

  const getLabel = () => {
    if (theme === 'light') return 'Light mode';
    if (theme === 'dark') return 'Dark mode';
    return 'System preference';
  };

  return (
    <button
      onClick={toggleTheme}
      className={`
        flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 
        bg-white text-gray-500 shadow-sm transition-all duration-200 
        hover:bg-gray-50 hover:text-gray-700
        dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 
        dark:hover:bg-gray-700 dark:hover:text-gray-200
        focus:outline-none focus:ring-2 focus:ring-blue-500
        ${className || ''}
      `}
      aria-label={getLabel()}
      title={getLabel()}
    >
      <span className="text-base leading-none">{getIcon()}</span>
    </button>
  );
};

ThemeToggle.displayName = 'ThemeToggle';

export default ThemeToggle;
