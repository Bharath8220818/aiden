import React from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { useOverviewData } from '@/features/overview/hooks/useOverviewData';
import { SystemHealth } from '@/features/overview/components/SystemHealth';
import { PipelineMetrics } from '@/features/overview/components/PipelineMetrics';
import { AIInsights } from '@/features/overview/components/AIInsights';
import { EngineeringLoop } from '@/features/overview/components/EngineeringLoop';
import { RecentActivity } from '@/features/overview/components/RecentActivity';
import { useAppStore } from '@/store/appStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { RefreshCw, Sparkles, AlertCircle, ArrowUpRight } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';

export const OverviewPage: React.FC = () => {
  const { currentUser } = useAppStore();
  const { currentWorkspace, currentEnvironment } = useWorkspaceStore();
  const { openAskAiden } = useUIStore();
  const { data, isLoading, isError, error, refetch, isFetching } = useOverviewData();

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
      title={`${getGreeting()}, ${currentUser.name}`}
      description={`${currentWorkspace.name} • ${currentEnvironment.charAt(0).toUpperCase() + currentEnvironment.slice(1)} environment`}
      actions={actions}
      breadcrumbs={[
        { label: 'AIDEN' },
        { label: 'Workspaces', path: '/overview' },
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
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
          <h3 className="text-base font-semibold text-white">
            Failed to load autonomous overview telemetry
          </h3>
          <p className="text-xs text-[#9CA3AF] max-w-md mx-auto">
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
        <div className="space-y-6">
          {/* 1. System Health (5 service cards) */}
          <SystemHealth services={data.healthServices} />

          {/* 2. Pipeline Metrics (4 cards: Running, Successful, Failed, Queued) */}
          <PipelineMetrics metrics={data.pipelineMetrics} />

          {/* 3. AI Insights (Autonomous detections & optimizations) */}
          <AIInsights insights={data.insights} />

          {/* 4. Closed-Loop Engineering Cycle Visualization */}
          <EngineeringLoop steps={data.engineeringCycle} />

          {/* 5. Recent Pipeline Activity */}
          <RecentActivity activities={data.recentActivities} />
        </div>
      )}
    </PageContainer>
  );
};
export default OverviewPage;
