import { useCallback, useMemo, useState } from 'react';
import {
  PipelineConfig,
  GeneratedFile,
  CodeTarget,
  CodeValidationReport,
  DeploymentRun,
  PipelineSpecSummary,
} from '../types';
import {
  createInitialDeploymentRun,
  generatePipelineCode,
  runDeploymentSimulation,
  validatePipelineConfig,
} from '../services/pipeline.service';
import { DEFAULT_PIPELINE_CONFIG } from '../mockData';
import { useHandoffStore } from '@/store/handoffStore';

export function usePipelineBuilder() {
  const architectureGraph = useHandoffStore((s) => s.architectureGraph);

  const [config, setConfig] = useState<PipelineConfig>(DEFAULT_PIPELINE_CONFIG);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [activeFileTarget, setActiveFileTarget] = useState<CodeTarget>('pyspark');
  const [validation, setValidation] = useState<CodeValidationReport | null>(null);
  const [deployment, setDeployment] = useState<DeploymentRun>(createInitialDeploymentRun());
  const [isDeploying, setIsDeploying] = useState(false);

  /* ---------------- spec summary from architecture handoff ---------------- */
  const specSummary: PipelineSpecSummary = useMemo(() => {
    if (architectureGraph) {
      return {
        nodeCount: architectureGraph.nodeCount,
        edgeCount: architectureGraph.edgeCount,
        sources: architectureGraph.sources,
        sinks: architectureGraph.sinks,
        hasQualityGate: architectureGraph.nodes.some((n) => n.kind === 'quality'),
      };
    }
    // Default spec mirrors the built-in Orders CDC blueprint
    return {
      nodeCount: 7,
      edgeCount: 7,
      sources: ['PostgreSQL 15 — ecommerce.orders'],
      sinks: ['Snowflake Enterprise — ANALYTICS_PROD.MART_ORDERS'],
      hasQualityGate: true,
    };
  }, [architectureGraph]);

  /* ---------------- configuration updates ---------------- */
  const updateConfig = useCallback((patch: Partial<PipelineConfig>) => {
    setConfig((current) => ({ ...current, ...patch }));
  }, []);

  const updateRetryPolicy = useCallback((patch: Partial<PipelineConfig['retryPolicy']>) => {
    setConfig((current) => ({
      ...current,
      retryPolicy: { ...current.retryPolicy, ...patch },
    }));
  }, []);

  /* ---------------- generation + validation ---------------- */
  const generateCode = useCallback(async () => {
    setIsGenerating(true);
    try {
      const files = await generatePipelineCode(config, specSummary);
      setGeneratedFiles(files);
      setHasGenerated(true);
      setActiveFileTarget('pyspark');
      setValidation(validatePipelineConfig(config, specSummary.hasQualityGate));
    } finally {
      setIsGenerating(false);
    }
  }, [config, specSummary]);

  const validateConfig = useCallback(() => {
    const report = validatePipelineConfig(config, specSummary.hasQualityGate);
    setValidation(report);
    return report;
  }, [config, specSummary]);

  /* ---------------- deployment ---------------- */
  const deployPipeline = useCallback(async () => {
    if (isDeploying) return;
    setIsDeploying(true);
    try {
      await runDeploymentSimulation(config.pipelineName, (run) => setDeployment(run));
    } finally {
      setIsDeploying(false);
    }
  }, [config.pipelineName, isDeploying]);

  const resetDeployment = useCallback(() => {
    setDeployment(createInitialDeploymentRun());
  }, []);

  const activeFile = useMemo(
    () => generatedFiles.find((f) => f.target === activeFileTarget) ?? generatedFiles[0] ?? null,
    [generatedFiles, activeFileTarget]
  );

  return {
    architectureGraph,
    specSummary,
    config,
    updateConfig,
    updateRetryPolicy,
    generatedFiles,
    activeFile,
    activeFileTarget,
    setActiveFileTarget,
    isGenerating,
    hasGenerated,
    generateCode,
    validation,
    validateConfig,
    deployment,
    isDeploying,
    deployPipeline,
    resetDeployment,
  };
}
