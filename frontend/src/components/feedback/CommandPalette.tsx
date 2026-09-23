import React, { useState, useMemo } from 'react';
import { useUIStore } from '@/store/uiStore';
import { Modal } from '@/components/ui/Modal';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  LayoutDashboard,
  Sparkles,
  Network,
  GitBranch,
  Terminal,
  Database,
  Activity,
  AlertTriangle,
  Cpu,
  Bot,
  BookOpen,
  Plug,
  CheckSquare,
} from 'lucide-react';

interface CommandOption {
  id: string;
  title: string;
  category: 'Navigation' | 'Actions';
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
  action?: () => void;
  shortcut?: string;
}

export const CommandPalette: React.FC = () => {
  const { isCommandPaletteOpen, closeCommandPalette, openAskAiden } = useUIStore();
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const commands: CommandOption[] = useMemo(
    () => [
      {
        id: 'cmd-ask-aiden',
        title: 'Ask AIDEN Autonomous Assistant...',
        category: 'Actions',
        icon: Sparkles,
        action: () => {
          closeCommandPalette();
          openAskAiden();
        },
        shortcut: 'Ctrl+J',
      },
      {
        id: 'cmd-overview',
        title: 'Go to Overview Dashboard',
        category: 'Navigation',
        icon: LayoutDashboard,
        path: '/dashboard',
      },
      {
        id: 'cmd-architecture',
        title: 'Go to Architecture Studio',
        category: 'Navigation',
        icon: Network,
        path: '/architecture',
      },
      {
        id: 'cmd-pipelines',
        title: 'Go to Pipeline Builder',
        category: 'Navigation',
        icon: GitBranch,
        path: '/pipelines',
      },
      {
        id: 'cmd-sql',
        title: 'Go to SQL Workspace',
        category: 'Navigation',
        icon: Terminal,
        path: '/sql',
      },
      {
        id: 'cmd-connections',
        title: 'Go to Connections Manager',
        category: 'Navigation',
        icon: Database,
        path: '/connections',
      },
      {
        id: 'cmd-monitoring',
        title: 'Go to Monitoring Center',
        category: 'Navigation',
        icon: Activity,
        path: '/monitoring',
      },
      {
        id: 'cmd-incidents',
        title: 'Go to Incidents & Alerting',
        category: 'Navigation',
        icon: AlertTriangle,
        path: '/incidents',
      },
      {
        id: 'cmd-healing',
        title: 'Go to AI Self-Healing Engine',
        category: 'Navigation',
        icon: Cpu,
        path: '/self-healing',
      },
      {
        id: 'cmd-agents',
        title: 'Go to Agent Control Center',
        category: 'Navigation',
        icon: Bot,
        path: '/agents',
      },
      {
        id: 'cmd-knowledge',
        title: 'Go to Knowledge / RAG Repository',
        category: 'Navigation',
        icon: BookOpen,
        path: '/knowledge',
      },
      {
        id: 'cmd-integrations',
        title: 'Go to MCP Integrations',
        category: 'Navigation',
        icon: Plug,
        path: '/integrations',
      },
      {
        id: 'cmd-approvals',
        title: 'Go to Approvals & Governance',
        category: 'Navigation',
        icon: CheckSquare,
        path: '/approvals',
      },
    ],
    [closeCommandPalette, openAskAiden]
  );

  const filteredCommands = useMemo(() => {
    if (!search.trim()) return commands;
    return commands.filter((cmd) =>
      cmd.title.toLowerCase().includes(search.toLowerCase())
    );
  }, [commands, search]);

  const handleSelect = (cmd: CommandOption) => {
    closeCommandPalette();
    setSearch('');
    if (cmd.action) {
      cmd.action();
    } else if (cmd.path) {
      navigate(cmd.path);
    }
  };

  return (
    <Modal
      isOpen={isCommandPaletteOpen}
      onClose={() => {
        closeCommandPalette();
        setSearch('');
      }}
      maxWidth="xl"
      className="p-0 border-border overflow-hidden"
    >
      <div className="flex items-center px-4 py-3 border-b border-border bg-card">
        <Search className="w-4 h-4 text-text-secondary mr-3 shrink-0" />
        <input
          type="text"
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search screens, commands, or agents... (Ctrl+K)"
          className="w-full bg-transparent text-sm text-text-primary placeholder-[#9CA3AF] focus:outline-none"
        />
        <kbd className="text-[10px] bg-card-hover text-text-secondary px-1.5 py-0.5 rounded border border-border">
          ESC
        </kbd>
      </div>

      <div className="max-h-80 overflow-y-auto p-2 space-y-1">
        {filteredCommands.length === 0 ? (
          <div className="py-8 text-center text-xs text-text-muted">
            No matching actions found.
          </div>
        ) : (
          filteredCommands.map((cmd) => {
            const Icon = cmd.icon;
            return (
              <button
                key={cmd.id}
                onClick={() => handleSelect(cmd)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-card-hover text-left text-xs transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 rounded-md bg-card border border-border text-text-secondary group-hover:text-indigo-600 group-hover:border-indigo-500/30 transition-colors">
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <span className="font-medium text-text-primary">{cmd.title}</span>
                </div>
                {cmd.shortcut && (
                  <kbd className="text-[10px] bg-card text-text-muted px-1.5 py-0.5 rounded border border-border">
                    {cmd.shortcut}
                  </kbd>
                )}
              </button>
            );
          })
        )}
      </div>

      <div className="px-4 py-2 border-t border-border bg-card text-[11px] text-text-muted flex items-center justify-between">
        <span>Tip: Press <span className="text-text-primary">↑↓</span> to navigate, <span className="text-text-primary">Enter</span> to select</span>
        <span className="text-indigo-600">AIDEN Global Search</span>
      </div>
    </Modal>
  );
};
