import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useThemeStore, ThemeMode } from '@/store/themeStore';
import { Dropdown } from './Dropdown';
import { cn } from '@/lib/utils';

const MODE_META: Record<ThemeMode, { label: string; icon: React.ReactNode; hint: string }> = {
  light: { label: 'Light', icon: <Sun className="w-3.5 h-3.5" />, hint: 'Bright surfaces' },
  dark: { label: 'Dark', icon: <Moon className="w-3.5 h-3.5" />, hint: 'Dimmed, low-glare' },
  system: { label: 'System', icon: <Monitor className="w-3.5 h-3.5" />, hint: 'Match your OS setting' },
};

/** Tri-state theme switcher (light / dark / system) for the topbar. */
export const ThemeToggle: React.FC<{ className?: string }> = ({ className }) => {
  const { mode, setMode } = useThemeStore();
  const current = MODE_META[mode];

  return (
    <Dropdown
      className={className}
      trigger={
        <button
          aria-label={`Theme: ${current.label}. Click to change`}
          title={`Theme: ${current.label}`}
          className="p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors border border-transparent hover:border-border"
        >
          <span className="block transition-transform duration-200 hover:rotate-12">{current.icon}</span>
        </button>
      }
      items={(Object.keys(MODE_META) as ThemeMode[]).map((m) => ({
        id: m,
        label: MODE_META[m].label,
        icon: MODE_META[m].icon,
        onClick: () => setMode(m),
      }))}
    />
  );
};

/** Compact inline variant for the landing page / auth popup footer. */
export const ThemeToggleInline: React.FC<{ className?: string }> = ({ className }) => {
  const { mode, setMode } = useThemeStore();
  return (
    <div className={cn('flex items-center gap-0.5 p-0.5 rounded-lg bg-card-active/60 border border-border', className)}>
      {(Object.keys(MODE_META) as ThemeMode[]).map((m) => (
        <button
          key={m}
          onClick={() => setMode(m)}
          aria-pressed={mode === m}
          title={`${MODE_META[m].label} — ${MODE_META[m].hint}`}
          className={cn(
            'p-1.5 rounded-md transition-all duration-200',
            mode === m
              ? 'bg-card text-text-primary shadow-card-glow scale-100'
              : 'text-text-muted hover:text-text-primary hover:bg-card-hover'
          )}
        >
          {MODE_META[m].icon}
        </button>
      ))}
    </div>
  );
};
