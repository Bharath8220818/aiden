import { Outlet, useLocation } from 'react-router-dom';
import Header from '../common/Header';
import MobileNav from './MobileNav';

const AppLayout = () => {
  const { pathname } = useLocation();
  const isBuilder = pathname === '/builder';

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      <Header />
      <main
        className={
          isBuilder
            ? 'flex-1 flex flex-col min-h-0 pb-16 md:pb-0'
            : 'flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-24 md:pb-6'
        }
      >
        <Outlet />
      </main>
      <MobileNav />
    </div>
  );
};

export default AppLayout;
