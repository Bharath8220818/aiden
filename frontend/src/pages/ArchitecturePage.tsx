import React, { useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Tooltip } from '@/components/ui/Tooltip';
import { useArchitecture } from '@/features/architecture/hooks/useArchitecture';
import { ArchitectureNodeKind } from '@/features/architecture/types';
import { ArchitectureCanvas } from '@/features/architecture/components/ArchitectureCanvas';
import { NodePalette } from '@/features/architecture/components/NodePalette';
import { NodeInspector } from '@/features/architecture/components/NodeInspector';
import { ValidationPanel } from '@/features/architecture/components/ValidationPanel';
import { GenerateBlueprintModal } from '@/features/architecture/components/GenerateBlueprintModal';
import { TemplateGalleryModal } from '@/features/architecture/components/TemplateGalleryModal';
import { useQuery } from '@tanstack/react-query';
import { fetchTemplates } from '@/features/architecture/services/architecture.service';
import { useNavigate } from 'react-router-dom';
import {
  Network,
  Sparkles,
  LayoutTemplate,
  Wand2,
  ScanSearch,
  Download,
  FileJson,
  FileCode,
  MoveRight,
  LayoutGrid,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

export const ArchitecturePage: React.FC = () => {
  const {
    blueprintName,
    setBlueprintName,
    nodes,
    edges,
    selectedNode,
    validation,
    isGenerating,
    generationRationale,
    hasUnsavedChanges,
    stats,
    isLoading,
    selectNode,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    updateNodeData,
    deleteSelectedNode,
    applyAutoLayout,
    runValidation,
    generateWithAI,
    loadTemplate,
    exportJson,
    exportYaml,
    publishToPipelineBuilder,
  } = useArchitecture();

  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [activeRightPanel, setActiveRightPanel] = useState<'inspector' | 'validation'>('validation');
  const navigate = useNavigate();

  const templatesQuery = useQuery({
    queryKey: ['architecture-templates'],
    queryFn: fetchTemplates,
    staleTime: Infinity,
  });

  const handlePublish = () => {
    setIsPublishing(true);
    const report = publishToPipelineBuilder();
    setTimeout(() => {
      setIsPublishing(false);
      if (report.passed) {
        setPublishSuccess(true);
        setTimeout(() => navigate('/pipelines'), 900);
      }
    }, 500);
  };

  const isValid = validation?.passed ?? false;

  return (
    <PageContainer
      title="Architecture Studio"
      description="Visual topology designer — design pipelines as DAGs, validate contracts, and hand off to the Pipeline Builder"
      fullWidth
      breadcrumbs={[
        { label: 'AIDEN' },
        { label: 'Command Workspace', path: '/workspace' },
        { label: 'Architecture Studio' },
      ]}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" leftIcon={<LayoutTemplate className="w-3.5 h-3.5" />} onClick={() => setIsTemplatesOpen(true)} className="text-xs">
            Templates
          </Button>
          <Button variant="secondary" size="sm" leftIcon={<LayoutGrid className="w-3.5 h-3.5" />} onClick={applyAutoLayout} className="text-xs">
            Auto-layout
          </Button>
          <Button variant="ai" size="sm" leftIcon={<Sparkles className="w-3.5 h-3.5" />} onClick={() => setIsGenerateOpen(true)} isLoading={isGenerating} className="text-xs shadow-ai-glow">
            Generate with AIDEN
          </Button>
        </div>
      }
    >
      {/* Blueprint header bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-600 shrink-0">
            <Network className="w-4.5 h-4.5" />
          </div>
          <input
            value={blueprintName}
            onChange={(e) => setBlueprintName(e.target.value)}
            className="bg-transparent text-base font-bold text-text-primary focus:outline-none focus:ring-1 focus:ring-indigo-500/60 rounded-md px-2 py-1 -ml-2 hover:bg-card transition-colors min-w-0 w-64"
          />
          <Badge variant={isValid ? 'success' : 'warning'} dot pulse={!isValid} size="sm">
            {isValid ? 'Validation passed' : 'Needs attention'}
          </Badge>
          {hasUnsavedChanges && <span className="text-[10px] text-text-muted font-mono">• unsaved changes</span>}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-text-secondary font-mono">
          <span className="px-2 py-1 rounded bg-card border border-border">{stats.nodes} nodes</span>
          <span className="px-2 py-1 rounded bg-card border border-border">{stats.edges} edges</span>
          <span className="px-2 py-1 rounded bg-card border border-border">{stats.sources}→{stats.sinks} src→sink</span>
        </div>
      </div>

      {generationRationale && (
        <Card className="p-3.5 bg-indigo-500/5 border-indigo-500/25">
          <div className="flex items-start gap-2.5">
            <Wand2 className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-text-primary mb-0.5">AIDEN Architect Agent rationale</div>
              <p className="text-[11px] text-text-secondary leading-relaxed">{generationRationale}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Studio workspace: palette | canvas | right rail */}
      <div className="grid grid-cols-1 xl:grid-cols-[240px_1fr_300px] gap-4 h-[640px]">
        {/* Palette */}
        <Card className="hidden xl:block overflow-hidden bg-card">
          <NodePalette onAddNode={addNode} />
        </Card>

        {/* Canvas */}
        <Card className="relative overflow-hidden bg-background">
          <ArchitectureCanvas
            nodes={nodes}
            edges={edges}
            selectedNodeId={null}
            isLoading={isLoading}
            isGenerating={isGenerating}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onSelectNode={(id) => {
              selectNode(id);
              if (id) setActiveRightPanel('inspector');
            }}
            onOpenAIGenerate={() => setIsGenerateOpen(true)}
          />
        </Card>

        {/* Right rail: Inspector / Validation */}
        <Card className="hidden xl:flex flex-col overflow-hidden bg-card">
          <div className="flex items-center border-b border-border shrink-0">
            <button
              onClick={() => setActiveRightPanel('inspector')}
              className={cnTab(activeRightPanel === 'inspector')}
            >
              Inspector
            </button>
            <button
              onClick={() => setActiveRightPanel('validation')}
              className={cnTab(activeRightPanel === 'validation')}
            >
              Validation
            </button>
          </div>
          <div className="flex-1 min-h-0">
            {activeRightPanel === 'inspector' ? (
              <NodeInspector
                node={selectedNode}
                onUpdateNode={updateNodeData}
                onDeleteNode={deleteSelectedNode}
                onClose={() => selectNode(null)}
              />
            ) : (
              <ValidationPanel report={validation} />
            )}
          </div>
        </Card>
      </div>

      {/* Footer action bar */}
      <Card className="p-3 bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" leftIcon={<ScanSearch className="w-3.5 h-3.5" />} onClick={runValidation} className="text-xs">
            Run validation
          </Button>
          <Tooltip content="Download as JSON">
            <Button variant="ghost" size="icon" onClick={exportJson}>
              <FileJson className="w-4 h-4" />
            </Button>
          </Tooltip>
          <Tooltip content="Download as YAML">
            <Button variant="ghost" size="icon" onClick={exportYaml}>
              <FileCode className="w-4 h-3.5" />
            </Button>
          </Tooltip>
          <Tooltip content="Fit canvas to view">
            <Button variant="ghost" size="icon" onClick={() => window.dispatchEvent(new Event('resize'))}>
              <Download className="w-4 h-4" />
            </Button>
          </Tooltip>
        </div>

        <Button
          variant={isValid ? 'primary' : 'secondary'}
          size="sm"
          onClick={handlePublish}
          isLoading={isPublishing}
          leftIcon={
            publishSuccess ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : isPublishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MoveRight className="w-3.5 h-3.5" />
          }
          rightIcon={!publishSuccess && !isPublishing ? <MoveRight className="w-3.5 h-3.5" /> : undefined}
          className="text-xs"
        >
          {publishSuccess
            ? 'Blueprint published to Pipeline Builder!'
            : isPublishing
            ? 'Publishing…'
            : isValid
            ? 'Publish to Pipeline Builder'
            : 'Fix issues to publish'}
        </Button>
      </Card>

      {/* Mobile palette fallback */}
      <Card className="xl:hidden p-4 bg-card">
        <div className="text-xs font-bold uppercase tracking-wider text-text-primary mb-2">Quick add component</div>
        <div className="flex flex-wrap gap-2">
          {(['source', 'ingestion', 'processing', 'storage', 'quality', 'sink', 'orchestration'] as const).map((kind) => (
            <button
              key={kind}
              onClick={() => addNode(kind satisfies ArchitectureNodeKind)}
              className="px-2.5 py-1 text-[11px] rounded-md bg-card border border-border text-text-secondary hover:text-text-primary hover:border-border-highlight transition-all capitalize"
            >
              + {kind}
            </button>
          ))}
        </div>
      </Card>

      <GenerateBlueprintModal
        isOpen={isGenerateOpen}
        onClose={() => setIsGenerateOpen(false)}
        onGenerate={generateWithAI}
        isGenerating={isGenerating}
      />
      <TemplateGalleryModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        templates={templatesQuery.data ?? []}
        onSelectTemplate={loadTemplate}
      />
    </PageContainer>
  );
};

function cnTab(active: boolean) {
  return `flex-1 px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
    active
      ? 'text-text-primary border-b-2 border-indigo-500 bg-card/50'
      : 'text-text-muted hover:text-text-secondary border-b-2 border-transparent'
  }`;
}

export default ArchitecturePage;
