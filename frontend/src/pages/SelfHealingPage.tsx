import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useSelfHealing } from '@/features/self-healing/hooks/useSelfHealing';
import { IncidentList } from '@/features/self-healing/components/IncidentList';
import { HealingTimeline } from '@/features/self-healing/components/HealingTimeline';
import { CodeDiffViewer, RootCauseCard, BlastRadius } from '@/features/self-healing/components/CodeDiffViewer';
import { SandboxPanel } from '@/features/self-healing/components/SandboxPanel';
import { ApprovalCard } from '@/features/self-healing/components/ApprovalCard';
import { cn } from '@/lib/utils';
import {
  Cpu,
  Bot,
  Radar,
  Crosshair,
  Wand2,
  UserCheck,
  Sparkles,
  GraduationCap,
} from 'lucide-react';

export const SelfHealingPage: React.FC = () => {
  const {
    incidents,
    stats,
    selectedIncident,
    selectedIncidentId,
    selectIncident,
    diagnosis,
    isDiagnosing,
    runDiagnosis,
    fix,
    isGeneratingFix,
    runFixGeneration,
    sandbox,
    isSandboxRunning,
    runSandbox,
    healingRun,
    isAdvancing,
    approveAndDeploy,
    dismissIncident,
    nextStageAction,
    isLoading,
  } = useSelfHealing();

  // URL-driven selection: /self-healing/:incidentId selects (and resets the
  // healing workflow for) that incident; unknown ids fall back to the list.
  const { incidentId } = useParams<{ incidentId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!incidentId || isLoading) return;
    const exists = incidents.some((i) => i.id === incidentId);
    if (!exists) {
      navigate('/self-healing', { replace: true });
    } else if (selectedIncidentId !== incidentId) {
      selectIncident(incidentId);
    }
  }, [incidentId, incidents, isLoading, selectedIncidentId, selectIncident, navigate]);

  const handleSelectIncident = (id: string) => {
    selectIncident(id);
    navigate(`/self-healing/${id}`);
  };

  const handleNextStage = () => {
    switch (nextStageAction.action) {
      case 'investigate':
        runDiagnosis();
        break;
      case 'generate_fix':
        runFixGeneration();
        break;
      case 'sandbox':
        runSandbox();
        break;
      case 'deploy':
        approveAndDeploy();
        break;
      default:
        break;
    }
  };

  const isBusy = isDiagnosing || isGeneratingFix || isSandboxRunning || isAdvancing;

  return (
    <PageContainer
      title="AI Self-Healing Engine"
      description="Failure → Detect → Diagnose → Root Cause → Fix → Sandbox → Approval → Deploy → Learn"
      fullWidth
      breadcrumbs={[
        { label: 'AIDEN' },
        { label: 'Intelligence' },
        { label: 'AI Self-Healing' },
      ]}
      actions={
        <div className="flex items-center gap-2">
          <Badge variant="ai" size="sm" dot pulse>
            <Bot className="w-3 h-3 mr-1" />
            Autonomy: approval-required
          </Badge>
          <Button
            variant="ai"
            size="sm"
            onClick={handleNextStage}
            isLoading={isBusy}
            disabled={!nextStageAction.enabled}
            leftIcon={<Sparkles className="w-3.5 h-3.5" />}
            className="text-xs shadow-ai-glow"
          >
            {nextStageAction.label}
          </Button>
        </div>
      }
    >
      {/* Stats strip */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {[
          { label: 'Open incidents', value: stats.open, color: 'text-red-600' },
          { label: 'Critical', value: stats.critical, color: 'text-red-600' },
          { label: 'In healing', value: stats.healing, color: 'text-indigo-600' },
          { label: 'Avg MTTR', value: `${stats.avgMttr}m`, color: 'text-amber-600' },
          { label: 'Auto-resolved', value: stats.autoResolved, color: 'text-emerald-600' },
        ].map((s) => (
          <div key={s.label} className="p-3 rounded-lg bg-card border border-border text-center">
            <div className={cn('text-xl font-bold font-mono', s.color)}>{s.value}</div>
            <div className="text-[9px] uppercase text-text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Master-detail layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-4">
        {/* Incident rail */}
        <div className="rounded-lg border border-border bg-card overflow-hidden flex flex-col max-h-[760px]">
          <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 shrink-0">
            <Radar className="w-4 h-4 text-amber-600" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-primary">Incidents</span>
            <Badge variant="error" size="sm" className="ml-auto">{stats.open} open</Badge>
          </div>
          <IncidentList
            incidents={incidents}
            selectedId={selectedIncidentId}
            onSelect={handleSelectIncident}
            isLoading={isLoading}
          />
        </div>

        {/* Healing workspace */}
        <div className="space-y-4 min-w-0">
          {/* Selected incident header + loop */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Badge
                    variant={
                      selectedIncident?.severity === 'critical'
                        ? 'error'
                        : selectedIncident?.severity === 'high'
                        ? 'warning'
                        : 'info'
                    }
                    size="sm"
                    dot
                    pulse={selectedIncident?.status !== 'resolved'}
                  >
                    {selectedIncident?.severity}
                  </Badge>
                  <span className="text-sm font-bold text-text-primary font-mono">{selectedIncident?.pipelineName}</span>
                </div>
                <p className="text-xs text-text-primary font-semibold">{selectedIncident?.title}</p>
                <p className="text-[11px] text-text-secondary font-mono mt-1 leading-relaxed">{selectedIncident?.errorMessage}</p>
              </div>
              {selectedIncident && selectedIncident.status !== 'resolved' && selectedIncident.status !== 'dismissed' && (
                <Button variant="ghost" size="sm" onClick={dismissIncident} className="text-[10px] shrink-0">
                  Dismiss
                </Button>
              )}
            </div>

            {/* Closed-loop track */}
            <div className="pt-2 border-t border-border">
              <HealingTimeline run={healingRun} />
            </div>
          </div>

          {/* Root cause + agents */}
          {diagnosis && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-3">
                <RootCauseCard cause={diagnosis.rootCause} />
                <BlastRadius
                  downstream={diagnosis.blastRadius.downstreamPipelines}
                  dashboards={diagnosis.blastRadius.dashboardsAffected}
                  staleMinutes={diagnosis.blastRadius.estimatedStaleDataMinutes}
                />
              </div>

              {/* Agent investigation steps */}
              <div className="p-4 rounded-lg bg-card border border-border space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Crosshair className="w-4 h-4 text-indigo-600" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-text-primary">Agent Investigation</span>
                </div>
                {diagnosis.steps.map((step) => (
                  <div key={step.id} className="p-2.5 rounded-md bg-card border border-border-subtle space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600">
                        <Bot className="w-3 h-3" />
                        {step.agent}
                      </span>
                      <span className="text-[9px] font-mono text-text-muted">{step.durationMs} ms</span>
                    </div>
                    <p className="text-[10px] text-text-primary">{step.action}</p>
                    <p className="text-[10px] text-text-secondary leading-snug">{step.finding}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fix + sandbox + approval */}
          {fix && (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-purple-600" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-text-primary">
                    Proposed Fix — {fix.strategyLabel}
                  </span>
                </div>
                <CodeDiffViewer patches={fix.patches} />
              </div>

              <div className="space-y-3">
                <SandboxPanel
                  sandbox={sandbox}
                  isRunning={isSandboxRunning}
                  fix={fix}
                  onRun={runSandbox}
                  disabled={!fix}
                />
                <ApprovalCard
                  fix={fix}
                  sandbox={sandbox}
                  isDeploying={isAdvancing}
                  onApprove={approveAndDeploy}
                  onReject={dismissIncident}
                />

                {healingRun?.stage === 'learned' && (
                  <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/40 flex items-start gap-2.5">
                    <GraduationCap className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-[11px] font-bold text-emerald-600">Loop closed — knowledge captured</div>
                      <p className="text-[10px] text-text-secondary mt-0.5">
                        This failure pattern is now in the knowledge base. Similar signatures will be auto-healed faster next time.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!diagnosis && !fix && !isBusy && (
            <div className="p-6 rounded-lg border border-dashed border-border-highlight text-center">
              <Cpu className="w-6 h-6 text-text-muted mx-auto mb-2" />
              <p className="text-xs font-semibold text-text-primary">Ready to heal</p>
              <p className="text-[11px] text-text-secondary mt-1 max-w-md mx-auto">
                Click “Run root-cause analysis” and AIDEN’s agents will investigate, synthesize a patch, verify it in a sandbox, and ask for your approval before touching production.
              </p>
              <div className="flex items-center justify-center gap-2 mt-3 text-[9px] font-mono text-text-muted">
                <UserCheck className="w-3 h-3" />
                human-in-the-loop · full audit trail · auto-rollback on regression
              </div>
            </div>
          )}
        </div>
      </div>

    </PageContainer>
  );
};

export default SelfHealingPage;
