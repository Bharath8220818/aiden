import React from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AlertTriangle } from 'lucide-react';

export const IncidentsPage: React.FC = () => {
  return (
    <PageContainer
      title="Incidents & Alerting"
      description="Failure detection, alert triage, MTTR tracking, and incident escalation"
      breadcrumbs={[
        { label: 'AIDEN' },
        { label: 'Operations' },
        { label: 'Incidents' },
      ]}
    >
      <Card className="p-6 bg-[#14171C] border-[#242831]">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Badge variant="warning" dot size="md">
              Phase 9 Preview
            </Badge>
            <h2 className="text-xl font-bold text-white">
              Incident Management & Triage
            </h2>
            <p className="text-xs text-[#9CA3AF] max-w-xl leading-relaxed">
              Track pipeline failures, partition starvation events, and automated escalation channels with root-cause post-mortems.
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </Card>
    </PageContainer>
  );
};
export default IncidentsPage;
