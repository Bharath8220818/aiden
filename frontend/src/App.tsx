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

// Lazy loaded pages — split into separate JS chunks
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const AuthCallback = lazy(() => import('./components/auth/AuthCallback'));
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
const ArchitectureCanvasPage = lazy(() => import('./pages/ArchitectureCanvasPage'));
const SchemaDesignerPage = lazy(() => import('./pages/SchemaDesignerPage'));
const CodingProblemsPage = lazy(() => import('./pages/CodingProblemsPage'));
const AIWorkspacePage = lazy(() => import('./pages/AIWorkspacePage'));
const LearningPathsPage = lazy(() => import('./pages/LearningPathsPage'));
const PipelineStudioPage = lazy(() => import('./pages/PipelineStudioPage'));
const TeamPage = lazy(() => import('./pages/TeamPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const DataModelingPage = lazy(() => import('./pages/DataModelingPage'));
const CodingProblemDetailPage = lazy(() => import('./pages/CodingProblemDetailPage'));
const CloudLabsPage = lazy(() => import('./pages/CloudLabsPage'));
const PipelineDesignerPage = lazy(() => import('./pages/PipelineDesignerPage'));
const KnowledgeBasePage = lazy(() => import('./pages/KnowledgeBasePage'));

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
              <Routes location={location} key={location.pathname}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </main>
        ) : (
          <AppShell>
            <Suspense fallback={<PageSkeleton />}>
              <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                  {/* Core */}
                  <Route path="/dashboard" element={<ProtectedRoute><PageTransition><DashboardPage /></PageTransition></ProtectedRoute>} />
                  <Route path="/pipelines" element={<ProtectedRoute><PageTransition><PipelinesPage /></PageTransition></ProtectedRoute>} />
                  <Route path="/pipelines/:id" element={<ProtectedRoute><PageTransition><PipelineDetailsPage /></PageTransition></ProtectedRoute>} />
                  <Route path="/builder" element={<ProtectedRoute><PageTransition><PipelineBuilderPage /></PageTransition></ProtectedRoute>} />
                  <Route path="/studio" element={<ProtectedRoute><PageTransition><PipelineStudioPage /></PageTransition></ProtectedRoute>} />

                  {/* Learning & Practice */}
                  <Route path="/learning-paths" element={<ProtectedRoute><PageTransition><LearningPathsPage /></PageTransition></ProtectedRoute>} />
                  <Route path="/coding-problems" element={<ProtectedRoute><PageTransition><CodingProblemsPage /></PageTransition></ProtectedRoute>} />
                  <Route path="/coding-problems/:id" element={<ProtectedRoute><PageTransition><CodingProblemDetailPage /></PageTransition></ProtectedRoute>} />
                  <Route path="/data-modeling" element={<ProtectedRoute><PageTransition><DataModelingPage /></PageTransition></ProtectedRoute>} />
                  <Route path="/cloud-labs" element={<ProtectedRoute><PageTransition><CloudLabsPage /></PageTransition></ProtectedRoute>} />

                  {/* Design & Build */}
                  <Route path="/architecture-canvas" element={<ProtectedRoute><PageTransition><ArchitectureCanvasPage /></PageTransition></ProtectedRoute>} />
                  <Route path="/schema-designer" element={<ProtectedRoute><PageTransition><SchemaDesignerPage /></PageTransition></ProtectedRoute>} />
                  <Route path="/pipeline-designer" element={<ProtectedRoute><PageTransition><PipelineDesignerPage /></PageTransition></ProtectedRoute>} />

                  {/* Operations */}
                  <Route path="/monitoring" element={<ProtectedRoute><PageTransition><MonitoringPage /></PageTransition></ProtectedRoute>} />
                  <Route path="/analytics" element={<ProtectedRoute><PageTransition><AnalyticsPage /></PageTransition></ProtectedRoute>} />

                  {/* AI & Automation */}
                  <Route path="/ai-workspace" element={<ProtectedRoute><PageTransition><AIWorkspacePage /></PageTransition></ProtectedRoute>} />
                  <Route path="/agents" element={<ProtectedRoute><PageTransition><AgentsPage /></PageTransition></ProtectedRoute>} />
                  <Route path="/multimodal" element={<ProtectedRoute><PageTransition><MultimodalPage /></PageTransition></ProtectedRoute>} />

                  {/* Governance */}
                  <Route path="/approvals" element={<ProtectedRoute><PageTransition><ApprovalsPage /></PageTransition></ProtectedRoute>} />
                  <Route path="/audit-logs" element={<ProtectedRoute><PageTransition><AuditLogsPage /></PageTransition></ProtectedRoute>} />
                  <Route path="/team" element={<ProtectedRoute><PageTransition><TeamPage /></PageTransition></ProtectedRoute>} />

                  {/* Resources */}
                  <Route path="/templates" element={<ProtectedRoute><PageTransition><TemplatesPage /></PageTransition></ProtectedRoute>} />
                  <Route path="/getting-started" element={<ProtectedRoute><PageTransition><GettingStartedPage /></PageTransition></ProtectedRoute>} />
                  <Route path="/knowledge-base" element={<ProtectedRoute><PageTransition><KnowledgeBasePage /></PageTransition></ProtectedRoute>} />
                  <Route path="/notifications" element={<ProtectedRoute><PageTransition><NotificationsPage /></PageTransition></ProtectedRoute>} />

                  {/* Settings & Admin */}
                  <Route path="/settings" element={<ProtectedRoute><PageTransition><SettingsPage /></PageTransition></ProtectedRoute>} />
                  <Route path="/admin" element={<ProtectedRoute><PageTransition><AdminDashboardPage /></PageTransition></ProtectedRoute>} />

                  {/* Info pages (public) */}
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                  <Route path="/changelog" element={<ChangelogPage />} />

                  {/* Catch-all */}
                  <Route path="*" element={<NotFoundPage />} />
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
