import React, { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { usePipelineStore } from '../store/pipelineStore';
import { Link } from 'react-router-dom';
import StatsCard from '../components/dashboard/StatsCard';

const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const { pipelines, executions, fetchPipelines, fetchExecutions } = usePipelineStore();
  const [prompt, setPrompt] = useState('Build a daily sales pipeline from PostgreSQL to Snowflake');
  const [selectedTemplate, setSelectedTemplate] = useState('Sales Pipeline');

  useEffect(() => {
    fetchPipelines();
    fetchExecutions(0);
  }, []);

  const totalPipelines = pipelines.length;
  const runningPipelines = pipelines.filter((p) => p.status === 'running').length;
  const failedPipelines = pipelines.filter((p) => p.status === 'failed').length;
  const successRate = executions.length > 0
    ? (executions.filter((e) => e.status === 'success').length / executions.length) * 100
    : 0;

  const recentPipelines = useMemo(() => pipelines.slice(0, 4), [pipelines]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 lg:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-600">Project dashboard</p>
              <h1 className="mt-3 text-3xl font-semibold text-gray-900">Welcome back, {user?.full_name || 'User'}!</h1>
              <p className="mt-3 text-gray-500 max-w-2xl">
                Launch a new pipeline, inspect recent runs, or continue where you left off.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Link to="/builder" className="rounded-3xl bg-primary-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-primary-700">
                Start a pipeline
              </Link>
              <Link to="/pipelines" className="rounded-3xl bg-gray-100 px-4 py-3 text-center text-sm font-semibold text-gray-700 hover:bg-gray-200">
                My pipelines
              </Link>
              <Link to="/monitoring" className="rounded-3xl bg-gray-100 px-4 py-3 text-center text-sm font-semibold text-gray-700 hover:bg-gray-200">
                Monitoring
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-[2fr_1fr]">
            <div className="rounded-[1.5rem] bg-primary-50 p-6 border border-primary-100">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-primary-700 font-semibold">Pipeline prompt</p>
                  <p className="mt-1 text-sm text-primary-800">Describe the pipeline you'd like AIDEN to create.</p>
                </div>
                <button className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-primary-700 shadow-sm hover:bg-gray-50">
                  Use prompt
                </button>
              </div>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={3}
                className="mt-4 w-full rounded-3xl border border-primary-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
              />
              <div className="mt-4 flex flex-wrap gap-2">
                {['Sales', 'IoT', 'Customer 360', 'Data Quality'].map((template) => (
                  <button
                    key={template}
                    type="button"
                    onClick={() => setSelectedTemplate(template)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      selectedTemplate === template
                        ? 'bg-primary-600 text-white'
                        : 'bg-white text-gray-700 border border-primary-100 hover:bg-primary-50'
                    }`}
                  >
                    {template}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-[1.5rem] bg-white border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">Template highlights</p>
                <span className="text-xs uppercase tracking-[0.2em] text-gray-500">AI ready</span>
              </div>
              <p className="mt-4 text-sm text-gray-500">
                {selectedTemplate} template is ready to generate a workflow with source, transform, and destination logic.
              </p>
              <div className="mt-6 space-y-3">
                {[
                  { label: 'Source integration', value: 'PostgreSQL' },
                  { label: 'Destination', value: 'Snowflake' },
                  { label: 'Quality checks', value: 'Enabled' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-3xl bg-gray-50 px-4 py-3">
                    <span className="text-sm text-gray-600">{item.label}</span>
                    <span className="text-sm font-medium text-gray-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="rounded-[2rem] bg-white border border-gray-200 shadow-sm p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Recent pipelines</h2>
              <p className="text-sm text-gray-500">Track status across your latest projects.</p>
            </div>
            <Link to="/pipelines" className="text-sm font-semibold text-primary-600 hover:text-primary-700">
              View all
            </Link>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {recentPipelines.length > 0 ? (
              recentPipelines.map((pipeline) => (
                <div key={pipeline.id} className="rounded-3xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{pipeline.name}</p>
                      <p className="mt-1 text-xs text-gray-500 truncate">{pipeline.description}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      pipeline.status === 'running'
                        ? 'bg-blue-100 text-blue-800'
                        : pipeline.status === 'failed'
                        ? 'bg-red-100 text-red-800'
                        : pipeline.status === 'success'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                    >
                      {pipeline.status}
                    </span>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div className="h-full rounded-full bg-primary-600" style={{ width: `${Math.min(100, Math.max(15, pipeline.progress || 0))}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">Updated {pipeline.updated_at ? new Date(pipeline.updated_at).toLocaleString() : 'recently'}</p>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-gray-200 p-8 text-center text-gray-500">
                No recent pipelines yet. Start one from the prompt above.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[2rem] bg-white border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900">Performance snapshot</h2>
          <p className="text-sm text-gray-500 mt-1">A quick look at your pipeline health, runs, and trends.</p>

          <div className="mt-6 grid gap-4">
            <StatsCard title="Total Pipelines" value={totalPipelines} icon="📊" color="blue" />
            <StatsCard title="Running" value={runningPipelines} icon="🔄" color="green" />
            <StatsCard title="Failed" value={failedPipelines} icon="❌" color="red" />
            <StatsCard title="Success Rate" value={`${successRate.toFixed(1)}%`} icon="✅" color="purple" />
          </div>
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
