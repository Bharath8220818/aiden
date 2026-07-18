import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const items = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/builder', label: 'Build', icon: '✨' },
  { to: '/pipelines', label: 'Pipelines', icon: '📋' },
  { to: '/monitoring', label: 'Monitor', icon: '📊' },
];

const MobileNav = () => {
  const { pathname } = useLocation();
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated || pathname === '/login' || pathname === '/signup') {
    return null;
  }

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 safe-area-pb"
      aria-label="Mobile navigation"
    >
      <div className="grid grid-cols-4 h-16">
        {items.map((item) => {
          const active = pathname === item.to || (item.to !== '/' && pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${
                active ? 'text-primary-600' : 'text-gray-500'
              }`}
            >
              <span className="text-lg leading-none" aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNav;
