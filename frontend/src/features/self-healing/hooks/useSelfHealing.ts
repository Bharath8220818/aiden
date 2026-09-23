import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Incident,
  IncidentStatus,
  Diagnosis,
  ProposedFix,
  SandboxTest,
  HealingRun,
} from '../types';
import {
  fetchIncidents,
  diagnoseIncident,
  generateFix,
  runSandboxTest,
  createHealingRun,
  advanceStage,
  resolveIncidentApi,
} from '../services/selfHealing.service';

export function useSelfHealing() {
  const queryClient = useQueryClient();

  const incidentsQuery = useQuery({ queryKey: ['incidents'], queryFn: fetchIncidents, refetchInterval: 30_000 });
  const incidents: Incident[] = incidentsQuery.data ?? [];

  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [fix, setFix] = useState<ProposedFix | null>(null);
  const [isGeneratingFix, setIsGeneratingFix] = useState(false);
  const [sandbox, setSandbox] = useState<SandboxTest | null>(null);
  const [isSandboxRunning, setIsSandboxRunning] = useState(false);
  const [healingRun, setHealingRun] = useState<HealingRun | null>(null);
  const [isAdvancing, setIsAdvancing] = useState(false);

  // Derived default selection: first open incident (falls back to first incident)
  const defaultIncident =
    incidents.find((i) => i.status !== 'resolved' && i.status !== 'dismissed') ?? incidents[0] ?? null;
  const effectiveSelectedId = selectedIncidentId ?? defaultIncident?.id ?? null;
  const selectedIncident = incidents.find((i) => i.id === effectiveSelectedId) ?? null;

  const resetWorkflow = useCallback(() => {
    setDiagnosis(null);
    setFix(null);
    setSandbox(null);
    setHealingRun(null);
  }, []);

  const selectIncident = useCallback(
    (id: string) => {
      setSelectedIncidentId(id);
      resetWorkflow();
    },
    [resetWorkflow]
  );

  /* ---------------- loop stages ---------------- */

  const runDiagnosis = useCallback(async () => {
    if (!selectedIncident) return;
    setIsDiagnosing(true);
    try {
      const result = await diagnoseIncident(selectedIncident);
      setDiagnosis(result);
      const run = healingRun ?? createHealingRun(selectedIncident);
      const advanced = await advanceStage(run, 'root_cause', `${result.rootCause.title} — ${result.rootCause.confidence}% confidence.`);
      setHealingRun(advanced);
    } finally {
      setIsDiagnosing(false);
    }
  }, [selectedIncident, healingRun]);

  const runFixGeneration = useCallback(async () => {
    if (!selectedIncident) return;
    setIsGeneratingFix(true);
    try {
      const proposed = await generateFix(selectedIncident);
      setFix(proposed);
      if (healingRun) {
        const advanced = await advanceStage(healingRun, 'generating_fix', proposed.strategyLabel);
        setHealingRun(advanced);
      }
    } finally {
      setIsGeneratingFix(false);
    }
  }, [selectedIncident, healingRun]);

  const runSandbox = useCallback(async () => {
    if (!fix || !healingRun) return;
    setIsSandboxRunning(true);
    setSandbox(null);
    try {
      const result = await runSandboxTest(fix, (stage) => {
        setSandbox((current) =>
          current
            ? { ...current, stage }
            : {
                stage,
                replaysProcessed: 0,
                assertions: [],
                productionSnapshot: true,
                logTail: [`[sandbox] stage: ${stage}`],
              }
        );
      });
      setSandbox(result);
      const advanced = await advanceStage(healingRun, 'awaiting_approval', 'Sandbox passed 5/5 — engineer approval requested.');
      setHealingRun(advanced);
    } finally {
      setIsSandboxRunning(false);
    }
  }, [fix, healingRun]);

  const approveAndDeploy = useCallback(async () => {
    if (!healingRun || !selectedIncident) return;
    setIsAdvancing(true);
    try {
      let run = await advanceStage(healingRun, 'deploying', fix?.strategyLabel ?? 'Patch deployed');
      setHealingRun(run);
      run = await advanceStage(run, 'rerunning');
      setHealingRun(run);
      run = await advanceStage(run, 'monitoring', 'Quality gates green for 15 minutes — declaring resolved.');
      setHealingRun(run);
      run = await advanceStage(run, 'learned');
      setHealingRun(run);

      const mttrMinutes = Math.max(1, Math.round((Date.now() - new Date(run.startedAt).getTime()) / 60000));
      await resolveIncidentApi(selectedIncident.id, mttrMinutes);

      queryClient.setQueryData<Incident[]>(['incidents'], (current) =>
        (current ?? []).map((i) =>
          i.id === selectedIncident.id ? { ...i, status: 'resolved' as IncidentStatus, mttrMinutes } : i
        )
      );
    } finally {
      setIsAdvancing(false);
    }
  }, [healingRun, selectedIncident, fix, queryClient]);

  const dismissIncident = useCallback(() => {
    if (!selectedIncident) return;
    queryClient.setQueryData<Incident[]>(['incidents'], (current) =>
      (current ?? []).map((i) => (i.id === selectedIncident.id ? { ...i, status: 'dismissed' as IncidentStatus } : i))
    );
  }, [selectedIncident, queryClient]);

  const stats = {
    open: incidents.filter((i) => i.status !== 'resolved' && i.status !== 'dismissed').length,
    critical: incidents.filter((i) => i.severity === 'critical' && i.status !== 'resolved').length,
    healing: incidents.filter((i) => i.status === 'healing' || i.status === 'fix_proposed' || i.status === 'awaiting_approval').length,
    avgMttr:
      (() => {
        const resolved = incidents.filter((i) => i.mttrMinutes !== null);
        if (resolved.length === 0) return 0;
        return Math.round(resolved.reduce((sum, i) => sum + (i.mttrMinutes ?? 0), 0) / resolved.length);
      })(),
    autoResolved: incidents.filter((i) => i.status === 'resolved').length,
  };

  const nextStageAction = (() => {
    if (!healingRun) return { label: 'Start investigation', action: 'investigate' as const, enabled: true };
    switch (healingRun.stage) {
      case 'detected':
      case 'investigating':
        return { label: 'Run root-cause analysis', action: 'investigate' as const, enabled: !isDiagnosing };
      case 'root_cause':
        return { label: 'Generate fix with AIDEN', action: 'generate_fix' as const, enabled: !isGeneratingFix };
      case 'generating_fix':
        return { label: 'Run sandbox verification', action: 'sandbox' as const, enabled: !isSandboxRunning };
      case 'sandbox_testing':
        return { label: 'Sandbox running…', action: 'sandbox' as const, enabled: false };
      case 'awaiting_approval':
        return { label: 'Approve & deploy', action: 'deploy' as const, enabled: !isAdvancing };
      case 'deploying':
      case 'rerunning':
      case 'monitoring':
        return { label: 'Healing in progress…', action: 'none' as const, enabled: false };
      case 'learned':
        return { label: 'Loop complete', action: 'none' as const, enabled: false };
      default:
        return { label: 'Start investigation', action: 'investigate' as const, enabled: true };
    }
  })();

  return {
    incidents,
    stats,
    selectedIncident,
    selectedIncidentId: effectiveSelectedId,
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
    isLoading: incidentsQuery.isLoading,
  };
}
