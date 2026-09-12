import React from 'react';
import { useUIStore } from '@/store/uiStore';
import { useAppStore } from '@/store/appStore';
import { SIDEBAR_NAV_SECTIONS, APP_NAME, APP_TAGLINE } from '@/lib/constants';
import { NavItem } from '@/components/navigation/NavItem';
import { Avatar } from '@/components/ui/Avatar';
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

export interface SidebarProps {
  className?: string;
  isMobileDrawer?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ className, isMobileDrawer = false }) => {
  const { isSidebarCollapsed, toggleSidebar, closeMobileNav } = useUIStore();
  const { currentUser } = useAppStore();

  const collapsed = isMobileDrawer ? false : isSidebarCollapsed;

  return (
    <aside
      className={cn(
        'h-screen bg-[#0F1115] border-r border-[#242831] flex flex-col justify-between transition-all duration-200 select-none z-30',
        collapsed ? 'w-18' : 'w-64',
        className
      )}
    >
      {/* Top Brand Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#242831]">
        <Link
          to="/overview"
          onClick={isMobileDrawer ? closeMobileNav : undefined}
          className={cn(
            'flex items-center gap-3 transition-opacity overflow-hidden',
            collapsed && 'justify-center w-full'
          )}
        >
          <img src="/logo.svg" alt="AIDEN Logo" className="w-8 h-8 shrink-0" />
          {!collapsed && (
            <div className="flex flex-col truncate">
              <span className="text-sm font-extrabold tracking-wider text-[#F5F7FA] uppercase flex items-center gap-1.5">
                {APP_NAME}
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse-dot" />
              </span>
              <span className="text-[10px] text-[#9CA3AF] truncate font-medium">
                {APP_TAGLINE}
              </span>
            </div>
          )}
        </Link>

        {/* Collapse toggle (desktop only) */}
        {!isMobileDrawer && (
          <button
            onClick={toggleSidebar}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'p-1 rounded-md text-[#9CA3AF] hover:text-[#F5F7FA] hover:bg-[#1A1D24] transition-colors',
              collapsed && 'hidden'
            )}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {SIDEBAR_NAV_SECTIONS.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {!collapsed && (
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                {section.title}
              </p>
            )}
            {collapsed && (
              <div className="w-6 mx-auto border-t border-[#242831]/60 my-2" />
            )}
            <div className="space-y-0.5">
              {section.items.map((item, itemIdx) => (
                <NavItem
                  key={itemIdx}
                  label={item.label}
                  path={item.path}
                  iconName={item.iconName}
                  badge={item.badge}
                  badgeVariant={item.badgeVariant}
                  collapsed={collapsed}
                  onClick={isMobileDrawer ? closeMobileNav : undefined}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom section: Help, Settings, User */}
      <div className="border-t border-[#242831] p-3 space-y-1 bg-[#0F1115]">
        {/* Secondary links */}
        <div className="space-y-0.5 mb-2">
          <NavItem
            label="Documentation"
            path="/knowledge"
            iconName="HelpCircle"
            collapsed={collapsed}
            onClick={isMobileDrawer ? closeMobileNav : undefined}
          />
          <NavItem
            label="Settings"
            path="/integrations"
            iconName="Settings"
            collapsed={collapsed}
            onClick={isMobileDrawer ? closeMobileNav : undefined}
          />
        </div>

        {/* Expand button when collapsed */}
        {!isMobileDrawer && collapsed && (
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center py-2 text-[#9CA3AF] hover:text-[#F5F7FA] hover:bg-[#1A1D24] rounded-md transition-colors"
            title="Expand Sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* User profile pill */}
        <div
          className={cn(
            'flex items-center gap-3 p-2 rounded-lg bg-[#14171C] border border-[#242831] transition-colors',
            collapsed && 'justify-center p-1.5'
          )}
        >
          <Avatar name={currentUser.name} size="sm" status={currentUser.status} />

          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#F5F7FA] truncate">
                {currentUser.name}
              </p>
              <p className="text-[10px] text-[#9CA3AF] truncate">
                {currentUser.role}
              </p>
            </div>
          )}

          {!collapsed && (
            <button
              onClick={() => alert('Logout action')}
              title="Logout"
              className="p-1 text-[#6B7280] hover:text-red-400 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
