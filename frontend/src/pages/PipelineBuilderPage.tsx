import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePipelineStore } from '../store/pipelineStore';
import ChatInterface from '../components/chat/ChatInterface';
import PipelineCanvas from '../components/builder/PipelineCanvas';
import AgentManagerPanel from '../components/builder/AgentManagerPanel';

type Panel = 'chat' | 'canvas' | 'agents';

const PipelineBuilderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const pipelineId = id ? parseInt(id, 10) : undefined;
  const { currentPipeline } = usePipelineStore();

  const [activePanel, setActivePanel] = useState<Panel>('chat');
  const [pipelineName, setPipelineName] = useState(
    currentPipeline?.name || 'New Pipeline'
  );
  const [editingName, setEditingName] = useState(false);

  const tabs: { id: Panel; label: string; icon: React.ReactNode }[] = [
    {
      id: 'chat',
      label: 'Chat',
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      id: 'canvas',
      label: 'Canvas',
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      ),
    },
    {
      id: 'agents',
      label: 'Agents',
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
        </svg>
      ),
    },
  ];

  // Update pipeline name when currentPipeline changes
  React.useEffect(() => {
    if (currentPipeline?.name) {
      setPipelineName(currentPipeline.name);
    }
  }, [currentPipeline?.name]);

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* ── Builder Header ───────────────────────────── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/pipelines"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:bg-gray-50 hover:text-gray-900"
            title="Back to pipelines"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            {editingName ? (
              <input
                type="text"
                value={pipelineName}
                onChange={(e) => setPipelineName(e.target.value)}
                onBlur={() => setEditingName(false)}
                onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
                className="rounded-lg border border-blue-300 bg-white px-3 py-1 text-sm font-bold text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                autoFocus
              />
            ) : (
              <button
                onClick={() => setEditingName(true)}
                className="flex items-center gap-1.5 group"
              >
                <span className="text-sm font-bold text-gray-900 group-hover:text-blue-600">
                  {pipelineName}
                </span>
                <svg className="h-3.5 w-3.5 text-gray-400 opacity-0 transition group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            <p className="text-xs text-gray-500">
              {pipelineId ? `ID: #${pipelineId}` : 'New pipeline'}
            </p>
          </div>

          {/* Status badge */}
          {currentPipeline && (
            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium ${
              currentPipeline.status === 'running' ? 'bg-yellow-100 text-yellow-800' :
              currentPipeline.status === 'success' ? 'bg-green-100 text-green-800' :
              currentPipeline.status === 'failed' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-600'
            }`}>
              {currentPipeline.status || 'draft'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            id="builder-save-btn"
            className="btn-secondary px-3 py-2 text-xs"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Save
          </button>
          <button
            id="builder-run-btn"
            className="btn-primary px-3 py-2 text-xs"
            disabled={!currentPipeline}
            title={!currentPipeline ? 'Create a pipeline first' : 'Run pipeline'}
          >
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Run
          </button>
          <button
            id="builder-export-btn"
            className="btn-icon"
            title="Export"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Desktop 3-Panel Layout ───────────────────── */}
      <div className="hidden xl:grid xl:h-[calc(100vh-200px)] xl:grid-cols-[320px_1fr_280px] xl:gap-4">
        {/* Left: Chat Panel */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900">AIDEN Chat</p>
              <p className="text-[10px] text-gray-400">AI pipeline assistant</p>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span className="text-[10px] text-green-600 font-medium">Online</span>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatInterface />
          </div>
        </div>

        {/* Center: Canvas — pass pipelineId */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <PipelineCanvas pipelineId={pipelineId} />
        </div>

        {/* Right: Agents */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <AgentManagerPanel />
        </div>
      </div>

      {/* ── Mobile Tab Layout ────────────────────────── */}
      <div className="xl:hidden">
        {/* Tab Switcher */}
        <div className="mb-3 flex overflow-x-auto gap-1 rounded-xl border border-gray-100 bg-white p-1 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              id={`builder-tab-${tab.id}`}
              onClick={() => setActivePanel(tab.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all whitespace-nowrap ${
                activePanel === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Panel Content */}
        <div className="h-[calc(100vh-280px)] min-h-[400px] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          {activePanel === 'chat' && <ChatInterface />}
          {activePanel === 'canvas' && <PipelineCanvas pipelineId={pipelineId} />}
          {activePanel === 'agents' && <AgentManagerPanel />}
        </div>
      </div>
    </div>
  );
};

export default PipelineBuilderPage;
