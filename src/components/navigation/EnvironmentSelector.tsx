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
    <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-[#1A1D24] text-left transition-colors border border-[#242831]">
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: activeEnvConfig.color }}
      />
      <span className="text-xs font-medium text-[#F5F7FA]">
        {activeEnvConfig.label}
      </span>
      <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF]" />
    </button>
  );

  return (
    <Dropdown trigger={trigger} align="left" className="w-48">
      <div className="p-2 border-b border-[#242831]">
        <p className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">
          Environment
        </p>
      </div>
      <div className="p-1 space-y-1">
        {ENVIRONMENTS.map((env) => (
          <button
            key={env.id}
            onClick={() => setEnvironment(env.id as Environment)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md text-[#F5F7FA] hover:bg-[#1F242C] transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: env.color }}
              />
              <span className="font-medium text-xs text-[#F5F7FA]">{env.label}</span>
            </div>
            {env.id === currentEnvironment && (
              <Check className="w-3.5 h-3.5 text-indigo-400" />
            )}
          </button>
        ))}
      </div>
    </Dropdown>
  );
};
