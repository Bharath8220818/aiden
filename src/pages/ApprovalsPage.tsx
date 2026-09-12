import React from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CheckSquare } from 'lucide-react';

export const ApprovalsPage: React.FC = () => {
  return (
    <PageContainer
      title="Approvals & Governance"
      description="Human-in-the-loop governance for self-healed patches, schema migrations, and production releases"
      breadcrumbs={[
        { label: 'AIDEN' },
        { label: 'Governance' },
        { label: 'Approvals' },
      ]}
    >
      <Card className="p-6 bg-[#14171C] border-[#242831]">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Badge variant="warning" dot size="md">
              Phase 10 Preview
            </Badge>
            <h2 className="text-xl font-bold text-white">
              Human-in-the-Loop Approval Queue
            </h2>
            <p className="text-xs text-[#9CA3AF] max-w-xl leading-relaxed">
              Review AI-generated code diffs, schema backfill requests, and sandbox replay test results before pushing to production clusters.
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <CheckSquare className="w-5 h-5" />
          </div>
        </div>
      </Card>
    </PageContainer>
  );
};
export default ApprovalsPage;
