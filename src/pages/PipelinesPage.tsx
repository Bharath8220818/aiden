import React from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { GitBranch } from 'lucide-react';

export const PipelinesPage: React.FC = () => {
  return (
    <PageContainer
      title="Pipeline Builder & Manager"
      description="Autonomous code generation (PySpark, SQL, Airflow DAGs) and active execution management"
      breadcrumbs={[
        { label: 'AIDEN' },
        { label: 'Pipelines' },
      ]}
    >
      <Card className="p-6 bg-[#14171C] border-[#242831]">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Badge variant="ai" dot size="md">
              Phase 4 & Phase 7 Preview
            </Badge>
            <h2 className="text-xl font-bold text-white">
              Autonomous Pipeline Generation & Orchestration
            </h2>
            <p className="text-xs text-[#9CA3AF] max-w-xl leading-relaxed">
              Generate battle-tested data pipelines with automated unit tests, retry policies, backfills, and zero-downtime deployment hooks.
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <GitBranch className="w-5 h-5" />
          </div>
        </div>
      </Card>
    </PageContainer>
  );
};
export default PipelinesPage;
