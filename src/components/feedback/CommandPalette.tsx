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
        path: '/overview',
      },
      {
        id: 'cmd-requirements',
        title: 'Go to Requirement Studio',
        category: 'Navigation',
        icon: Sparkles,
        path: '/requirements',
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
      className="p-0 border-[#242831] overflow-hidden"
    >
      <div className="flex items-center px-4 py-3 border-b border-[#242831] bg-[#0F1115]">
        <Search className="w-4 h-4 text-[#9CA3AF] mr-3 shrink-0" />
        <input
          type="text"
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search screens, commands, or agents... (Ctrl+K)"
          className="w-full bg-transparent text-sm text-[#F5F7FA] placeholder-[#6B7280] focus:outline-none"
        />
        <kbd className="text-[10px] bg-[#1A1D24] text-[#9CA3AF] px-1.5 py-0.5 rounded border border-[#242831]">
          ESC
        </kbd>
      </div>

      <div className="max-h-80 overflow-y-auto p-2 space-y-1">
        {filteredCommands.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#6B7280]">
            No matching actions found.
          </div>
        ) : (
          filteredCommands.map((cmd) => {
            const Icon = cmd.icon;
            return (
              <button
                key={cmd.id}
                onClick={() => handleSelect(cmd)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-[#1A1D24] text-left text-xs transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 rounded-md bg-[#14171C] border border-[#242831] text-[#9CA3AF] group-hover:text-indigo-400 group-hover:border-indigo-500/30 transition-colors">
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <span className="font-medium text-[#F5F7FA]">{cmd.title}</span>
                </div>
                {cmd.shortcut && (
                  <kbd className="text-[10px] bg-[#0F1115] text-[#6B7280] px-1.5 py-0.5 rounded border border-[#242831]">
                    {cmd.shortcut}
                  </kbd>
                )}
              </button>
            );
          })
        )}
      </div>

      <div className="px-4 py-2 border-t border-[#242831] bg-[#0F1115] text-[11px] text-[#6B7280] flex items-center justify-between">
        <span>Tip: Press <span className="text-[#F5F7FA]">↑↓</span> to navigate, <span className="text-[#F5F7FA]">Enter</span> to select</span>
        <span className="text-indigo-400">AIDEN Global Search</span>
      </div>
    </Modal>
  );
};
