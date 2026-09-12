import React from 'react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { Dropdown } from '@/components/ui/Dropdown';
import { ChevronDown, Check, Plus, FolderKanban } from 'lucide-react';

export const WorkspaceSelector: React.FC = () => {
  const { currentWorkspace, workspaces, setWorkspace } = useWorkspaceStore();

  const trigger = (
    <button className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-[#1A1D24] text-left transition-colors border border-transparent hover:border-[#242831]">
      <div className="w-5 h-5 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
        <FolderKanban className="w-3.5 h-3.5" />
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-[#F5F7FA] leading-none max-w-[140px] truncate">
          {currentWorkspace.name}
        </span>
      </div>
      <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF]" />
    </button>
  );

  return (
    <Dropdown trigger={trigger} align="left" className="w-64">
      <div className="p-2 border-b border-[#242831]">
        <p className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">
          Workspaces
        </p>
      </div>
      <div className="p-1 space-y-1">
        {workspaces.map((ws) => (
          <button
            key={ws.id}
            onClick={() => setWorkspace(ws)}
            className="w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-md text-[#F5F7FA] hover:bg-[#1F242C] transition-colors text-left"
          >
            <div className="flex flex-col">
              <span className="font-medium text-sm text-[#F5F7FA]">{ws.name}</span>
              <span className="text-[11px] text-[#9CA3AF]">
                {ws.pipelinesCount} pipelines • {ws.role}
              </span>
            </div>
            {ws.id === currentWorkspace.id && (
              <Check className="w-4 h-4 text-indigo-400" />
            )}
          </button>
        ))}
      </div>
      <div className="p-1 border-t border-[#242831]">
        <button
          onClick={() => alert('Create Workspace modal will open in Phase 6')}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-[#1F242C] rounded-md transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Workspace</span>
        </button>
      </div>
    </Dropdown>
  );
};
