import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { REALTIME_STATUS_QUERY_KEY } from '@/services/realtimeStatus';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 10000,
    },
  },
});

// Seed the realtime status so topbar/badges read a defined state before the first event
queryClient.setQueryData(REALTIME_STATUS_QUERY_KEY, { isConnected: false, lastEventAt: null });

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};
