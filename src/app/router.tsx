import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import OverviewPage from '@/pages/OverviewPage';
import RequirementsPage from '@/pages/RequirementsPage';
import ArchitecturePage from '@/pages/ArchitecturePage';
import PipelinesPage from '@/pages/PipelinesPage';
import SQLPage from '@/pages/SQLPage';
import ConnectionsPage from '@/pages/ConnectionsPage';
import MonitoringPage from '@/pages/MonitoringPage';
import IncidentsPage from '@/pages/IncidentsPage';
import SelfHealingPage from '@/pages/SelfHealingPage';
import AgentsPage from '@/pages/AgentsPage';
import KnowledgePage from '@/pages/KnowledgePage';
import IntegrationsPage from '@/pages/IntegrationsPage';
import ApprovalsPage from '@/pages/ApprovalsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <Navigate to="/overview" replace />,
      },
      {
        path: 'overview',
        element: <OverviewPage />,
      },
      {
        path: 'requirements',
        element: <RequirementsPage />,
      },
      {
        path: 'architecture',
        element: <ArchitecturePage />,
      },
      {
        path: 'pipelines',
        element: <PipelinesPage />,
      },
      {
        path: 'sql',
        element: <SQLPage />,
      },
      {
        path: 'connections',
        element: <ConnectionsPage />,
      },
      {
        path: 'monitoring',
        element: <MonitoringPage />,
      },
      {
        path: 'incidents',
        element: <IncidentsPage />,
      },
      {
        path: 'self-healing',
        element: <SelfHealingPage />,
      },
      {
        path: 'agents',
        element: <AgentsPage />,
      },
      {
        path: 'knowledge',
        element: <KnowledgePage />,
      },
      {
        path: 'integrations',
        element: <IntegrationsPage />,
      },
      {
        path: 'approvals',
        element: <ApprovalsPage />,
      },
      {
        path: '*',
        element: <Navigate to="/overview" replace />,
      },
    ],
  },
]);
