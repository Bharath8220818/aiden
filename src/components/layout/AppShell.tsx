import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';
import { AskAidenModal } from '@/components/feedback/AskAidenModal';
import { CommandPalette } from '@/components/feedback/CommandPalette';
import { useCommandPalette } from '@/hooks/useCommandPalette';

export const AppShell: React.FC = () => {
  // Register global shortcuts Ctrl+K, Ctrl+J
  useCommandPalette();

  return (
    <div className="flex h-screen w-screen bg-[#0B0D10] text-[#F5F7FA] overflow-hidden">
      {/* Desktop & Tablet Sidebar */}
      <div className="hidden md:flex shrink-0">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Fixed Topbar */}
        <Topbar />

        {/* Scrollable Page Viewport */}
        <div className="flex-1 overflow-y-auto relative">
          <Outlet />
        </div>
      </div>

      {/* Mobile Drawer & Bottom Tab Bar */}
      <MobileNav />

      {/* Global Interactive Dialogs */}
      <AskAidenModal />
      <CommandPalette />
    </div>
  );
};
