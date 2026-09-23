import React from 'react';
import { PipelineConfig, ExecutionMode, ScheduleCadence, WriteStrategy } from '../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { SlidersHorizontal, Zap, Clock, Database, AlertOctagon } from 'lucide-react';

export interface PipelineConfigFormProps {
  config: PipelineConfig;
  onUpdate: (patch: Partial<PipelineConfig>) => void;
  onUpdateRetryPolicy: (patch: Partial<PipelineConfig['retryPolicy']>) => void;
}

const EXECUTION_MODES: { value: ExecutionMode; label: string; description: string; icon: JSX.Element }[] = [
  { value: 'streaming', label: 'Streaming', description: 'Event-driven, sub-second latency', icon: <Zap className="w-3.5 h-3.5" /> },
  { value: 'micro_batch', label: 'Micro-batch', description: '30s–5min intervals, lower cost', icon: <Clock className="w-3.5 h-3.5" /> },
  { value: 'scheduled_batch', label: 'Scheduled batch', description: 'Hourly/daily windows, cheapest', icon: <Database className="w-3.5 h-3.5" /> },
];

export const PipelineConfigForm: React.FC<PipelineConfigFormProps> = ({
  config,
  onUpdate,
  onUpdateRetryPolicy,
}) => {
  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-indigo-500/20 text-indigo-600">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Pipeline Configuration</CardTitle>
            <CardDescription>Execution semantics, reliability, and governance policies</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-5">
        {/* Pipeline name */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Pipeline Name</label>
          <Input
            value={config.pipelineName}
            onChange={(e) => onUpdate({ pipelineName: e.target.value })}
            className="font-mono text-xs"
            placeholder="orders_cdc_v1"
          />
        </div>

        {/* Execution mode */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Execution Mode</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {EXECUTION_MODES.map((mode) => (
              <button
                key={mode.value}
                onClick={() => onUpdate({ executionMode: mode.value })}
                className={cn(
                  'text-left p-3 rounded-lg border transition-all',
                  config.executionMode === mode.value
                    ? 'bg-indigo-500/10 border-indigo-500/50 ring-1 ring-indigo-500/40'
                    : 'bg-card border-border hover:border-border-highlight'
                )}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={config.executionMode === mode.value ? 'text-indigo-600' : 'text-text-muted'}>
                    {mode.icon}
                  </span>
                  <span className="text-xs font-semibold text-text-primary">{mode.label}</span>
                </div>
                <p className="text-[10px] text-text-secondary leading-snug">{mode.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Source / target summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-card border border-border">
            <span className="text-[10px] text-text-muted uppercase font-semibold block mb-1">Source System</span>
            <span className="text-xs font-mono text-emerald-600">{config.sourceSystem}</span>
          </div>
          <div className="p-3 rounded-lg bg-card border border-border">
            <span className="text-[10px] text-text-muted uppercase font-semibold block mb-1">Target System</span>
            <span className="text-xs font-mono text-blue-600">{config.targetSystem}</span>
          </div>
        </div>

        {/* Write strategy + schedule */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Write Strategy</label>
            <Select
              value={config.writeStrategy}
              onChange={(e) => onUpdate({ writeStrategy: e.target.value as WriteStrategy })}
              className="text-xs"
              options={[
                { value: 'append', label: 'Append (insert-only)' },
                { value: 'merge_upsert', label: 'Merge / Upsert (idempotent)' },
                { value: 'full_refresh', label: 'Full refresh (truncate + load)' },
                { value: 'scd2', label: 'SCD Type 2 (history tracking)' },
              ]}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Schedule</label>
            <Select
              value={config.schedule}
              onChange={(e) => onUpdate({ schedule: e.target.value as ScheduleCadence })}
              className="text-xs"
              options={[
                { value: 'continuous', label: 'Continuous (event-driven)' },
                { value: 'hourly', label: 'Hourly' },
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
              ]}
            />
          </div>
        </div>

        {/* Retry policy */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <AlertOctagon className="w-3.5 h-3.5 text-amber-600" />
            Reliability & Retry Policy
          </label>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <span className="text-[10px] text-text-secondary">Max retries</span>
              <Input
                type="number"
                min={0}
                max={10}
                value={config.retryPolicy.maxRetries}
                onChange={(e) => onUpdateRetryPolicy({ maxRetries: Number(e.target.value) })}
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <span className="text-[10px] text-text-secondary">Backoff</span>
              <Select
                value={config.retryPolicy.backoff}
                onChange={(e) => onUpdateRetryPolicy({ backoff: e.target.value as 'linear' | 'exponential' })}
                className="text-xs"
                options={[
                  { value: 'linear', label: 'Linear' },
                  { value: 'exponential', label: 'Exponential' },
                ]}
              />
            </div>
            <div className="space-y-1.5">
              <span className="text-[10px] text-text-secondary">Timeout (min)</span>
              <Input
                type="number"
                min={5}
                max={240}
                value={config.retryPolicy.timeoutMinutes}
                onChange={(e) => onUpdateRetryPolicy({ timeoutMinutes: Number(e.target.value) })}
                className="text-xs"
              />
            </div>
          </div>
        </div>

        {/* Governance toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { key: 'qualityChecksEnabled' as const, label: 'Quality Gate', description: 'Great Expectations assertions' },
            { key: 'piiMaskingEnabled' as const, label: 'PII Masking', description: 'SHA-256 salted hashing' },
          ].map((toggle) => (
            <button
              key={toggle.key}
              onClick={() => onUpdate({ [toggle.key]: !config[toggle.key] } as Partial<PipelineConfig>)}
              className={cn(
                'p-3 rounded-lg border text-left transition-all',
                config[toggle.key]
                  ? 'bg-emerald-500/10 border-emerald-500/40'
                  : 'bg-card border-border hover:border-border-highlight'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-primary">{toggle.label}</span>
                <span
                  className={cn(
                    'w-8 h-4 rounded-full relative transition-colors',
                    config[toggle.key] ? 'bg-emerald-500/60' : 'bg-border'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all',
                      config[toggle.key] ? 'left-4' : 'left-0.5'
                    )}
                  />
                </span>
              </div>
              <p className="text-[10px] text-text-secondary mt-1">{toggle.description}</p>
            </button>
          ))}

          <div className="space-y-1.5">
            <span className="text-[10px] text-text-secondary block">Alerting</span>
            <Select
              value={config.alertingChannel}
              onChange={(e) => onUpdate({ alertingChannel: e.target.value as PipelineConfig['alertingChannel'] })}
              className="text-xs"
              options={[
                { value: 'pagerduty', label: 'PagerDuty' },
                { value: 'slack', label: 'Slack' },
                { value: 'email', label: 'Email' },
                { value: 'none', label: 'None' },
              ]}
            />
          </div>
        </div>

        {/* SLA freshness */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
            Freshness SLA (minutes)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={120}
              value={config.slaFreshnessMinutes}
              onChange={(e) => onUpdate({ slaFreshnessMinutes: Number(e.target.value) })}
              className="flex-1 accent-indigo-500"
            />
            <Badge variant="ai" size="md" className="font-mono">
              {config.slaFreshnessMinutes} min
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
