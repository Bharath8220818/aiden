import React from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Activity } from 'lucide-react';

export const MonitoringPage: React.FC = () => {
  return (
    <PageContainer
      title="Monitoring Center"
      description="Real-time telemetry, consumer lags, worker cluster metrics, and data quality SLAs"
      breadcrumbs={[
        { label: 'AIDEN' },
        { label: 'Operations' },
        { label: 'Monitoring' },
      ]}
    >
      <Card className="p-6 bg-[#14171C] border-[#242831]">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Badge variant="success" dot pulse size="md">
              Phase 8 Preview
            </Badge>
            <h2 className="text-xl font-bold text-white">
              Real-time Observability & Telemetry
            </h2>
            <p className="text-xs text-[#9CA3AF] max-w-xl leading-relaxed">
              Live stream charts, partition lag monitors, cluster health metrics, and automated data drift threshold detection.
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </Card>
    </PageContainer>
  );
};
export default MonitoringPage;
