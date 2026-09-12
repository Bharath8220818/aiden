import React from 'react';
import { IntentAnalysisResult } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Brain,
  Database,
  ArrowRight,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Cpu,
  Layers,
} from 'lucide-react';

export interface IntentAnalysisPanelProps {
  analysis: IntentAnalysisResult;
}

export const IntentAnalysisPanel: React.FC<IntentAnalysisPanelProps> = ({ analysis }) => {
  return (
    <Card className="bg-[#14171C] border-[#242831] overflow-hidden">
      <CardHeader className="p-4 sm:p-5 pb-3 border-b border-[#1F242C] bg-gradient-to-r from-indigo-950/25 via-transparent to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-indigo-500/20 text-indigo-400">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-[#F5F7FA]">
                Autonomous Intent Extraction
              </CardTitle>
              <p className="text-[11px] text-[#9CA3AF]">
                AIDEN AI analysis, entity mapping, and governance classification
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-[#6B7280]">
              Confidence:
            </span>
            <Badge variant="ai" size="sm" dot pulse>
              {analysis.confidenceScore}% High
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Executive Summary */}
        <div className="p-3.5 rounded-lg bg-[#0F1115] border border-[#1F242C] space-y-1.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#F5F7FA]">
              {analysis.intentTitle}
            </h4>
            <Badge variant="info" size="sm">
              {analysis.patternLabel}
            </Badge>
          </div>
          <p className="text-xs text-[#9CA3AF] leading-relaxed">
            {analysis.executiveSummary}
          </p>
        </div>

        {/* Source -> Sink Pipeline Flow Graph */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase text-[#6B7280] tracking-wider block">
            Extracted Entity Lineage Flow
          </span>

          <div className="p-3 rounded-lg bg-[#0B0D10] border border-[#242831] flex flex-wrap items-center justify-between gap-2 text-xs">
            {/* Sources */}
            <div className="flex items-center gap-2">
              <div className="flex flex-col">
                <span className="text-[10px] text-[#6B7280] font-semibold uppercase">Source Ingestion</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {analysis.sourceEntities.map((s, i) => (
                    <Badge key={i} variant="neutral" size="sm" className="font-mono">
                      <Database className="w-3 h-3 mr-1 text-emerald-400" />
                      {s.name} ({s.technology})
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <ArrowRight className="w-4 h-4 text-indigo-400 shrink-0 hidden sm:block" />

            {/* Target Sink */}
            <div className="flex items-center gap-2">
              <div className="flex flex-col sm:items-end">
                <span className="text-[10px] text-[#6B7280] font-semibold uppercase">Target Destination</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {analysis.targetEntities.map((t, i) => (
                    <Badge key={i} variant="ai" size="sm" className="font-mono">
                      <Layers className="w-3 h-3 mr-1 text-cyan-300" />
                      {t.name} ({t.technology})
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PII Detection & Governance Alerts */}
        {analysis.detectedPii.length > 0 && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-2">
            <div className="flex items-center gap-2 text-amber-400">
              <ShieldAlert className="w-4 h-4" />
              <h5 className="text-xs font-semibold">
                PII Privacy Governance Detected ({analysis.detectedPii.length} columns)
              </h5>
            </div>
            <div className="space-y-1.5">
              {analysis.detectedPii.map((pii, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] bg-[#14171C]/80 p-2 rounded border border-amber-500/20"
                >
                  <span className="font-mono text-white font-semibold">
                    {pii.columnName} ({pii.piiType.toUpperCase()})
                  </span>
                  <span className="text-amber-300">
                    Policy: {pii.recommendedMasking}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggested SLA & Target Guarantees */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2.5 rounded bg-[#0F1115] border border-[#1F242C]">
            <span className="text-[10px] text-[#6B7280] uppercase block">Target Latency</span>
            <span className="font-mono font-bold text-[#F5F7FA] text-xs mt-0.5 block">
              {analysis.suggestedSla.latency}
            </span>
          </div>

          <div className="p-2.5 rounded bg-[#0F1115] border border-[#1F242C]">
            <span className="text-[10px] text-[#6B7280] uppercase block">Cadence</span>
            <span className="font-medium text-[#F5F7FA] text-xs mt-0.5 block truncate">
              {analysis.suggestedSla.schedule}
            </span>
          </div>

          <div className="p-2.5 rounded bg-[#0F1115] border border-[#1F242C]">
            <span className="text-[10px] text-[#6B7280] uppercase block">Service SLA</span>
            <span className="font-mono font-bold text-emerald-400 text-xs mt-0.5 block">
              {analysis.suggestedSla.availability}
            </span>
          </div>

          <div className="p-2.5 rounded bg-[#0F1115] border border-[#1F242C]">
            <span className="text-[10px] text-[#6B7280] uppercase block">Assigned Tier</span>
            <span className="font-semibold text-indigo-400 text-xs mt-0.5 block">
              {analysis.suggestedSla.slaTier}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
