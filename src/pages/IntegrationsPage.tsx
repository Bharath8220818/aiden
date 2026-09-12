import React from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Plug } from 'lucide-react';

export const IntegrationsPage: React.FC = () => {
  return (
    <PageContainer
      title="MCP Integrations & Plugins"
      description="Model Context Protocol (MCP) server endpoints, external tool access, and API integrations"
      breadcrumbs={[
        { label: 'AIDEN' },
        { label: 'Intelligence' },
        { label: 'MCP Integrations' },
      ]}
    >
      <Card className="p-6 bg-[#14171C] border-[#242831]">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Badge variant="ai" dot size="md">
              Phase 10 Preview
            </Badge>
            <h2 className="text-xl font-bold text-white">
              Model Context Protocol (MCP) Hub
            </h2>
            <p className="text-xs text-[#9CA3AF] max-w-xl leading-relaxed">
              Connect external databases, GitHub repos, dbt Cloud, and Slack notification channels via standard MCP servers and tool registries.
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Plug className="w-5 h-5" />
          </div>
        </div>
      </Card>
    </PageContainer>
  );
};
export default IntegrationsPage;
