import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Home, Sparkles, GitBranch, Activity, Settings } from 'lucide-react';

const navItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Sparkles, label: 'Builder', path: '/builder' },
  { icon: GitBranch, label: 'Pipelines', path: '/pipelines' },
  { icon: Activity, label: 'Monitor', path: '/monitoring' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export const MobileNav: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated || ['/login', '/signup'].includes(location.pathname)) {
    return null;
  }

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0D1A2A]/90 backdrop-blur-[20px] border-t border-[#1E293B] px-2 py-1 flex justify-around items-center safe-area-bottom">
      {navItems.map((item) => {
        const active = isActive(item.path);
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`
              flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-0
              ${active ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300'}
            `}
          >
            <item.icon size={20} className={active ? 'text-purple-400' : ''} />
            <span className={`text-[9px] font-medium ${active ? 'text-purple-400' : 'text-gray-500'}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
};

MobileNav.displayName = 'MobileNav';
