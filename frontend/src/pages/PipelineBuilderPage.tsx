import React, { useState } from 'react';
import ChatInterface from '../components/chat/ChatInterface';
import PipelineCanvas from '../components/builder/PipelineCanvas';
import AgentManagerPanel from '../components/builder/AgentManagerPanel';

const PipelineBuilderPage: React.FC = () => {
  const [activePanel, setActivePanel] = useState<'chat' | 'canvas' | 'agents'>('chat');

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-gradient-to-r from-primary-600 via-indigo-600 to-cyan-600 text-white shadow-lg overflow-hidden">
        <div className="p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-100/80">AI-native pipeline studio</p>
              <h1 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">Build production pipelines with AI, faster.</h1>
              <p className="mt-4 text-sm sm:text-base text-cyan-100/90 max-w-2xl">
                Use natural language to design extract-transform-load workflows, preview them visually, and keep your AI agents in sync across the project.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <button className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-medium transition hover:bg-white/20">New prompt</button>
              <button className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-medium transition hover:bg-white/20">Templates</button>
              <button className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-primary-700">Run</button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[1.5rem] bg-white/10 p-4 border border-white/15 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.25em] text-cyan-100/80">Quick start</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {['ETL', 'Streaming', 'API', 'Batch'].map((type) => (
                  <span key={type} className="rounded-full border border-white/15 px-3 py-2 text-sm text-white/90">
                    {type}
                  </span>
                ))}
              </div>
              <div className="mt-4 rounded-3xl bg-white p-4 text-gray-900 shadow-sm">
                <p className="text-sm font-medium">Try this prompt</p>
                <p className="mt-2 text-sm text-gray-600">
                  Build a daily sales pipeline from PostgreSQL to Snowflake with quality checks and schedule it to run every morning.
                </p>
              </div>
            </div>
            <div className="rounded-[1.5rem] bg-white/10 p-4 border border-white/15 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.25em] text-cyan-100/80">Project quick actions</p>
              <div className="mt-4 space-y-3">
                {[
                  { icon: '⚡', label: 'Start new pipeline' },
                  { icon: '📁', label: 'Open templates' },
                  { icon: '📊', label: 'Review monitoring' },
                ].map((item) => (
                  <button
                    key={item.label}
                    className="w-full rounded-3xl bg-white/95 px-4 py-4 text-left text-sm font-medium text-gray-900 hover:bg-white"
                  >
                    <span className="mr-3 text-xl align-middle">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="space-y-4 xl:space-y-0 xl:grid xl:grid-cols-[320px_minmax(0,1fr)_320px] xl:items-start gap-6">
        <aside className="hidden xl:block xl:sticky xl:top-6">
          <div className="rounded-[2rem] bg-white border border-gray-200 shadow-sm overflow-hidden h-[calc(100vh-7rem)] flex flex-col">
            <div className="p-6 border-b border-gray-100">
              <p className="text-xs uppercase tracking-[0.2em] text-primary-600">Chat</p>
              <h2 className="mt-2 text-lg font-semibold text-gray-900">AIDEN conversation</h2>
              <p className="mt-2 text-sm text-gray-500">Ask AIDEN to build or refine your pipeline.</p>
            </div>
            <div className="flex-1 overflow-hidden">
              <ChatInterface />
            </div>
          </div>
        </aside>

        <main className="space-y-6">
          <div className="hidden xl:block">
            <PipelineCanvas />
          </div>

          <div className="xl:hidden bg-white rounded-[2rem] border border-gray-200 shadow-sm p-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[
                { id: 'chat', label: 'Chat' },
                { id: 'canvas', label: 'Canvas' },
                { id: 'agents', label: 'Agents' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActivePanel(tab.id as 'chat' | 'canvas' | 'agents')}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    activePanel === tab.id
                      ? 'bg-primary-600 text-white '
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="mt-4">
              {activePanel === 'chat' && <ChatInterface />}
              {activePanel === 'canvas' && <PipelineCanvas />}
              {activePanel === 'agents' && <AgentManagerPanel />}
            </div>
          </div>
        </main>

        <aside className="hidden xl:block xl:sticky xl:top-6">
          <AgentManagerPanel />
        </aside>
      </div>
    </div>
  );
};

export default PipelineBuilderPage;
