import React from 'react';
import { MultimodalInputState, InputMode } from '../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { TextInputCard } from './TextInputCard';
import { AudioInputCard } from './AudioInputCard';
import { SqlInputCard } from './SqlInputCard';
import { DiagramInputCard } from './DiagramInputCard';
import { DocumentInputCard } from './DocumentInputCard';
import {
  FileText,
  Mic,
  Terminal,
  Image,
  FileCode,
  Sparkles,
} from 'lucide-react';

export interface MultimodalInputStudioProps {
  inputState: MultimodalInputState;
  onModeChange: (mode: InputMode) => void;
  onUpdateText: (text: string) => void;
  onUpdateAudio: (updates: Partial<MultimodalInputState['audio']>) => void;
  onUpdateSql: (updates: Partial<MultimodalInputState['sql']>) => void;
  onUpdateDiagram: (updates: Partial<MultimodalInputState['diagram']>) => void;
  onUpdateDocument: (updates: Partial<MultimodalInputState['document']>) => void;
}

export const MultimodalInputStudio: React.FC<MultimodalInputStudioProps> = ({
  inputState,
  onModeChange,
  onUpdateText,
  onUpdateAudio,
  onUpdateSql,
  onUpdateDiagram,
  onUpdateDocument,
}) => {
  const tabs = [
    {
      id: 'text',
      label: 'Natural Text',
      icon: <FileText className="w-3.5 h-3.5" />,
      badge: 'Primary',
    },
    {
      id: 'audio',
      label: 'Voice / Audio',
      icon: <Mic className="w-3.5 h-3.5" />,
      badge: 'Live',
    },
    {
      id: 'sql',
      label: 'SQL Query',
      icon: <Terminal className="w-3.5 h-3.5" />,
    },
    {
      id: 'diagram',
      label: 'Diagram / Whiteboard',
      icon: <Image className="w-3.5 h-3.5" />,
      badge: 'OCR',
    },
    {
      id: 'document',
      label: 'DDL / Contract Spec',
      icon: <FileCode className="w-3.5 h-3.5" />,
    },
  ];

  const handleApplyAudioTranscript = (transcript: string) => {
    onUpdateText(transcript);
    onModeChange('text');
  };

  return (
    <Card className="bg-[#14171C] border-[#242831] overflow-hidden">
      <CardHeader className="pb-3 border-b border-[#1F242C]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <CardTitle className="text-sm font-bold uppercase tracking-wider">
              Multimodal Intent Ingestion
            </CardTitle>
          </div>
          <span className="text-[11px] text-[#9CA3AF]">
            Capture intent from any engineering medium
          </span>
        </div>
      </CardHeader>

      {/* Tabs */}
      <div className="px-5 pt-3 bg-[#0F1115] border-b border-[#242831]">
        <Tabs
          tabs={tabs}
          activeTab={inputState.activeMode}
          onChange={(tabId) => onModeChange(tabId as InputMode)}
        />
      </div>

      <CardContent className="p-5">
        {inputState.activeMode === 'text' && (
          <TextInputCard
            payload={inputState.text}
            onChange={onUpdateText}
            onEnhance={() => {
              onUpdateText(
                inputState.text.enhancedPrompt ||
                  `${inputState.text.rawText} Enforce Debezium/Kafka CDC ingestion with 99.9% completeness assertions and automated PII masking.`
              );
            }}
          />
        )}

        {inputState.activeMode === 'audio' && (
          <AudioInputCard
            payload={inputState.audio}
            onChange={onUpdateAudio}
            onApplyTranscriptToText={handleApplyAudioTranscript}
          />
        )}

        {inputState.activeMode === 'sql' && (
          <SqlInputCard
            payload={inputState.sql}
            onChange={onUpdateSql}
          />
        )}

        {inputState.activeMode === 'diagram' && (
          <DiagramInputCard
            payload={inputState.diagram}
            onChange={onUpdateDiagram}
          />
        )}

        {inputState.activeMode === 'document' && (
          <DocumentInputCard
            payload={inputState.document}
            onChange={onUpdateDocument}
          />
        )}
      </CardContent>
    </Card>
  );
};
