import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Wand2, Workflow, Activity, Settings } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const items = [
  { to: '/', label: 'Home', icon: LayoutDashboard },
  { to: '/builder', label: 'Builder', icon: Wand2 },
  { to: '/pipelines', label: 'Pipelines', icon: Workflow },
  { to: '/monitoring', label: 'Monitor', icon: Activity },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const MobileNav = () => {
  const { pathname } = useLocation();
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated || pathname === '/login' || pathname === '/signup') {
    return null;
  }

  return (
    <nav className="fixed inset-x-3 bottom-3 z-50 md:hidden" aria-label="Mobile navigation">
      <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 px-2 py-1.5 shadow-xl backdrop-blur-xl transition-all">
        <div className="grid grid-cols-5 gap-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center rounded-xl px-1 py-1.5 text-[11px] font-medium transition-all ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="h-4 w-4 mb-0.5" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default MobileNav;

