import React, { useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { usePipelineBuilder } from '@/features/pipelines/hooks/usePipelineBuilder';
import { PipelineConfigForm } from '@/features/pipelines/components/PipelineConfigForm';
import { GeneratedCodePanel } from '@/features/pipelines/components/GeneratedCodePanel';
import { ValidationReportPanel } from '@/features/pipelines/components/ValidationReportPanel';
import { DeploymentPanel } from '@/features/pipelines/components/DeploymentPanel';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Network,
  Layers,
  ShieldCheck,
  Database,
  ArrowLeft,
} from 'lucide-react';

export const PipelinesPage: React.FC = () => {
  const {
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
    deployment,
    isDeploying,
    deployPipeline,
    resetDeployment,
  } = usePipelineBuilder();

  const [handoffAck, setHandoffAck] = useState(false);
  const navigate = useNavigate();

  return (
    <PageContainer
      title="Pipeline Builder"
      description="Autonomous code generation — PySpark, SQL MERGE, Airflow DAGs, Kafka configs, and unit tests from your architecture blueprint"
      fullWidth
      breadcrumbs={[
        { label: 'AIDEN' },
        { label: 'Pipelines' },
      ]}
      actions={
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />} onClick={() => navigate('/architecture')} className="text-xs">
            Back to Studio
          </Button>
          <Button
            variant="ai"
            size="sm"
            leftIcon={<Sparkles className="w-3.5 h-3.5" />}
            onClick={generateCode}
            isLoading={isGenerating}
            className="text-xs shadow-ai-glow"
          >
            {isGenerating ? 'Generating…' : 'Generate Pipeline Code'}
          </Button>
        </div>
      }
    >
      {/* Architecture handoff banner */}
      {architectureGraph && !handoffAck ? (
        <Card className="p-4 bg-indigo-500/5 border-indigo-500/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 shrink-0">
                <Network className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-bold text-text-primary">{architectureGraph.name}</span>
                  <Badge variant="ai" size="sm">Handoff received</Badge>
                  <Badge variant={architectureGraph.validationPassed ? 'success' : 'warning'} size="sm" dot>
                    {architectureGraph.validationPassed ? 'Blueprint valid' : 'Blueprint has warnings'}
                  </Badge>
                </div>
                <p className="text-[11px] text-text-secondary">
                  {architectureGraph.nodeCount} nodes · {architectureGraph.edgeCount} connections ·{' '}
                  {architectureGraph.sources.join(', ') || 'no sources'} → {architectureGraph.sinks.join(', ') || 'no sinks'}
                </p>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setHandoffAck(true)} className="text-xs shrink-0">
              Continue with this blueprint
            </Button>
          </div>
        </Card>
      ) : null}

      {/* Spec summary chips */}
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-text-secondary">
        <span className="px-2.5 py-1 rounded bg-card border border-border flex items-center gap-1.5">
          <Layers className="w-3 h-3 text-indigo-600" /> {specSummary.nodeCount} nodes
        </span>
        <span className="px-2.5 py-1 rounded bg-card border border-border flex items-center gap-1.5">
          <ArrowRight className="w-3 h-3 text-cyan-600" /> {specSummary.edgeCount} connections
        </span>
        <span className="px-2.5 py-1 rounded bg-card border border-border flex items-center gap-1.5">
          <Database className="w-3 h-3 text-emerald-600" /> {specSummary.sources[0] ?? '—'}
        </span>
        <span className="px-2.5 py-1 rounded bg-card border border-border flex items-center gap-1.5">
          <Database className="w-3 h-3 text-blue-600" /> {specSummary.sinks[0] ?? '—'}
        </span>
        <span className="px-2.5 py-1 rounded bg-card border border-border flex items-center gap-1.5">
          <ShieldCheck className={specSummary.hasQualityGate ? 'w-3 h-3 text-violet-600' : 'w-3 h-3 text-text-muted'} />
          Quality gate {specSummary.hasQualityGate ? 'present' : 'missing'}
        </span>
      </div>

      {/* Main builder grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left: configuration */}
        <div className="xl:col-span-7 space-y-6">
          <PipelineConfigForm
            config={config}
            onUpdate={updateConfig}
            onUpdateRetryPolicy={updateRetryPolicy}
          />
          <ValidationReportPanel report={validation} />
        </div>

        {/* Right: deployment */}
        <div className="xl:col-span-5 space-y-6">
          <DeploymentPanel
            deployment={deployment}
            isDeploying={isDeploying}
            validationPassed={validation?.passed ?? false}
            hasGeneratedCode={hasGenerated}
            onDeploy={deployPipeline}
            onReset={resetDeployment}
          />
        </div>
      </div>

      {/* Full-width generated code */}
      <GeneratedCodePanel
        files={generatedFiles}
        activeFile={activeFile}
        activeTarget={activeFileTarget}
        onSelectTarget={setActiveFileTarget}
        isGenerating={isGenerating}
      />

      {/* Closed-loop completion marker */}
      {deployment.stage === 'deployed' && (
        <Card className="p-4 bg-emerald-500/5 border-emerald-500/30">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <div className="text-sm font-semibold text-text-primary">Pipeline deployed — closed loop complete</div>
              <p className="text-[11px] text-text-secondary">
                The AIDEN monitoring agents now watch this pipeline. Failures will enter the self-healing workflow automatically.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              onClick={() => navigate('/monitoring')}
              className="text-xs ml-auto shrink-0 hidden sm:inline-flex"
            >
              Open Monitoring
            </Button>
          </div>
        </Card>
      )}
    </PageContainer>
  );
};

export default PipelinesPage;
