import React from 'react';
import { HealthCard } from './HealthCard';
import { SystemHealthService } from '../types';
import { ShieldCheck } from 'lucide-react';

export interface SystemHealthProps {
  services: SystemHealthService[];
}

export const SystemHealth: React.FC<SystemHealthProps> = ({ services }) => {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
            System Health
          </h2>
        </div>
        <span className="text-[11px] text-text-muted">
          All infrastructure operational
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {services.map((service) => (
          <HealthCard key={service.id} service={service} />
        ))}
      </div>
    </section>
  );
};
