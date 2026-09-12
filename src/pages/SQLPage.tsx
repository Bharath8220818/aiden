import React from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Terminal } from 'lucide-react';

export const SQLPage: React.FC = () => {
  return (
    <PageContainer
      title="SQL Workspace"
      description="Interactive query editor with Monaco, AI query optimizer, and explain plan visualizer"
      breadcrumbs={[
        { label: 'AIDEN' },
        { label: 'Studio' },
        { label: 'SQL Workspace' },
      ]}
    >
      <Card className="p-6 bg-[#14171C] border-[#242831]">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Badge variant="warning" dot size="md">
              Phase 5 Preview
            </Badge>
            <h2 className="text-xl font-bold text-white">
              Monaco AI SQL Editor & Schema Explorer
            </h2>
            <p className="text-xs text-[#9CA3AF] max-w-xl leading-relaxed">
              Integrated multi-warehouse query workbench featuring automatic index recommendations, query execution plans, and AI SQL generation.
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Terminal className="w-5 h-5" />
          </div>
        </div>
      </Card>
    </PageContainer>
  );
};
export default SQLPage;
