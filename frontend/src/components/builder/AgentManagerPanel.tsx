import React from 'react';

const agents = [
  {
    name: 'Ingestion Agent',
    status: 'Completed',
    description: 'Connected to PostgreSQL and scanned tables.',
    progress: 100,
    color: 'bg-green-100 text-green-800',
  },
  {
    name: 'Cleaning Agent',
    status: 'Running',
    description: 'Standardizing fields and deduplicating records.',
    progress: 70,
    color: 'bg-blue-100 text-blue-800',
  },
  {
    name: 'Pipeline Agent',
    status: 'Pending',
    description: 'Preparing load and monitoring steps.',
    progress: 30,
    color: 'bg-yellow-100 text-yellow-800',
  },
];

const AgentManagerPanel: React.FC = () => {
  return (
    <div className="bg-white rounded-[2rem] border border-gray-200 shadow-sm overflow-hidden h-full">
      <div className="p-6 border-b border-gray-100">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">Agent manager</p>
            <h2 className="text-xl font-semibold text-gray-900">AI agents running</h2>
          </div>
          <div className="text-sm text-gray-500">3 active workflows</div>
        </div>
      </div>
      <div className="p-6 space-y-4">
        <div className="rounded-3xl bg-gray-50 p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Current activity</p>
          <p className="mt-2 text-gray-900 font-medium">Analyzing schema, building the next pipeline steps, and generating code.</p>
        </div>
        <div className="space-y-3">
          {agents.map((agent) => (
            <div key={agent.name} className="rounded-3xl border border-gray-100 p-4 bg-white shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{agent.name}</h3>
                  <p className="text-xs text-gray-500">{agent.description}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${agent.color}`}>{agent.status}</span>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                  <span>Progress</span>
                  <span>{agent.progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary-600"
                    style={{ width: `${agent.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="p-6 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between text-sm text-gray-700">
          <span>Last sync</span>
          <span>2 minutes ago</span>
        </div>
      </div>
    </div>
  );
};

export default AgentManagerPanel;
