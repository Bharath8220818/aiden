import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Layout (always loaded)
import Header from './components/common/Header';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import { PageTransition } from './components/ui/PageTransition';
import { PageSkeleton } from './components/ui/Skeleton';
import { ToastProvider } from './components/providers/ToastProvider';

// Lazy loaded pages — split into separate JS chunks
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const PipelinesPage = lazy(() => import('./pages/PipelinesPage'));
const PipelineBuilderPage = lazy(() => import('./pages/PipelineBuilderPage'));
const PipelineDetailsPage = lazy(() => import('./pages/PipelineDetailsPage'));
const MonitoringPage = lazy(() => import('./pages/MonitoringPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

const AUTH_ROUTES = ['/login', '/signup'];

function AppShell() {
  const location = useLocation();
  const isAuthRoute = AUTH_ROUTES.includes(location.pathname);

  return (
    <div className="app-shell">
      <ErrorBoundary>
        {!isAuthRoute && <Header />}
        <main className={isAuthRoute ? '' : 'mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8'}>
          <Suspense fallback={<PageSkeleton />}>
            <AnimatePresence mode="wait">
              <Routes location={location} key={location.pathname}>
                {/* Public Routes — no header */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/about" element={<AboutPage />} />

                {/* Protected Routes — with header */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <PageTransition>
                        <DashboardPage />
                      </PageTransition>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/pipelines"
                  element={
                    <ProtectedRoute>
                      <PageTransition>
                        <PipelinesPage />
                      </PageTransition>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/pipelines/:id"
                  element={
                    <ProtectedRoute>
                      <PageTransition>
                        <PipelineDetailsPage />
                      </PageTransition>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/builder"
                  element={
                    <ProtectedRoute>
                      <PageTransition>
                        <PipelineBuilderPage />
                      </PageTransition>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/monitoring"
                  element={
                    <ProtectedRoute>
                      <PageTransition>
                        <MonitoringPage />
                      </PageTransition>
                    </ProtectedRoute>
                  }
                />

                {/* Catch-all */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </AnimatePresence>
          </Suspense>
        </main>
      </ErrorBoundary>

      {/* ── Toast Notifications ── */}
      <ToastProvider />
    </div>
  );
}

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppShell />
        </BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
