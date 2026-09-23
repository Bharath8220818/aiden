import React from 'react';
import { useUIStore } from '@/store/uiStore';
import { useAppStore } from '@/store/appStore';
import { WorkspaceSelector } from '@/components/navigation/WorkspaceSelector';
import { ProjectSelector } from '@/components/navigation/ProjectSelector';
import { EnvironmentSelector } from '@/components/navigation/EnvironmentSelector';
import { NotificationDrawer } from '@/components/feedback/NotificationDrawer';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Dropdown } from '@/components/ui/Dropdown';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ROLE_LABELS } from '@/features/auth/types';
import { ROLE_BADGE } from '@/features/auth/roleBadge';
import {
  Search,
  Sparkles,
  Bell,
  Menu,
  LogOut,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';
import { ThemeToggle, ThemeToggleInline } from '@/components/ui/ThemeToggle';
import { useThemeStore } from '@/store/themeStore';
import { useResponsiveBreakpoints } from '@/hooks/useMediaQuery';
import { Palette } from 'lucide-react';

export const Topbar: React.FC = () => {
  const {
    openAskAiden,
    openCommandPalette,
    toggleNotificationDrawer,
    toggleMobileNav,
  } = useUIStore();
  const { currentUser, notifications } = useAppStore();
  const { user: authUser, logout } = useAuth();
  const { isMobile } = useResponsiveBreakpoints();

  const displayName = authUser?.name ?? currentUser.name;
  const roleBadge = authUser ? ROLE_BADGE[authUser.systemRole] : null;
  const modeLabel = () => {
    const m = useThemeStore.getState().mode;
    return m.charAt(0).toUpperCase() + m.slice(1);
  };

  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="h-14 border-b border-border bg-card/90 backdrop-blur-md px-4 flex items-center justify-between z-20 select-none">
      {/* Left side: Mobile menu toggle + Project & Environment Selectors */}
      <div className="flex items-center gap-3">
        {isMobile && (
          <button
            onClick={toggleMobileNav}
            className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-card-hover"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2 sm:gap-3">
          <WorkspaceSelector />
          <span className="text-border hidden sm:inline">|</span>
          <ProjectSelector />
          <span className="text-border hidden sm:inline">|</span>
          <EnvironmentSelector />
        </div>
      </div>

      {/* Center / Right: Global Search, Ask AIDEN, Notifications, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Global Search trigger */}
        <button
          onClick={openCommandPalette}
          className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-md bg-card border border-border text-text-secondary hover:text-text-primary hover:border-border-highlight text-xs transition-colors w-48 lg:w-64"
        >
          <Search className="w-3.5 h-3.5 text-text-muted" />
          <span className="truncate">Search or command...</span>
          <kbd className="ml-auto text-[10px] bg-background text-text-muted px-1.5 py-0.5 rounded border border-border font-mono">
            Ctrl+K
          </kbd>
        </button>

        {/* Ask AIDEN Button - Highlighted feature */}
        <Button
          size="sm"
          variant="ai"
          onClick={openAskAiden}
          className="px-3 py-1.5 text-xs shadow-ai-glow"
          leftIcon={<Sparkles className="w-3.5 h-3.5 text-cyan-200" />}
        >
          <span className="hidden sm:inline">Ask AIDEN</span>
          <span className="sm:hidden">AIDEN</span>
        </Button>

        {/* Theme switcher — light / dark / system (compact enough for mobile) */}
        <ThemeToggle />

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={toggleNotificationDrawer}
            className="relative p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-card-hover transition-colors border border-transparent hover:border-border"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-surface" />
            )}
          </button>
          <NotificationDrawer />
        </div>

        {/* User menu */}
        <div className="pl-1 flex items-center gap-2">
          <Dropdown
            trigger={
              <button
                aria-label="Account menu"
                title={`${displayName} — ${authUser ? ROLE_LABELS[authUser.systemRole] : ''}`}
                className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <Avatar
                  name={displayName}
                  size="sm"
                  status={authUser?.status ?? currentUser.status}
                />
              </button>
            }
            items={[
              {
                id: 'identity',
                label: `${displayName} · ${authUser ? ROLE_LABELS[authUser.systemRole] : currentUser.role}`,
                icon: <ShieldCheck className="w-3.5 h-3.5" />,
                disabled: true,
              },
              ...(authUser && roleBadge
                ? [{
                    id: 'session',
                    label: `Session · ${roleBadge.label}`,
                    icon: <KeyRound className="w-3.5 h-3.5" />,
                    disabled: true,
                  }]
                : []),
              {
                id: 'theme',
                label: `Theme · ${modeLabel()}`,
                icon: <Palette className="w-3.5 h-3.5" />,
                disabled: true,
              },
              {
                id: 'signout',
                label: 'Sign out',
                icon: <LogOut className="w-3.5 h-3.5" />,
                danger: true,
                onClick: () => logout(),
              },
            ]}
          />
          <ThemeToggleInline className="hidden lg:flex" />
        </div>
      </div>
    </header>
  );
};
