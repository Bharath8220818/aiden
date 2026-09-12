import React, { useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/Button';
import { useRequirements } from '@/features/requirements/hooks/useRequirements';
import { MultimodalInputStudio } from '@/features/requirements/components/MultimodalInputStudio';
import { IntentAnalysisPanel } from '@/features/requirements/components/IntentAnalysisPanel';
import { DataContractViewer } from '@/features/requirements/components/DataContractViewer';
import { ContractValidationStatus } from '@/features/requirements/components/ContractValidationStatus';
import { RequirementTemplatesModal } from '@/features/requirements/components/RequirementTemplatesModal';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  Bookmark,
  Layers,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

export const RequirementsPage: React.FC = () => {
  const {
    inputState,
    analysis,
    contract,
    validationChecks,
    isAnalyzing,
    activePresetId,
    setActiveMode,
    updateText,
    updateAudio,
    updateSql,
    updateDiagram,
    updateDocument,
    loadPreset,
    synthesizeIntent,
    presets,
  } = useRequirements();

  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [handoffSuccess, setHandoffSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSendToArchitecture = () => {
    setHandoffSuccess(true);
    setTimeout(() => {
      navigate('/architecture');
    }, 1000);
  };

  const actions = (
    <div className="flex items-center gap-2.5">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setIsTemplatesOpen(true)}
        leftIcon={<Bookmark className="w-3.5 h-3.5" />}
        className="text-xs"
      >
        Templates
      </Button>

      <Button
        variant="ai"
        size="sm"
        onClick={synthesizeIntent}
        isLoading={isAnalyzing}
        leftIcon={<Sparkles className="w-3.5 h-3.5" />}
        className="text-xs shadow-ai-glow"
      >
        Synthesize with AIDEN
      </Button>

      <Button
        variant="primary"
        size="sm"
        onClick={handleSendToArchitecture}
        leftIcon={handoffSuccess ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> : undefined}
        rightIcon={!handoffSuccess ? <ArrowRight className="w-3.5 h-3.5" /> : undefined}
        className="text-xs"
      >
        {handoffSuccess ? 'Contract Handoff Complete!' : 'Proceed to Architecture Studio'}
      </Button>
    </div>
  );

  return (
    <PageContainer
      title="Requirement Studio"
      description="Multimodal intent capture: Translate business goals, speech, SQL, and diagrams into formal Open Data Contracts"
      actions={actions}
      breadcrumbs={[
        { label: 'AIDEN' },
        { label: 'Studio', path: '/requirements' },
        { label: 'Requirement Studio' },
      ]}
    >
      {/* Top 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Multimodal Input Studio (7 cols on desktop) */}
        <div className="lg:col-span-7 space-y-6">
          <MultimodalInputStudio
            inputState={inputState}
            onModeChange={setActiveMode}
            onUpdateText={updateText}
            onUpdateAudio={updateAudio}
            onUpdateSql={updateSql}
            onUpdateDiagram={updateDiagram}
            onUpdateDocument={updateDocument}
          />

          {/* Real-time Automated Validation Checks */}
          <ContractValidationStatus checks={validationChecks} />
        </div>

        {/* Right Column: AI Intent Extraction & Topology Preview (5 cols on desktop) */}
        <div className="lg:col-span-5 space-y-6">
          <IntentAnalysisPanel analysis={analysis} />
        </div>
      </div>

      {/* Full-width Section: Formal Synthesized Data Contract Specification */}
      <div className="pt-2">
        <DataContractViewer contract={contract} />
      </div>

      {/* Templates Selector Modal */}
      <RequirementTemplatesModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        presets={presets}
        activePresetId={activePresetId}
        onSelectPreset={loadPreset}
      />
    </PageContainer>
  );
};
export default RequirementsPage;
