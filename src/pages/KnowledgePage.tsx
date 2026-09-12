import React from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { BookOpen } from 'lucide-react';

export const KnowledgePage: React.FC = () => {
  return (
    <PageContainer
      title="Knowledge / RAG Repository"
      description="Vector embeddings of corporate data schemas, past incident post-mortems, and lineage graphs"
      breadcrumbs={[
        { label: 'AIDEN' },
        { label: 'Intelligence' },
        { label: 'Knowledge / RAG' },
      ]}
    >
      <Card className="p-6 bg-[#14171C] border-[#242831]">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Badge variant="info" dot size="md">
              Phase 10 Preview
            </Badge>
            <h2 className="text-xl font-bold text-white">
              Enterprise Data Knowledge Base & Memory
            </h2>
            <p className="text-xs text-[#9CA3AF] max-w-xl leading-relaxed">
              Domain ontology, data dictionary, metric definitions, and historical pipeline execution logs indexed for high-recall RAG retrieval.
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>
      </Card>
    </PageContainer>
  );
};
export default KnowledgePage;
