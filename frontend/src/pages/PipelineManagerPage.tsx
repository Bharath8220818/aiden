import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { usePipelineManager } from '@/features/pipelineManager/hooks/usePipelineManager';
import { PipelineTable } from '@/features/pipelineManager/components/PipelineTable';
import { RunHistoryPanel } from '@/features/pipelineManager/components/RunHistoryPanel';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Layers, Pause, Play } from 'lucide-react';

export const PipelineManagerPage: React.FC = () => {
  const {
    pipelines,
    allPipelines,
    fleetStats,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    selectedId,
    setSelectedId,
    detail,
    isDetailLoading,
    isRefetching,
    actionPending,
    runControl,
    isLoading,
  } = usePipelineManager();
  const { can } = useAuth();
  const { pipelineId } = useParams<{ pipelineId: string }>();
  const navigate = useNavigate();

  const selected = detail?.pipeline ?? null;

  // URL-driven selection: /pipelines/manage/:pipelineId selects that pipeline;
  // unknown ids fall back to the fleet default.
  useEffect(() => {
    if (!pipelineId || isLoading) return;
    const exists = allPipelines.some((p) => p.id === pipelineId);
    if (!exists) {
      navigate('/pipelines/manage', { replace: true });
    } else if (selectedId !== pipelineId) {
      setSelectedId(pipelineId);
    }
  }, [pipelineId, allPipelines, isLoading, selectedId, setSelectedId, navigate]);

  const handleSelectPipeline = (id: string) => {
    setSelectedId(id);
    navigate(`/pipelines/manage/${id}`);
  };

  return (
    <PageContainer
      title="Pipeline Manager"
      description="Operate the deployed fleet — run history, task graphs, logs, and control actions"
      fullWidth
      breadcrumbs={[
        { label: 'AIDEN' },
        { label: 'Operations' },
        { label: 'Pipeline Manager' },
      ]}
      actions={
        selected && (
          <div className="flex items-center gap-2">
            {can('pipelines.control') ? (
              selected.status === 'paused' ? (
                <Button_Resume onClick={() => runControl(selected.id, 'resume')} pending={Boolean(actionPending)} />
              ) : (
                <Button_Pause onClick={() => runControl(selected.id, 'pause')} pending={Boolean(actionPending)} />
              )
            ) : (
              <span className="text-[10px] font-mono text-text-muted border border-border rounded-md px-2.5 py-1.5">
                control requires lead role
              </span>
            )}
            <Badge variant={selected.cadence === 'continuous' ? 'ai' : 'info'} size="sm" dot pulse={selected.status === 'running'}>
              {selected.cadence.replace('_', ' ')}
            </Badge>
          </div>
        )
      }
    >
      {/* Fleet stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: fleetStats.total, color: 'text-text-primary' },
          { label: 'Running', value: fleetStats.running, color: 'text-indigo-600' },
          { label: 'Healthy', value: fleetStats.healthy, color: 'text-emerald-600' },
          { label: 'Degraded', value: fleetStats.degraded, color: 'text-amber-600' },
          { label: 'Paused', value: fleetStats.paused, color: 'text-text-secondary' },
          { label: 'Failed', value: fleetStats.failed, color: 'text-red-600' },
        ].map((s) => (
          <div key={s.label} className="p-3 rounded-lg bg-card border border-border text-center">
            <div className={cn('text-xl font-bold font-mono', s.color)}>{s.value}</div>
            <div className="text-[9px] uppercase text-text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Master-detail — min-h-0 lets inner panes scroll instead of clipping */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-320px)] min-h-[540px]">
        <div className="rounded-lg border border-border bg-card overflow-hidden flex flex-col min-h-0">
          <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 shrink-0">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-primary">Fleet</span>
            <span className="text-[10px] font-mono text-text-muted ml-auto">avg SLA {fleetStats.successRate}%</span>
          </div>
          <PipelineTable
            pipelines={pipelines}
            statusFilter={statusFilter}
            onStatusFilter={setStatusFilter}
            search={search}
            onSearch={setSearch}
            selectedId={selectedId}
            onSelect={handleSelectPipeline}
            isLoading={isLoading}
          />
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <RunHistoryPanel
            detail={detail}
            isLoading={isDetailLoading}
            isRefetching={isRefetching}
            actionPending={Boolean(actionPending)}
            onRetry={() => selectedId && runControl(selectedId, 'retry')}
            onTrigger={() => selectedId && runControl(selectedId, 'trigger')}
          />
        </div>
      </div>
    </PageContainer>
  );
};

function Button_Pause({ onClick, pending }: { onClick: () => void; pending: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={pending}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-card-hover border border-border text-text-primary hover:border-border-highlight disabled:opacity-50 transition-all"
    >
      <Pause className="w-3.5 h-3.5" />
      Pause
    </button>
  );
}

function Button_Resume({ onClick, pending }: { onClick: () => void; pending: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={pending}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-500/10 border border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/20 disabled:opacity-50 transition-all"
    >
      <Play className="w-3.5 h-3.5" />
      Resume
    </button>
  );
}

export default PipelineManagerPage;
