import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/features/auth/components/RouteGuards';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { AuthenticatedLayout } from '@/features/auth/components/AuthenticatedLayout';
import { Permission } from '@/features/auth/permissions';
import LoginPage from '@/features/auth/components/LoginPage';
import NotFoundPage from '@/pages/NotFoundPage';
import { RouteErrorElement } from '@/app/RouteErrorElement';

/* Code-split page bundles — each route is a dynamic import */
const OverviewPage = lazy(() => import('@/pages/OverviewPage'));
const ProjectsPage = lazy(() => import('@/pages/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('@/pages/ProjectDetailPage'));
const ArchitecturePage = lazy(() => import('@/pages/ArchitecturePage'));
const PipelinesPage = lazy(() => import('@/pages/PipelinesPage'));
const PipelineManagerPage = lazy(() => import('@/pages/PipelineManagerPage'));
const SQLPage = lazy(() => import('@/pages/SQLPage'));
const ConnectionsPage = lazy(() => import('@/pages/ConnectionsPage'));
const MonitoringPage = lazy(() => import('@/pages/MonitoringPage'));
const IncidentsPage = lazy(() => import('@/pages/IncidentsPage'));
const SelfHealingPage = lazy(() => import('@/pages/SelfHealingPage'));
const AgentsPage = lazy(() => import('@/pages/AgentsPage'));
const KnowledgePage = lazy(() => import('@/pages/KnowledgePage'));
const IntegrationsPage = lazy(() => import('@/pages/IntegrationsPage'));
const ApprovalsPage = lazy(() => import('@/pages/ApprovalsPage'));
const GovernancePage = lazy(() => import('@/pages/GovernancePage'));
const TeamPage = lazy(() => import('@/pages/TeamPage'));
const WorkspacePage = lazy(() => import('@/pages/WorkspacePage'));
const LandingPage = lazy(() => import('@/pages/LandingPage'));

/**
 * `/` is dual-faced: the public landing page for signed-out visitors and the
 * authenticated app shell for signed-in users. Children keep their guards.
 */
const LandingOrShell: React.FC = () => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <AppShell /> : <LandingPage />;
};

/** Route-level fallback skeleton shown while a page chunk loads. */
const RouteFallback: React.FC = () => (
  <div className="p-6 space-y-6" aria-busy="true" aria-label="Loading page">
    <div className="space-y-2">
      <div className="h-7 w-64 rounded-md bg-card animate-pulse" />
      <div className="h-4 w-80 rounded-md bg-card animate-pulse" />
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-24 rounded-lg bg-card animate-pulse" />
      ))}
    </div>
    <div className="h-64 rounded-lg bg-card animate-pulse" />
  </div>
);

/**
 * Route → minimum permission map. Reads stay open to every signed-in role;
 * write/operate surfaces are gated per the RBAC matrix.
 */
const routePermissions: Record<string, Permission | undefined> = {
  dashboard: undefined,
  projects: undefined,
  requirements: 'requirements.read',
  architecture: 'architecture.read',
  pipelines: 'pipelines.read',
  'pipelines/manage': 'pipelines.read',
  sql: 'sql.read',
  connections: 'connections.read',
  monitoring: 'monitoring.read',
  incidents: 'incidents.read',
  'self-healing': 'incidents.read',
  agents: 'agents.read',
  knowledge: 'knowledge.read',
  integrations: 'connections.read',
  approvals: 'approvals.read',
  governance: 'approvals.read',
  team: 'team.manage',
};

function guarded(path: string, element: ReactNode) {
  const permission = routePermissions[path];
  if (!permission) {
    return { path, element };
  }
  return {
    path,
    element: <AuthenticatedLayout requiredPermission={permission} />,
    children: [{ index: true, element }],
  };
}

/** Detail route guarded by the same permission as its section root. */
function guardedDetail(section: string, path: string, element: ReactNode) {
  const permission = routePermissions[section];
  if (!permission) {
    return { path, element };
  }
  return {
    path,
    element: <AuthenticatedLayout requiredPermission={permission} />,
    children: [{ index: true, element }],
  };
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    // Anonymous visitors get the public marketing landing; authenticated
    // users get the full app shell with its routes (ProtectedRoute keeps
    // guarding the nested children).
    element: (
      <Suspense fallback={<RouteFallback />}>
        <LandingOrShell />
      </Suspense>
    ),
    children: [
      {
        // Route-level crash fallback (replaces React Router's dev-only
        // "Unexpected Application Error!" screen with app chrome + recovery).
        errorElement: <RouteErrorElement />,
        element: <ProtectedRoute />,
        children: [
          {
            index: true,
            element: <Navigate to="/dashboard" replace />,
          },
          // Legacy /overview alias → redirect to /dashboard
          {
            path: 'overview',
            element: <Navigate to="/dashboard" replace />,
          },
          // Dashboard (was /overview)
          guarded('dashboard', <OverviewPage />),

          // Command Workspace — the chat-driven single-page mode (no extra
          // permission gate: reads open to every signed-in role)
          guarded('workspace', <WorkspacePage />),

          // Projects
          guarded('projects', <ProjectsPage />),
          {
            path: 'projects/:projectId',
            element: <ProjectDetailPage />,
          },

          // Engineering workflow (single-draft studios — no persisted :id detail views yet)
          // /requirements removed — the Command Workspace (/workspace) IS the
          // requirement-capture surface now (same intent flow, plus artifacts).
          { path: 'requirements', element: <Navigate to="/workspace" replace /> },
          guarded('architecture', <ArchitecturePage />),
          guarded('pipelines', <PipelinesPage />),
          guarded('pipelines/manage', <PipelineManagerPage />),
          guardedDetail('pipelines/manage', 'pipelines/manage/:pipelineId', <PipelineManagerPage />),

          // Data
          guarded('sql', <SQLPage />),
          guarded('connections', <ConnectionsPage />),

          // Operations
          guarded('monitoring', <MonitoringPage />),
          guarded('incidents', <IncidentsPage />),
          guardedDetail('incidents', 'incidents/:incidentId', <IncidentsPage />),
          guarded('self-healing', <SelfHealingPage />),
          guardedDetail('self-healing', 'self-healing/:incidentId', <SelfHealingPage />),

          // Intelligence
          guarded('agents', <AgentsPage />),
          guardedDetail('agents', 'agents/:agentId', <AgentsPage />),
          guarded('knowledge', <KnowledgePage />),
          guarded('integrations', <IntegrationsPage />),

          // Governance
          guarded('approvals', <ApprovalsPage />),
          guarded('governance', <GovernancePage />),
          guarded('team', <TeamPage />),

          {
            path: '*',
            element: <NotFoundPage />,
          },
        ],
      },
    ],
  },
]);
