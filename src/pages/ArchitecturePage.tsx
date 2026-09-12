import React from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Network } from 'lucide-react';

export const ArchitecturePage: React.FC = () => {
  return (
    <PageContainer
      title="Architecture Studio"
      description="Visual pipeline topology, data contracts, and interactive React Flow canvas"
      breadcrumbs={[
        { label: 'AIDEN' },
        { label: 'Studio' },
        { label: 'Architecture Studio' },
      ]}
    >
      <Card className="p-6 bg-[#14171C] border-[#242831]">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Badge variant="info" dot size="md">
              Phase 3 Preview
            </Badge>
            <h2 className="text-xl font-bold text-white">
              Data Architecture & Canvas Modeling
            </h2>
            <p className="text-xs text-[#9CA3AF] max-w-xl leading-relaxed">
              Phase 3 introduces the full interactive React Flow node canvas for end-to-end data pipelines, auto-layout algorithms, and schema contract validation.
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Network className="w-5 h-5" />
          </div>
        </div>
      </Card>
    </PageContainer>
  );
};
export default ArchitecturePage;
