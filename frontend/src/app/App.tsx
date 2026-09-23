import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { AppProviders, queryClient } from './providers';
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary';
import { connectLiveEvents, liveEvents$ } from '@/services/liveEvents';
import { REALTIME_STATUS_QUERY_KEY } from '@/services/realtimeStatus';
import { useWorkspaceStore } from '@/store/workspaceStore';

/** Inner component: runs inside AppProviders so it can touch the query cache. */
const AppInner: React.FC = () => {
  const hydrateWorkspaces = useWorkspaceStore((s) => s.hydrateWorkspaces);
  useEffect(() => {
    const dispose = connectLiveEvents();
    // Reflect transport health into the query cache for other surfaces
    const sub = liveEvents$.subscribe(() => {
      queryClient.setQueryData(REALTIME_STATUS_QUERY_KEY, { isConnected: true, lastEventAt: new Date().getTime() });
    });
    // Real workspace context: the topbar selector and every workspace-scoped
    // query need backend IDs, not the placeholder constants.
    void hydrateWorkspaces();
    return () => {
      sub.unsubscribe();
      dispose();
    };
    // queryClient is a stable module-level singleton from providers.tsx
  }, [hydrateWorkspaces]);

  return (
    <>
      <RouterProvider router={router} />
    </>
  );
};

/**
 * App root: global error containment, providers, router, realtime layer.
 * Auth gating lives in the router (ProtectedRoute + permission guards).
 */
export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppProviders>
        <AppInner />
      </AppProviders>
    </ErrorBoundary>
  );
};

export default App;
