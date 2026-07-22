import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  User, Settings, LogOut, Command, Cpu,
  Bell, Menu, X, GitBranch, Monitor, 
  Activity, BarChart4, ShieldCheck, LayoutDashboard
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { Dropdown } from '../ui/Dropdown';
import LoadingSpinner from './LoadingSpinner';
import ThemeToggle from './ThemeToggle';
import type { DropdownItem } from '../ui/Dropdown';

const navItems = [
  { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
  { to: '/pipelines', label: 'Pipelines', icon: <GitBranch size={16} /> },
  { to: '/builder', label: 'Builder', icon: <Monitor size={16} /> },
  { to: '/agents', label: 'Agents', icon: <Cpu size={16} /> },
  { to: '/monitoring', label: 'Monitoring', icon: <Activity size={16} /> },
  { to: '/analytics', label: 'Analytics', icon: <BarChart4 size={16} /> },
  { to: '/approvals', label: 'Approvals', icon: <ShieldCheck size={16} /> },
];

const Header: React.FC = () => {
  const { user, isAuthenticated, logout, isLoading } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMobileMenuOpen(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const dropdownItems: DropdownItem[] = [
    {
      label: 'Profile',
      icon: <User size={16} />,
      onClick: () => navigate('/settings'),
    },
    {
      label: 'Settings',
      icon: <Settings size={16} />,
      onClick: () => navigate('/settings'),
    },
    { label: '', onClick: () => {}, divider: true },
    {
      label: 'Logout',
      icon: <LogOut size={16} />,
      onClick: handleLogout,
      danger: true,
    },
  ];

  const triggerCommandPalette = () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-50 bg-[#050816]/95 backdrop-blur-xl">
      {/* ── Signature: Flowing pipeline animation ── */}
      <div className="absolute bottom-0 left-0 right-0 h-px overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/30 to-transparent animate-pulse-soft" />
        <div className="absolute inset-0">
          {/* Data particle dots flowing left-to-right */}
          <span className="absolute top-[-2px] left-[-4px] h-[4px] w-[4px] rounded-full bg-cyan-400/70 animate-flow-particle" />
          <span className="absolute top-[-2px] left-[-4px] h-[3px] w-[3px] rounded-full bg-purple-400/50 animate-flow-particle-delayed" />
          <span className="absolute top-[-1px] left-[-4px] h-[2px] w-[2px] rounded-full bg-cyan-400/40" 
                style={{ animation: 'flowParticle 7s ease-in-out 1s infinite' }} />
          <span className="absolute top-[-2px] left-[-4px] h-[3px] w-[3px] rounded-full bg-purple-300/30"
                style={{ animation: 'flowParticle 9s ease-in-out 3s infinite' }} />
        </div>
      </div>

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-cyan-600 shadow-lg shadow-purple-500/25 transition-all duration-300 group-hover:shadow-purple-500/40 group-hover:scale-105">
            <span className="text-base font-bold text-white">A</span>
          </div>
          <div className="hidden flex-col leading-none sm:flex">
            <span className="text-sm font-bold text-white tracking-tight">AIDEN</span>
            <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">AI Studio</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        {isAuthenticated && (
          <nav className="hidden md:flex items-center gap-0.5">
            {navItems.map((item) => {
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'bg-purple-600/20 text-purple-300 border border-purple-500/20'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        )}

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Command Palette */}
          {isAuthenticated && (
            <button
              onClick={triggerCommandPalette}
              className="hidden sm:flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-gray-400 shadow-sm transition-all hover:bg-white/10 hover:text-gray-200"
              aria-label="Command palette"
            >
              <Command size={14} />
              <span className="hidden lg:inline">Search</span>
              <kbd className="ml-1 rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-medium text-gray-500">
                ⌘K
              </kbd>
            </button>
          )}

          <ThemeToggle />

          {/* Notifications */}
          {isAuthenticated && (
            <button
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-400 shadow-sm transition-all hover:bg-white/10 hover:text-gray-200"
              aria-label="Notifications"
              onClick={() => navigate('/notifications')}
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-[#050816]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          )}

          {/* User Profile */}
          {isAuthenticated && user ? (
            <Dropdown
              trigger={
                <button className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 pl-2 pr-3 py-1.5 shadow-sm transition-all hover:bg-white/10">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-cyan-600 text-[11px] font-bold text-white">
                    {getInitials(user.full_name || user.username || 'U')}
                  </div>
                  <span className="hidden text-sm font-semibold text-gray-200 lg:inline max-w-[100px] truncate">
                    {user.full_name || user.username}
                  </span>
                </button>
              }
              items={dropdownItems}
              align="right"
              className="hidden sm:block"
            />
          ) : !isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link to="/login" className="text-sm font-medium text-gray-400 transition-colors hover:text-gray-200 px-3 py-2">
                Log In
              </Link>
              <Link to="/signup" className="btn-primary btn-sm">
                Sign Up
              </Link>
            </div>
          ) : null}

          {/* Mobile menu toggle */}
          {isAuthenticated && (
            <button
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-400 shadow-sm transition-all md:hidden hover:bg-white/10 hover:text-gray-200"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          )}

          {isLoading && <LoadingSpinner size="sm" />}
        </div>
      </div>

      {/* Mobile menu */}
      {isAuthenticated && mobileMenuOpen && (
        <div className="border-t border-white/5 bg-[#050816] px-4 pb-4 pt-2 md:hidden animate-slide-down">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                    active
                      ? 'bg-purple-600/20 text-purple-300 border border-purple-500/20'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
            <div className="my-2 h-px bg-white/5" />
            <button
              onClick={() => { triggerCommandPalette(); setMobileMenuOpen(false); }}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-400 transition-all hover:bg-white/5 hover:text-gray-200"
            >
              <Command size={16} />
              Search Commands
              <span className="ml-auto text-xs text-gray-500">⌘K</span>
            </button>
            <Link
              to="/settings"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-400 transition-all hover:bg-white/5 hover:text-gray-200"
            >
              <Settings size={16} />
              Settings
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-400 transition-all hover:bg-red-500/10"
            >
              <LogOut size={16} />
              Log Out
            </button>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
