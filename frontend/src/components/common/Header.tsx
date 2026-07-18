import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import LoadingSpinner from './LoadingSpinner';

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/pipelines', label: 'Pipelines' },
  { to: '/builder', label: 'Builder' },
  { to: '/monitoring', label: 'Monitoring' },
];

const Header: React.FC = () => {
  const { user, isAuthenticated, logout, isLoading } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/70 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-indigo-500 text-lg font-bold text-white shadow-sm">
            A
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-base font-semibold text-slate-900">AIDEN</span>
            <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-500">AI Studio</span>
          </div>
        </Link>

        {isAuthenticated && (
          <nav className="hidden items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50/80 p-1.5 md:flex">
            {navItems.map((item) => {
              const active = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                    active ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="flex items-center gap-2 sm:gap-3">
          {isAuthenticated && (
            <button className="relative rounded-full border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm transition hover:text-slate-900">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          )}

          {isAuthenticated && user ? (
            <div className="hidden items-center gap-3 rounded-full border border-slate-200 bg-slate-50/80 px-2 py-1.5 sm:flex">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">{user.full_name}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="rounded-full bg-white p-2 text-slate-500 shadow-sm transition hover:text-slate-900"
                aria-label="Log out"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link to="/login" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
                Log In
              </Link>
              <Link to="/signup" className="btn-primary px-3 py-2 text-sm">
                Sign Up
              </Link>
            </div>
          )}

          {isLoading && <LoadingSpinner size="sm" />}
        </div>
      </div>
    </header>
  );
};

export default Header;