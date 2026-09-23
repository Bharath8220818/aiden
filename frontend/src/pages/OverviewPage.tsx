import React from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { useOverviewData } from '@/features/overview/hooks/useOverviewData';
import { SystemHealth } from '@/features/overview/components/SystemHealth';
import { PipelineMetrics } from '@/features/overview/components/PipelineMetrics';
import { AIInsights } from '@/features/overview/components/AIInsights';
import { EngineeringLoop } from '@/features/overview/components/EngineeringLoop';
import { RecentActivity } from '@/features/overview/components/RecentActivity';
import { useStaggerReveal } from '@/hooks/useScrollReveal';
import { useAppStore } from '@/store/appStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { RefreshCw, Sparkles, AlertCircle, ArrowUpRight } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';

export const OverviewPage: React.FC = () => {
  const { currentUser } = useAppStore();
  const { user: authUser } = useAuth();
  const { currentWorkspace, currentEnvironment } = useWorkspaceStore();
  const displayName = authUser?.name ?? currentUser.name;
  const { openAskAiden } = useUIStore();
  const { data, isLoading, isError, error, refetch, isFetching } = useOverviewData();
  // Sections cascade in as they scroll into view. Re-attach once the async
  // overview data resolves and the reveal container actually mounts.
  const sectionsRef = useStaggerReveal<HTMLDivElement>(60, [Boolean(data)]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const actions = (
    <div className="flex items-center gap-2.5">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => refetch()}
        isLoading={isFetching}
        leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />}
      >
        Sync Telemetry
      </Button>

      <Button
        variant="ai"
        size="sm"
        onClick={openAskAiden}
        leftIcon={<Sparkles className="w-3.5 h-3.5" />}
        rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
      >
        Ask AIDEN
      </Button>
    </div>
  );

  return (
    <PageContainer
      title={`${getGreeting()}, ${displayName}`}
      description={`${currentWorkspace.name} • ${currentEnvironment.charAt(0).toUpperCase() + currentEnvironment.slice(1)} environment`}
      actions={actions}
      breadcrumbs={[
        { label: 'AIDEN' },
        { label: 'Workspaces', path: '/dashboard' },
        { label: 'Overview' },
      ]}
    >
      {/* Loading state */}
      {isLoading && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-56 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="p-6 rounded-xl border border-red-500/30 bg-red-500/10 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
          <h3 className="text-base font-semibold text-red-600 dark:text-red-400">
            Failed to load autonomous overview telemetry
          </h3>
          <p className="text-xs text-text-secondary max-w-md mx-auto">
            {error?.message || 'Unable to connect to AIDEN platform API service.'}
          </p>
          <Button size="sm" variant="secondary" onClick={() => refetch()}>
            Retry Connection
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && !data && (
        <EmptyState
          title="No telemetry signals received"
          description="AIDEN has not recorded any pipeline executions or health probes for this environment yet."
          actionLabel="Trigger Health Scan"
          onAction={() => refetch()}
        />
      )}

      {/* Normal Rendered Content */}
      {!isLoading && !isError && data && (
        <div ref={sectionsRef} className="space-y-6">
          {/* 1. System Health (5 service cards) */}
          <div className="reveal"><SystemHealth services={data.healthServices} /></div>

          {/* 2. Pipeline Metrics (4 cards: Running, Successful, Failed, Queued) */}
          <div className="reveal"><PipelineMetrics metrics={data.pipelineMetrics} /></div>

          {/* 3. AI Insights (Autonomous detections & optimizations) */}
          <div className="reveal"><AIInsights insights={data.insights} /></div>

          {/* 4. Closed-Loop Engineering Cycle Visualization */}
          <div className="reveal"><EngineeringLoop steps={data.engineeringCycle} /></div>

          {/* 5. Recent Pipeline Activity */}
          <div className="reveal"><RecentActivity activities={data.recentActivities} /></div>
        </div>
      )}
    </PageContainer>
  );
};
export default OverviewPage;
