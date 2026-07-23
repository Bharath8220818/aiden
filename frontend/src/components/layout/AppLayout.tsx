import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../common/Sidebar';
import { Header } from '../common/Header';
import { MobileNav } from './MobileNav';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const isBuilder = location.pathname === '/builder';

  return (
    <div className="flex h-screen bg-[#050816] overflow-hidden">
      {/* Sidebar - Desktop */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <main
          className={
            isBuilder
              ? 'flex-1 flex flex-col min-h-0 pb-16 md:pb-0'
              : 'flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6 pb-20 md:pb-6'
          }
        >
          <Outlet />
        </main>

        {/* Mobile Navigation */}
        <MobileNav />
      </div>
    </div>
  );
};

AppLayout.displayName = 'AppLayout';
