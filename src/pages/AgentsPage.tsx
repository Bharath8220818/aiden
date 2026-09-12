import React from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Bot } from 'lucide-react';

export const AgentsPage: React.FC = () => {
  return (
    <PageContainer
      title="Agent Control Center"
      description="Autonomous agent orchestrator, swarm topology, tool permissions, and memory buffers"
      breadcrumbs={[
        { label: 'AIDEN' },
        { label: 'Intelligence' },
        { label: 'Agent Control Center' },
      ]}
    >
      <Card className="p-6 bg-[#14171C] border-[#242831]">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Badge variant="ai" dot size="md">
              Phase 10 Preview
            </Badge>
            <h2 className="text-xl font-bold text-white">
              Autonomous Agent Control Center
            </h2>
            <p className="text-xs text-[#9CA3AF] max-w-xl leading-relaxed">
              Supervise the 5 autonomous agents: Requirements Agent, Architect Agent, Builder Agent, QA Agent, and Healer Agent. Inspect memory states, execution trajectories, and token utilization.
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Bot className="w-5 h-5" />
          </div>
        </div>
      </Card>
    </PageContainer>
  );
};
export default AgentsPage;
