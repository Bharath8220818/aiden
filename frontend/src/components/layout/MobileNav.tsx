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
    <nav className="fixed inset-x-3 bottom-3 z-50 md:hidden" aria-label="Mobile navigation" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="rounded-[1.5rem] border border-white/10 bg-[#111827]/95 px-1.5 py-1.5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        <div className="grid grid-cols-4 gap-1">
          {items.map((item) => {
            const active = pathname === item.to || (item.to !== '/' && pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center rounded-[1rem] px-2 py-2 text-[11px] font-semibold transition ${
                  active ? 'bg-primary-500 text-white shadow-sm' : 'text-slate-300 hover:bg-white/10'
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
      </div>
    </nav>
  );
};

export default MobileNav;
