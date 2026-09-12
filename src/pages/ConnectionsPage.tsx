import React from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Database } from 'lucide-react';

export const ConnectionsPage: React.FC = () => {
  return (
    <PageContainer
      title="Connection Manager"
      description="Data warehouse, streaming broker, and lakehouse connectors"
      breadcrumbs={[
        { label: 'AIDEN' },
        { label: 'Platform' },
        { label: 'Connections' },
      ]}
    >
      <Card className="p-6 bg-[#14171C] border-[#242831]">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Badge variant="neutral" dot size="md">
              Phase 6 Preview
            </Badge>
            <h2 className="text-xl font-bold text-white">
              Enterprise Connector Hub
            </h2>
            <p className="text-xs text-[#9CA3AF] max-w-xl leading-relaxed">
              Connect PostgreSQL, MySQL, Snowflake, BigQuery, Kafka, Airflow, Spark, AWS, GCP, and Azure with encrypted secrets and automated schema introspection.
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Database className="w-5 h-5" />
          </div>
        </div>
      </Card>
    </PageContainer>
  );
};
export default ConnectionsPage;
