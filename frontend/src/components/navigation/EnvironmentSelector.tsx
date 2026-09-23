import React from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { Dropdown } from '@/components/ui/Dropdown';
import { ChevronDown, Check } from 'lucide-react';
import { ENVIRONMENTS } from '@/lib/constants';
import { Environment } from '@/types/common';

export const EnvironmentSelector: React.FC = () => {
  const { currentEnvironment, setEnvironment } = useWorkspaceStore();

  const activeEnvConfig = ENVIRONMENTS.find((e) => e.id === currentEnvironment) || ENVIRONMENTS[0];

  const trigger = (
    <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-card-hover text-left transition-colors border border-border">
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: activeEnvConfig.color }}
      />
      <span className="text-xs font-medium text-text-primary">
        {activeEnvConfig.label}
      </span>
      <ChevronDown className="w-3.5 h-3.5 text-text-secondary" />
    </button>
  );

  return (
    <Dropdown trigger={trigger} align="left" className="w-48">
      <div className="p-2 border-b border-border">
        <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
          Environment
        </p>
      </div>
      <div className="p-1 space-y-1">
        {ENVIRONMENTS.map((env) => (
          <button
            key={env.id}
            onClick={() => setEnvironment(env.id as Environment)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md text-text-primary hover:bg-card-active transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: env.color }}
              />
              <span className="font-medium text-xs text-text-primary">{env.label}</span>
            </div>
            {env.id === currentEnvironment && (
              <Check className="w-3.5 h-3.5 text-indigo-600" />
            )}
          </button>
        ))}
      </div>
    </Dropdown>
  );
};
