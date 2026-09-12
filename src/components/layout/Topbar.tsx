import React from 'react';
import { useUIStore } from '@/store/uiStore';
import { useAppStore } from '@/store/appStore';
import { WorkspaceSelector } from '@/components/navigation/WorkspaceSelector';
import { EnvironmentSelector } from '@/components/navigation/EnvironmentSelector';
import { NotificationDrawer } from '@/components/feedback/NotificationDrawer';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import {
  Search,
  Sparkles,
  Bell,
  Menu,
} from 'lucide-react';
import { useResponsiveBreakpoints } from '@/hooks/useMediaQuery';

export const Topbar: React.FC = () => {
  const {
    openAskAiden,
    openCommandPalette,
    toggleNotificationDrawer,
    toggleMobileNav,
  } = useUIStore();
  const { currentUser, notifications } = useAppStore();
  const { isMobile } = useResponsiveBreakpoints();

  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="h-14 border-b border-[#242831] bg-[#0F1115]/90 backdrop-blur-md px-4 flex items-center justify-between z-20 select-none">
      {/* Left side: Mobile menu toggle + Project & Environment Selectors */}
      <div className="flex items-center gap-3">
        {isMobile && (
          <button
            onClick={toggleMobileNav}
            className="p-1.5 rounded-md text-[#9CA3AF] hover:text-[#F5F7FA] hover:bg-[#1A1D24]"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2 sm:gap-3">
          <WorkspaceSelector />
          <span className="text-[#242831] hidden sm:inline">|</span>
          <EnvironmentSelector />
        </div>
      </div>

      {/* Center / Right: Global Search, Ask AIDEN, Notifications, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Global Search trigger */}
        <button
          onClick={openCommandPalette}
          className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-md bg-[#14171C] border border-[#242831] text-[#9CA3AF] hover:text-[#F5F7FA] hover:border-[#383F4D] text-xs transition-colors w-48 lg:w-64"
        >
          <Search className="w-3.5 h-3.5 text-[#6B7280]" />
          <span className="truncate">Search or command...</span>
          <kbd className="ml-auto text-[10px] bg-[#0B0D10] text-[#6B7280] px-1.5 py-0.5 rounded border border-[#242831] font-mono">
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

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={toggleNotificationDrawer}
            className="relative p-2 rounded-md text-[#9CA3AF] hover:text-[#F5F7FA] hover:bg-[#1A1D24] transition-colors border border-transparent hover:border-[#242831]"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-[#0F1115]" />
            )}
          </button>
          <NotificationDrawer />
        </div>

        {/* User Avatar pill */}
        <div className="pl-1 flex items-center gap-2">
          <Avatar
            name={currentUser.name}
            size="sm"
            status={currentUser.status}
          />
        </div>
      </div>
    </header>
  );
};
