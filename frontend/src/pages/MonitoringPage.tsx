import React, { useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { useMonitoring } from '@/features/monitoring/hooks/useMonitoring';
import { ServiceGrid } from '@/features/monitoring/components/ServiceGrid';
import { TelemetryCharts } from '@/features/monitoring/components/TelemetryCharts';
import { KafkaLagPanel } from '@/features/monitoring/components/KafkaLagPanel';
import { QualityChecksPanel } from '@/features/monitoring/components/QualityChecksPanel';
import { AlertsFeed } from '@/features/monitoring/components/AlertsFeed';
import {
  Activity,
  Server,
  LineChart,
  Radio,
  ShieldCheck,
  Bell,
  Loader2,
} from 'lucide-react';

type TabId = 'infrastructure' | 'telemetry' | 'kafka' | 'quality';

const TABS: { id: TabId; label: string; icon: JSX.Element }[] = [
  { id: 'infrastructure', label: 'Infrastructure', icon: <Server className="w-3.5 h-3.5" /> },
  { id: 'telemetry', label: 'Telemetry', icon: <LineChart className="w-3.5 h-3.5" /> },
  { id: 'kafka', label: 'Kafka & Streams', icon: <Radio className="w-3.5 h-3.5" /> },
  { id: 'quality', label: 'Data Quality', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
];

export const MonitoringPage: React.FC = () => {
  const {
    services,
    series,
    topics,
    qualityChecks,
    alerts,
    healthSummary,
    isLoading,
    acknowledgingId,
    acknowledgeAlert,
  } = useMonitoring();

  const [activeTab, setActiveTab] = useState<TabId>('infrastructure');

  const overall =
    healthSummary.overall === 'healthy'
      ? { variant: 'success' as const, label: 'All systems operational' }
      : healthSummary.overall === 'degraded'
      ? { variant: 'warning' as const, label: 'Degraded performance detected' }
      : { variant: 'error' as const, label: 'System outage' };

  return (
    <PageContainer
      title="Monitoring Center"
      description="Real-time telemetry, consumer lags, cluster health, and data quality SLAs"
      fullWidth
      breadcrumbs={[
        { label: 'AIDEN' },
        { label: 'Operations' },
        { label: 'Monitoring' },
      ]}
      actions={
        <div className="flex items-center gap-2">
          <Badge variant={overall.variant} size="sm" dot pulse>
            {overall.label}
          </Badge>
          <Badge variant="ai" size="sm">
            <Loader2 className="w-3 h-3 animate-spin mr-1" />
            live · 15s
          </Badge>
        </div>
      }
    >
      {/* Health summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Services healthy', value: `${healthSummary.healthy}/${services.length}`, icon: <Server className="w-4 h-4 text-emerald-600" /> },
          { label: 'Degraded', value: healthSummary.degraded, icon: <Activity className="w-4 h-4 text-amber-600" /> },
          { label: 'Critical alerts', value: healthSummary.criticalAlerts, icon: <Bell className="w-4 h-4 text-red-600" /> },
          { label: 'Quality checks failing', value: qualityChecks.filter((q) => q.status === 'failing').length, icon: <ShieldCheck className="w-4 h-4 text-violet-600" /> },
        ].map((s) => (
          <div key={s.label} className="p-3.5 rounded-lg bg-card border border-border">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-semibold text-text-muted">{s.label}</span>
              {s.icon}
            </div>
            <div className="text-2xl font-bold text-text-primary font-mono mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Layout: tabs content + alerts rail */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {/* Tab bar */}
          <div className="flex items-center px-3 border-b border-border overflow-x-auto no-scrollbar">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-semibold border-b-2 transition-colors whitespace-nowrap',
                  activeTab === t.id
                    ? 'text-text-primary border-indigo-500'
                    : 'text-text-muted border-transparent hover:text-text-secondary'
                )}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab panels */}
          <div className="p-3">
            {activeTab === 'infrastructure' && <ServiceGrid services={services} isLoading={isLoading} />}
            {activeTab === 'telemetry' && <TelemetryCharts series={series} isLoading={isLoading} />}
            {activeTab === 'kafka' && <KafkaLagPanel topics={topics} isLoading={isLoading} />}
            {activeTab === 'quality' && <QualityChecksPanel checks={qualityChecks} isLoading={isLoading} />}
          </div>
        </div>

        {/* Alerts rail */}
        <div className="rounded-lg border border-border bg-card overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 shrink-0">
            <Bell className="w-4 h-4 text-amber-600" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-primary">Alerts</span>
            {healthSummary.unacknowledgedAlerts > 0 && (
              <Badge variant="error" size="sm" className="ml-auto">{healthSummary.unacknowledgedAlerts} active</Badge>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-3 max-h-[70vh]">
            <AlertsFeed
              alerts={alerts}
              acknowledgingId={acknowledgingId}
              onAcknowledge={acknowledgeAlert}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default MonitoringPage;
