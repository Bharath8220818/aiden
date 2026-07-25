import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Laptop, Moon, Sun } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

interface ThemeToggleProps {
  className?: string;
}

const options = [
  { value: 'light' as const, label: 'Light', Icon: Sun },
  { value: 'dark' as const, label: 'Dark', Icon: Moon },
  { value: 'system' as const, label: 'System', Icon: Laptop },
];

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className }) => {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const selected = options.find((option) => option.value === theme) ?? options[0];
  const SelectedIcon = selected.Icon;

  return (
    <div ref={menuRef} className={`relative ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2.5 text-gray-600 shadow-sm transition-colors duration-200 hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
        aria-label="Choose color theme"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <SelectedIcon size={16} aria-hidden="true" />
        <span className="hidden text-xs font-medium sm:inline">{selected.label}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Theme options"
          className="absolute right-0 z-50 mt-2 w-40 rounded-xl border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
        >
          {options.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              role="menuitemradio"
              aria-checked={theme === value}
              onClick={() => {
                setTheme(value);
                setIsOpen(false);
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                theme === value
                  ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <Icon size={16} aria-hidden="true" />
              <span className="flex-1">{label}</span>
              {theme === value && <Check size={15} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

ThemeToggle.displayName = 'ThemeToggle';

export default ThemeToggle;
