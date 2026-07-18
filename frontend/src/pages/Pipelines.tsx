import React, { useEffect, useState } from 'react';
import type { Pipeline } from '../types';
import { pipelineApi } from '../api/pipelines';
import PipelineCard from '../components/PipelineCard';

const PipelinesPage: React.FC = () => {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPipelines();
  }, []);

  const fetchPipelines = async () => {
    try {
      setLoading(true);
      const data = await pipelineApi.getAll();
      setPipelines(data);
    } catch (err) {
      setError('Failed to load pipelines');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this pipeline?')) return;

    try {
      await pipelineApi.delete(id);
      setPipelines((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError('Failed to delete pipeline');
      console.error(err);
    }
  };

  const handleRun = async (id: number) => {
    try {
      await pipelineApi.run(id);
      await fetchPipelines();
    } catch (err) {
      setError('Failed to run pipeline');
      console.error(err);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Pipelines</h2>
        <p className="text-gray-600 mt-2">Manage your data pipelines</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin">⏳</div>
          <p className="text-gray-600 mt-4">Loading pipelines...</p>
        </div>
      ) : pipelines.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📭</div>
          <p className="text-gray-600">No pipelines yet. Create one using the chat!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {pipelines.map((pipeline) => (
            <PipelineCard
              key={pipeline.id}
              pipeline={pipeline}
              onDelete={handleDelete}
              onRun={handleRun}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PipelinesPage;
