import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { useNotificationStore } from '../../store/notificationStore';
import { Search, Bell, Sparkles, Sun, Moon } from 'lucide-react';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { unreadCount } = useNotificationStore();

  const pageTitle = location.pathname === '/'
    ? 'Dashboard'
    : location.pathname === '/builder'
      ? 'AI Workspace'
      : location.pathname.split('/')[1]?.charAt(0).toUpperCase() + location.pathname.split('/')[1]?.slice(1) || '';

  return (
    <header className="sticky top-0 z-40 bg-[#0D1A2A]/80 backdrop-blur-[20px] border-b border-[#1E293B] h-16 shrink-0">
      <div className="flex h-full items-center justify-between px-4 md:px-6">
        {/* Left: Page title */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-400 hidden sm:inline">
            {pageTitle}
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {isAuthenticated && (
            <button
              onClick={() => navigate('/search')}
              className="p-2 rounded-lg hover:bg-[#1E293B] transition-colors text-gray-400 hover:text-white"
              aria-label="Search"
            >
              <Search size={18} />
            </button>
          )}

          {isAuthenticated && (
            <button
              onClick={() => navigate('/notifications')}
              className="p-2 rounded-lg hover:bg-[#1E293B] transition-colors text-gray-400 hover:text-white relative"
              aria-label="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-[#0D1A2A]" />
              )}
            </button>
          )}

          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-[#1E293B] transition-colors text-gray-400 hover:text-white"
            aria-label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {isAuthenticated && (
            <button
              onClick={() => navigate('/builder')}
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl text-white text-sm font-medium hover:scale-[1.02] transition-all shadow-lg shadow-purple-600/25"
            >
              <Sparkles size={16} />
              Deploy
            </button>
          )}

          {isAuthenticated && (
            <button
              onClick={() => navigate('/settings')}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center text-white text-xs font-bold shadow-sm"
            >
              {user?.full_name?.[0] || user?.username?.[0] || 'U'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

Header.displayName = 'Header';
