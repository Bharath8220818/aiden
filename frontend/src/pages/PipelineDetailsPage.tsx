import React from 'react';
import { useParams } from 'react-router-dom';
import { usePipelineStore } from '../store/pipelineStore';
import LoadingSpinner from '../components/common/LoadingSpinner';

const PipelineDetailsPage: React.FC = () => {
  const { id } = useParams();
  const { currentPipeline, fetchPipeline, isLoading } = usePipelineStore();

  React.useEffect(() => {
    if (id) fetchPipeline(Number(id));
  }, [id, fetchPipeline]);

  if (isLoading) return <LoadingSpinner size="lg" />;
  if (!currentPipeline) return <div>Pipeline not found</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">{currentPipeline.name}</h1>
      <p>{currentPipeline.description}</p>
    </div>
  );
};

export default PipelineDetailsPage;
