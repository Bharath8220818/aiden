import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Layout (always loaded)
import { AppShell } from './components/layout/AppShell';
import LandingPage from './pages/LandingPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import CommandPalette from './components/common/CommandPalette';
import { PageTransition } from './components/ui/PageTransition';
import { ToastProvider } from './components/providers/ToastProvider';
import { useScrollRestoration } from './hooks/useScrollRestoration';

// Lazy loaded pages — split into separate JS chunks
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const PipelinesPage = lazy(() => import('./pages/PipelinesPage'));
const PipelineBuilderPage = lazy(() => import('./pages/PipelineBuilderPage'));
const PipelineDetailsPage = lazy(() => import('./pages/PipelineDetailsPage'));
const MonitoringPage = lazy(() => import('./pages/MonitoringPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const AgentsPage = lazy(() => import('./pages/AgentsPage'));
const ApprovalsPage = lazy(() => import('./pages/ApprovalsPage'));
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage'));
const MultimodalPage = lazy(() => import('./pages/MultimodalPage'));
const TemplatesPage = lazy(() => import('./pages/TemplatesPage'));
const GettingStartedPage = lazy(() => import('./pages/GettingStartedPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const ChangelogPage = lazy(() => import('./pages/ChangelogPage'));

// ── NEW PAGES (30-pages spec) ──
const ArchitectureStudioPage = lazy(() => import('./pages/ArchitectureStudioPage'));
const SchemaDesignerPage = lazy(() => import('./pages/SchemaDesignerPage'));
const AIWorkspacePage = lazy(() => import('./pages/AIWorkspacePage'));
const PipelineStudioPage = lazy(() => import('./pages/PipelineStudioPage'));
const TeamPage = lazy(() => import('./pages/TeamPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const PipelineDesignerPage = lazy(() => import('./pages/PipelineDesignerPage'));
const KnowledgeBasePage = lazy(() => import('./pages/KnowledgeBasePage'));
const AgentActivityPage = lazy(() => import('./pages/AgentActivityPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

function PageSkeleton() {
  return (
    <div className="space-y-4 p-6 animate-pulse">
      <div className="h-8 w-48 rounded-lg skeleton" />
      <div className="h-4 w-96 rounded-lg skeleton" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-2xl skeleton" />)}
      </div>
      <div className="h-64 rounded-2xl skeleton" />
    </div>
  );
}

function AppShellWithRoutes() {
  const location = useLocation();
  const { restoreScroll } = useScrollRestoration();

  const isLandingRoute = location.pathname === '/';
  const isAuthRoute = ['/login', '/signup'].includes(location.pathname);

  // Landing page is shown for unauthenticated users at /
  if (isLandingRoute) {
    return <LandingPage />;
  }

  return (
    <div className="app-shell min-h-screen bg-[var(--color-background)]">
      <ErrorBoundary>
        {isAuthRoute ? (
          <main>
            <Suspense fallback={<PageSkeleton />}>
              <AnimatePresence mode="wait" onExitComplete={restoreScroll}>
                <Routes location={location} key={location.pathname}>
                  <Route path="/login" element={<PageTransition variant="fade"><LoginPage /></PageTransition>} />
                  <Route path="/signup" element={<PageTransition variant="fade"><SignupPage /></PageTransition>} />
                  <Route path="*" element={<PageTransition variant="fade"><NotFoundPage /></PageTransition>} />
                </Routes>
              </AnimatePresence>
            </Suspense>
          </main>
        ) : (
          <AppShell>
            <Suspense fallback={<PageSkeleton />}>
              <AnimatePresence mode="wait" onExitComplete={restoreScroll}>
                <Routes location={location} key={location.pathname}>
                  {/* Core */}
                  <Route path="/dashboard" element={<ProtectedRoute><PageTransition><DashboardPage /></PageTransition></ProtectedRoute>} />
                  <Route path="/pipelines" element={<ProtectedRoute><PageTransition><PipelinesPage /></PageTransition></ProtectedRoute>} />
                  <Route path="/pipelines/:id" element={<ProtectedRoute><PageTransition variant="slideX"><PipelineDetailsPage /></PageTransition></ProtectedRoute>} />
                  <Route path="/builder" element={<ProtectedRoute><PageTransition variant="scale"><PipelineBuilderPage /></PageTransition></ProtectedRoute>} />
                  <Route path="/studio" element={<ProtectedRoute><PageTransition variant="scale"><PipelineStudioPage /></PageTransition></ProtectedRoute>} />

                  {/* Design & Build */}
                  <Route path="/architecture" element={<ProtectedRoute><PageTransition variant="scale"><ArchitectureStudioPage /></PageTransition></ProtectedRoute>} />
                  <Route path="/architecture-canvas" element={<ProtectedRoute><PageTransition variant="scale"><ArchitectureStudioPage /></PageTransition></ProtectedRoute>} />
                  <Route path="/schema-designer" element={<ProtectedRoute><PageTransition variant="scale"><SchemaDesignerPage /></PageTransition></ProtectedRoute>} />
                  <Route path="/pipeline-designer" element={<ProtectedRoute><PageTransition variant="scale"><PipelineDesignerPage /></PageTransition></ProtectedRoute>} />

                  {/* Operations */}
                  <Route path="/monitoring" element={<ProtectedRoute><PageTransition variant="fade"><MonitoringPage /></PageTransition></ProtectedRoute>} />
                  <Route path="/analytics" element={<ProtectedRoute><PageTransition variant="fade"><AnalyticsPage /></PageTransition></ProtectedRoute>} />

                  {/* AI & Automation */}
                  <Route path="/ai-workspace" element={<ProtectedRoute><PageTransition variant="rotate"><AIWorkspacePage /></PageTransition></ProtectedRoute>} />
                  <Route path="/agents" element={<ProtectedRoute><PageTransition variant="fade"><AgentsPage /></PageTransition></ProtectedRoute>} />
                  <Route path="/agent-activity" element={<ProtectedRoute><PageTransition variant="fade"><AgentActivityPage /></PageTransition></ProtectedRoute>} />
                  <Route path="/multimodal" element={<ProtectedRoute><PageTransition variant="fade"><MultimodalPage /></PageTransition></ProtectedRoute>} />

                  {/* Governance */}
                  <Route path="/approvals" element={<ProtectedRoute><PageTransition variant="fade"><ApprovalsPage /></PageTransition></ProtectedRoute>} />
                  <Route path="/audit-logs" element={<ProtectedRoute><PageTransition variant="fade"><AuditLogsPage /></PageTransition></ProtectedRoute>} />
                  <Route path="/team" element={<ProtectedRoute><PageTransition variant="fade"><TeamPage /></PageTransition></ProtectedRoute>} />

                  {/* Resources */}
                  <Route path="/templates" element={<ProtectedRoute><PageTransition variant="fade"><TemplatesPage /></PageTransition></ProtectedRoute>} />
                  <Route path="/getting-started" element={<ProtectedRoute><PageTransition variant="fade"><GettingStartedPage /></PageTransition></ProtectedRoute>} />
                  <Route path="/knowledge-base" element={<ProtectedRoute><PageTransition variant="fade"><KnowledgeBasePage /></PageTransition></ProtectedRoute>} />
                  <Route path="/notifications" element={<ProtectedRoute><PageTransition variant="fade"><NotificationsPage /></PageTransition></ProtectedRoute>} />

                  {/* Settings & Admin */}
                  <Route path="/settings" element={<ProtectedRoute><PageTransition variant="fade"><SettingsPage /></PageTransition></ProtectedRoute>} />
                  <Route path="/admin" element={<ProtectedRoute><PageTransition variant="fade"><AdminDashboardPage /></PageTransition></ProtectedRoute>} />

                  {/* Info pages (public) */}
                  <Route path="/about" element={<PageTransition variant="fade"><AboutPage /></PageTransition>} />
                  <Route path="/terms" element={<PageTransition variant="fade"><TermsPage /></PageTransition>} />
                  <Route path="/privacy" element={<PageTransition variant="fade"><PrivacyPage /></PageTransition>} />
                  <Route path="/changelog" element={<PageTransition variant="fade"><ChangelogPage /></PageTransition>} />

                  {/* Catch-all */}
                  <Route path="*" element={<PageTransition variant="fade"><NotFoundPage /></PageTransition>} />
                </Routes>
              </AnimatePresence>
            </Suspense>
          </AppShell>
        )}

        {/* ── Global Components ── */}
        <CommandPalette />
        <ToastProvider />
      </ErrorBoundary>
    </div>
  );
}

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppShellWithRoutes />
        </BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
