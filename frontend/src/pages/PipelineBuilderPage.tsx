import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePipelineStore } from '../store/pipelineStore';
import ChatInterface from '../components/chat/ChatInterface';
import PipelineCanvas from '../components/builder/PipelineCanvas';
import AgentManagerPanel from '../components/builder/AgentManagerPanel';
import { MessageSquare, LayoutGrid, Bot, Save, Play, Download, ChevronLeft, Edit2, Check } from 'lucide-react';

type Panel = 'chat' | 'canvas' | 'agents';

const PipelineBuilderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const pipelineId = id ? parseInt(id, 10) : undefined;
  const { currentPipeline } = usePipelineStore();

  const [activePanel, setActivePanel] = useState<Panel>('canvas');
  const [laptopSidePanel, setLaptopSidePanel] = useState<'chat' | 'agents'>('chat');
  const [pipelineName, setPipelineName] = useState(
    currentPipeline?.name || 'New Pipeline'
  );
  const [editingName, setEditingName] = useState(false);

  const tabs: { id: Panel; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'canvas', label: 'Canvas', icon: LayoutGrid },
    { id: 'chat', label: 'AI Assistant', icon: MessageSquare },
    { id: 'agents', label: 'Agents', icon: Bot },
  ];

  // Update pipeline name when currentPipeline changes
  React.useEffect(() => {
    if (currentPipeline?.name) {
      setPipelineName(currentPipeline.name);
    }
  }, [currentPipeline?.name]);

  return (
    <div className="flex flex-col gap-3 sm:gap-4 animate-fade-in min-h-[calc(100vh-140px)]">
      {/* ── Builder Header ───────────────────────────── */}
      <div className="card p-3 sm:p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between dark:bg-gray-800 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <Link
            to="/pipelines"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 shadow-sm transition hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-white"
            title="Back to pipelines"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            {editingName ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={pipelineName}
                  onChange={(e) => setPipelineName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
                  className="input px-2.5 py-1 text-sm font-bold max-w-[200px] sm:max-w-xs"
                  autoFocus
                />
                <button
                  onClick={() => setEditingName(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-600 text-white"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingName(true)}
                className="flex items-center gap-1.5 group text-left max-w-full"
              >
                <span className="text-sm sm:text-base font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                  {pipelineName}
                </span>
                <Edit2 className="h-3.5 w-3.5 text-gray-400 opacity-0 transition group-hover:opacity-100 shrink-0" />
              </button>
            )}
            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
              {pipelineId ? `ID: #${pipelineId}` : 'New pipeline'}
              {currentPipeline?.source_type && ` · ${currentPipeline.source_type} → ${currentPipeline.destination_type}`}
            </p>
          </div>

          {/* Status badge */}
          {currentPipeline && (
            <span className={`shrink-0 badge ${
              currentPipeline.status === 'running' ? 'badge-warning' :
              currentPipeline.status === 'success' ? 'badge-success' :
              currentPipeline.status === 'failed' ? 'badge-error' :
              'badge-gray'
            }`}>
              {currentPipeline.status || 'draft'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            id="builder-save-btn"
            className="btn-secondary px-3 py-2 text-xs flex items-center gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Save</span>
          </button>
          <button
            id="builder-run-btn"
            className="btn-primary px-3 py-2 text-xs flex items-center gap-1.5"
            disabled={!currentPipeline}
            title={!currentPipeline ? 'Create a pipeline first' : 'Run pipeline'}
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Run</span>
          </button>
          <button
            id="builder-export-btn"
            className="btn-icon h-9 w-9 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            title="Export DAG JSON"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Desktop 3-Panel Layout (>= 1280px) ───────────────────── */}
      <div className="hidden xl:grid xl:h-[calc(100vh-210px)] xl:grid-cols-[320px_1fr_280px] xl:gap-4">
        {/* Left: Chat Panel */}
        <div className="card flex flex-col overflow-hidden p-0 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 px-4 py-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
              <MessageSquare className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900 dark:text-white">AIDEN Chat</p>
              <p className="text-[10px] text-gray-400">AI pipeline architect</p>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">Ready</span>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatInterface />
          </div>
        </div>

        {/* Center: Canvas */}
        <div className="card overflow-hidden p-0 dark:bg-gray-800 dark:border-gray-700">
          <PipelineCanvas pipelineId={pipelineId} />
        </div>

        {/* Right: Agents */}
        <div className="card overflow-hidden p-0 dark:bg-gray-800 dark:border-gray-700">
          <AgentManagerPanel />
        </div>
      </div>

      {/* ── Laptop 2-Panel Layout (768px to 1279px) ────────────────────────── */}
      <div className="hidden md:grid xl:hidden md:h-[calc(100vh-210px)] md:grid-cols-[1fr_340px] md:gap-3">
        {/* Main Canvas */}
        <div className="card overflow-hidden p-0 dark:bg-gray-800 dark:border-gray-700">
          <PipelineCanvas pipelineId={pipelineId} />
        </div>

        {/* Right Side Switchable Drawer (Chat or Agents) */}
        <div className="card flex flex-col overflow-hidden p-0 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 p-1">
            <button
              onClick={() => setLaptopSidePanel('chat')}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
                laptopSidePanel === 'chat'
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              AI Assistant
            </button>
            <button
              onClick={() => setLaptopSidePanel('agents')}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
                laptopSidePanel === 'agents'
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              <Bot className="h-3.5 w-3.5" />
              Agents Panel
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            {laptopSidePanel === 'chat' ? <ChatInterface /> : <AgentManagerPanel />}
          </div>
        </div>
      </div>

      {/* ── Mobile View (< 768px) ────────────────────────── */}
      <div className="flex flex-col md:hidden space-y-3">
        {/* Tab Switcher */}
        <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1 shadow-sm">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                id={`builder-tab-${tab.id}`}
                onClick={() => setActivePanel(tab.id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
                  activePanel === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Panel Content Box */}
        <div className="card p-0 h-[calc(100vh-230px)] min-h-[420px] overflow-hidden dark:bg-gray-800 dark:border-gray-700">
          {activePanel === 'canvas' && <PipelineCanvas pipelineId={pipelineId} />}
          {activePanel === 'chat' && <ChatInterface />}
          {activePanel === 'agents' && <AgentManagerPanel />}
        </div>
      </div>
    </div>
  );
};

export default PipelineBuilderPage;

