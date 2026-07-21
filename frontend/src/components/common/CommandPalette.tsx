import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';

interface CommandItem {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  action: () => void;
}

const defaultItems: CommandItem[] = [
  { id: 'create-pipeline', label: 'Create Pipeline', icon: '✨', shortcut: '⌘N', action: () => {} },
  { id: 'view-pipelines', label: 'View Pipelines', icon: '📊', action: () => {} },
  { id: 'open-builder', label: 'Open Pipeline Builder', icon: '🔧', action: () => {} },
  { id: 'monitoring', label: 'Open Monitoring', icon: '📈', action: () => {} },
  { id: 'ai-agents', label: 'AI Agents', icon: '🤖', action: () => {} },
  { id: 'settings', label: 'Settings', icon: '⚙️', action: () => {} },
  { id: 'templates', label: 'Pipeline Templates', icon: '📋', action: () => {} },
  { id: 'getting-started', label: 'Getting Started Guide', icon: '🚀', action: () => {} },
  { id: 'help', label: 'Help & Support', icon: '❓', action: () => {} },
  { id: 'changelog', label: "What's New (Changelog)", icon: '📝', action: () => {} },
];

const CommandPalette: React.FC = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // Initialize items with navigation actions
  const items: CommandItem[] = defaultItems.map((item) => {
    const navMap: Record<string, string> = {
      'create-pipeline': '/builder',
      'view-pipelines': '/pipelines',
      'open-builder': '/builder',
      'monitoring': '/monitoring',
      'ai-agents': '/agents',
      'settings': '/settings',
      'templates': '/templates',
      'getting-started': '/getting-started',
      'help': '/help',
      'changelog': '/changelog',
    };
    return {
      ...item,
      action: () => navigate(navMap[item.id] || '/'),
    };
  });

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = useCallback(
    (item: CommandItem) => {
      item.action();
      setOpen(false);
    },
    []
  );

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={() => setOpen(false)}
      />

      {/* Dialog */}
      <div className="fixed left-1/2 top-[15%] z-[101] w-full max-w-lg -translate-x-1/2 animate-scale-in">
        <Command
          label="Global Command Menu"
          className="overflow-hidden rounded-2xl border border-gray-200/50 bg-white shadow-2xl shadow-black/20 dark:border-gray-700/50 dark:bg-gray-900"
        >
          {/* Search Input */}
          <div className="flex items-center border-b border-gray-100 dark:border-gray-800">
            <svg
              className="ml-4 h-5 w-5 shrink-0 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <Command.Input
              placeholder="Search commands..."
              className="w-full bg-transparent px-3 py-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-gray-100 dark:placeholder:text-gray-500"
              autoFocus
            />
            <kbd className="mr-4 hidden rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[10px] font-medium text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500 sm:inline-block">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <Command.List className="max-h-72 overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-gray-400">
              <div className="text-2xl mb-2">🔍</div>
              No results found.
              <p className="mt-1 text-xs">Try a different search term</p>
            </Command.Empty>

            <Command.Group heading="Pages" className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 px-2 py-2">
              {items.map((item) => (
                <Command.Item
                  key={item.id}
                  value={item.label}
                  onSelect={() => runCommand(item)}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-sm text-gray-700 transition-colors aria-selected:bg-purple-50 aria-selected:text-purple-700 dark:text-gray-300 dark:aria-selected:bg-purple-950/30 dark:aria-selected:text-purple-300"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-xs dark:bg-gray-800">
                    {item.icon}
                  </span>
                  <span className="flex-1">{item.label}</span>
                  {item.shortcut && (
                    <kbd className="text-[10px] font-medium text-gray-400">{item.shortcut}</kbd>
                  )}
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Actions" className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 px-2 py-2">
              <Command.Item
                value="Toggle Dark Mode"
                onSelect={() => {
                  document.documentElement.classList.toggle('dark');
                  setOpen(false);
                }}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-sm text-gray-700 transition-colors aria-selected:bg-purple-50 aria-selected:text-purple-700 dark:text-gray-300 dark:aria-selected:bg-purple-950/30 dark:aria-selected:text-purple-300"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-xs dark:bg-gray-800">🌙</span>
                <span className="flex-1">Toggle Dark Mode</span>
              </Command.Item>
              <Command.Item
                value="Logout"
                onSelect={() => {
                  localStorage.removeItem('auth_token');
                  window.location.href = '/login';
                }}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-sm text-red-600 transition-colors aria-selected:bg-red-50 dark:text-red-400 dark:aria-selected:bg-red-950/30"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-xs dark:bg-red-950/50">🚪</span>
                <span className="flex-1">Logout</span>
              </Command.Item>
            </Command.Group>
          </Command.List>

          {/* Footer */}
          <div className="flex items-center gap-4 border-t border-gray-100 px-4 py-2.5 text-[10px] text-gray-400 dark:border-gray-800">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[9px] dark:border-gray-700 dark:bg-gray-800">↑↓</kbd>
              {' '}Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[9px] dark:border-gray-700 dark:bg-gray-800">↵</kbd>
              {' '}Open
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[9px] dark:border-gray-700 dark:bg-gray-800">Esc</kbd>
              {' '}Close
            </span>
          </div>
        </Command>
      </div>
    </>
  );
};

export default CommandPalette;
