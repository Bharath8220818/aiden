import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Layout (always loaded)
import Header from './components/common/Header';
import CommandPalette from './components/common/CommandPalette';
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
const AgentsPage = lazy(() => import('./pages/AgentsPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const ApprovalsPage = lazy(() => import('./pages/ApprovalsPage'));
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ChangelogPage = lazy(() => import('./pages/ChangelogPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const GettingStartedPage = lazy(() => import('./pages/GettingStartedPage'));
const TemplatesPage = lazy(() => import('./pages/TemplatesPage'));
const MultimodalPage = lazy(() => import('./pages/MultimodalPage'));

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

  const isAuthRoute = ['/login', '/signup'].includes(location.pathname);

  return (
    <div className="app-shell">
      <ErrorBoundary>
        {!isAuthRoute && <Header />}
        <main className={isAuthRoute ? '' : 'mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8'}>
          <Suspense fallback={<PageSkeleton />}>
            <AnimatePresence mode="wait">
              <Routes location={location} key={location.pathname}>
                {/* Public Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/changelog" element={<ChangelogPage />} />

                {/* Protected Routes */}
                <Route path="/" element={<ProtectedRoute><PageTransition><DashboardPage /></PageTransition></ProtectedRoute>} />
                <Route path="/pipelines" element={<ProtectedRoute><PageTransition><PipelinesPage /></PageTransition></ProtectedRoute>} />
                <Route path="/pipelines/:id" element={<ProtectedRoute><PageTransition><PipelineDetailsPage /></PageTransition></ProtectedRoute>} />
                <Route path="/builder" element={<ProtectedRoute><PageTransition><PipelineBuilderPage /></PageTransition></ProtectedRoute>} />
                <Route path="/monitoring" element={<ProtectedRoute><PageTransition><MonitoringPage /></PageTransition></ProtectedRoute>} />
                <Route path="/agents" element={<ProtectedRoute><PageTransition><AgentsPage /></PageTransition></ProtectedRoute>} />
                <Route path="/analytics" element={<ProtectedRoute><PageTransition><AnalyticsPage /></PageTransition></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute><PageTransition><NotificationsPage /></PageTransition></ProtectedRoute>} />
                <Route path="/approvals" element={<ProtectedRoute><PageTransition><ApprovalsPage /></PageTransition></ProtectedRoute>} />
                <Route path="/audit-logs" element={<ProtectedRoute><PageTransition><AuditLogsPage /></PageTransition></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><PageTransition><SettingsPage /></PageTransition></ProtectedRoute>} />
                <Route path="/getting-started" element={<ProtectedRoute><PageTransition><GettingStartedPage /></PageTransition></ProtectedRoute>} />
                <Route path="/templates" element={<ProtectedRoute><PageTransition><TemplatesPage /></PageTransition></ProtectedRoute>} />
                <Route path="/multimodal" element={<ProtectedRoute><PageTransition><MultimodalPage /></PageTransition></ProtectedRoute>} />

                {/* Catch-all */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </AnimatePresence>
          </Suspense>
        </main>
      </ErrorBoundary>

      {/* ── Global Command Palette ── */}
      <CommandPalette />

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
