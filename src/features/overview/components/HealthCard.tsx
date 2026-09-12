import React from 'react';
import { Card } from '@/components/ui/Card';
import { SystemHealthService } from '../types';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';

export interface HealthCardProps {
  service: SystemHealthService;
}

export const HealthCard: React.FC<HealthCardProps> = ({ service }) => {
  const IconComponent =
    (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[service.iconName] ||
    LucideIcons.Server;

  return (
    <Card
      hoverable
      className="p-4 flex flex-col justify-between bg-[#14171C] border-[#242831] hover:border-[#383F4D] transition-all duration-200 group"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#1A1D24] border border-[#242831] flex items-center justify-center text-[#9CA3AF] group-hover:text-indigo-400 group-hover:border-indigo-500/30 transition-colors">
            <IconComponent className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-[#F5F7FA]">{service.name}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  service.status === 'active' ? 'bg-cyan-400' : 'bg-emerald-400',
                  'animate-pulse-dot'
                )}
              />
              <span className="text-[11px] font-medium text-[#9CA3AF]">
                {service.statusLabel}
              </span>
            </div>
          </div>
        </div>

        {service.latency && (
          <span className="text-[10px] text-[#6B7280] font-mono">
            {service.latency}
          </span>
        )}
      </div>

      <div className="pt-2 border-t border-[#1F242C] flex items-baseline justify-between">
        <span className="text-lg font-bold tracking-tight text-[#F5F7FA] font-mono">
          {service.metric}
        </span>
        <span className="text-[10px] text-[#9CA3AF]">
          {service.metricLabel}
        </span>
      </div>
    </Card>
  );
};
