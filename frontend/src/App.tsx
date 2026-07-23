import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PageTransition } from './components/ui/PageTransition';
import { PageSkeleton } from './components/ui/Skeleton';
import { ToastProvider } from './components/providers/ToastProvider';
import { useThemeStore } from './store/themeStore';
import { AppLayout } from './components/layout/AppLayout';

// ── Lazy loaded pages ──────────────────────────────────────────────────
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const PipelinesPage = lazy(() => import('./pages/PipelinesPage'));
const PipelineBuilderPage = lazy(() => import('./pages/PipelineBuilderPage'));
const PipelineDetailsPage = lazy(() => import('./pages/PipelineDetailsPage'));
const MonitoringPage = lazy(() => import('./pages/MonitoringPage'));
const AgentsPage = lazy(() => import('./pages/AgentsPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const ApprovalsPage = lazy(() => import('./pages/ApprovalsPage'));
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const TemplatesPage = lazy(() => import('./pages/TemplatesPage'));
const GettingStartedPage = lazy(() => import('./pages/GettingStartedPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ChangelogPage = lazy(() => import('./pages/ChangelogPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

function AppShell() {
  const location = useLocation();
  const theme = useThemeStore((state) => state.theme);

  // Apply theme to <html> element — handles dark class
  useEffect(() => {
    const effective = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    document.documentElement.classList.toggle('dark', effective === 'dark');
  }, [theme]);

  const isAuthRoute = ['/login', '/signup'].includes(location.pathname);

  return (
    <>
      {isAuthRoute ? (
        <Suspense fallback={<PageSkeleton />}>
          <Routes location={location}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/changelog" element={<ChangelogPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
          </Routes>
        </Suspense>
      ) : (
        <Suspense fallback={<PageSkeleton />}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<PageTransition><DashboardPage /></PageTransition>} />
                <Route path="/pipelines" element={<PageTransition><PipelinesPage /></PageTransition>} />
                <Route path="/pipelines/:id" element={<PageTransition><PipelineDetailsPage /></PageTransition>} />
                <Route path="/builder" element={<PageTransition><PipelineBuilderPage /></PageTransition>} />
                <Route path="/monitoring" element={<PageTransition><MonitoringPage /></PageTransition>} />
                <Route path="/agents" element={<PageTransition><AgentsPage /></PageTransition>} />
                <Route path="/analytics" element={<PageTransition><AnalyticsPage /></PageTransition>} />
                <Route path="/approvals" element={<PageTransition><ApprovalsPage /></PageTransition>} />
                <Route path="/audit-logs" element={<PageTransition><AuditLogsPage /></PageTransition>} />
                <Route path="/notifications" element={<PageTransition><NotificationsPage /></PageTransition>} />
                <Route path="/settings" element={<PageTransition><SettingsPage /></PageTransition>} />
                <Route path="/templates" element={<PageTransition><TemplatesPage /></PageTransition>} />
                <Route path="/getting-started" element={<PageTransition><GettingStartedPage /></PageTransition>} />
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </AnimatePresence>
        </Suspense>
      )}
    </>
  );
}

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppShell />
          <ToastProvider />
        </BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
