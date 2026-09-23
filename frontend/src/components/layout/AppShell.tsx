import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';
import { AskAidenModal } from '@/components/feedback/AskAidenModal';
import { CommandPalette } from '@/components/feedback/CommandPalette';
import { LiveEventToasts } from '@/components/feedback/LiveEventToasts';
import { useCommandPalette } from '@/hooks/useCommandPalette';

export const AppShell: React.FC = () => {
  const location = useLocation();
  // Register global shortcuts Ctrl+K, Ctrl+J
  useCommandPalette();

  return (
    <div className="flex h-screen w-screen bg-background text-text-primary overflow-hidden">
      {/* Accessibility: skip navigation */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      {/* Desktop & Tablet Sidebar */}
      <div className="hidden md:flex shrink-0">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Fixed Topbar */}
        <Topbar />

        {/* Scrollable Page Viewport */}
        <div id="main-content" className="flex-1 overflow-y-auto relative" role="main" aria-label="Page content">
          <div key={location.pathname} className="page-in">
            <Outlet />
          </div>
        </div>
      </div>

      {/* Mobile Drawer & Bottom Tab Bar */}
      <MobileNav />

      {/* Global Interactive Dialogs */}
      <AskAidenModal />
      <CommandPalette />

      {/* Realtime toast stack + transport status (inside Router context for Links) */}
      <LiveEventToasts />
    </div>
  );
};
