import React from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Sparkles, FileText, Image, Mic, Code, Database } from 'lucide-react';

export const RequirementsPage: React.FC = () => {
  const inputModes = [
    { title: 'Natural Text', desc: 'Free-form business intent & goals', icon: FileText },
    { title: 'Architecture Diagram', desc: 'Upload whiteboard or draw.io images', icon: Image },
    { title: 'Voice / Audio', desc: 'Spoken engineering sprint notes', icon: Mic },
    { title: 'Legacy Code / DDL', desc: 'Extract intent from Python/dbt scripts', icon: Code },
    { title: 'SQL Queries', desc: 'Reverse-engineer data pipelines from queries', icon: Database },
  ];

  return (
    <PageContainer
      title="Requirement Studio"
      description="Multimodal intent capture: Translate business goals into verifiable pipeline specifications"
      breadcrumbs={[
        { label: 'AIDEN' },
        { label: 'Studio' },
        { label: 'Requirement Studio' },
      ]}
    >
      <Card className="p-6 bg-gradient-to-br from-[#14171C] via-[#14171C] to-indigo-950/20 border-indigo-500/20">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Badge variant="ai" dot pulse size="md">
              Phase 2 Preview
            </Badge>
            <h2 className="text-xl font-bold text-white">
              Autonomous Requirement Ingestion
            </h2>
            <p className="text-xs text-[#9CA3AF] max-w-xl leading-relaxed">
              In Phase 2, AIDEN will ingest text, audio, images, documents, and SQL to synthesize formal data contract specifications and target SLAs.
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6">
          {inputModes.map((mode, i) => {
            const Icon = mode.icon;
            return (
              <div key={i} className="p-3.5 rounded-lg border border-[#242831] bg-[#0F1115] space-y-2">
                <div className="w-7 h-7 rounded-md bg-[#1A1D24] flex items-center justify-center text-indigo-400">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <h4 className="text-xs font-semibold text-white">{mode.title}</h4>
                <p className="text-[11px] text-[#9CA3AF]">{mode.desc}</p>
              </div>
            );
          })}
        </div>
      </Card>
    </PageContainer>
  );
};
export default RequirementsPage;
