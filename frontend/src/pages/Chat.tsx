import React, { useEffect } from 'react';
import ChatInterface from '../components/ChatInterface';
import { usePipelineStore } from '../store/pipelineStore';

const ChatPage: React.FC = () => {
  const { pipelines, fetchPipelines, isLoading } = usePipelineStore();

  useEffect(() => {
    fetchPipelines();
  }, [fetchPipelines]);

  return (
    <div className="flex flex-col lg:flex-row gap-4 md:gap-6 p-4 md:p-6 h-[calc(100vh-80px)]">
      {/* Chat Interface */}
      <div className="flex-1 lg:w-2/3">
        <ChatInterface />
      </div>

      {/* Recent Pipelines Sidebar */}
      <div className="hidden lg:flex lg:w-1/3 flex-col bg-gray-50 rounded-lg p-4 md:p-6 border border-gray-200 overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Pipelines</h3>
        
        {isLoading ? (
          <div className="text-center py-8">
            <div className="text-2xl mb-2">⏳</div>
            <p className="text-sm text-gray-600">Loading...</p>
          </div>
        ) : pipelines.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-2xl mb-2">📭</div>
            <p className="text-sm text-gray-600">No pipelines yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pipelines.slice(0, 5).map((pipeline) => (
              <div
                key={pipeline.id}
                className="bg-white rounded-lg p-3 border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
              >
                <h4 className="font-medium text-sm text-gray-900 truncate">{pipeline.name}</h4>
                <p className="text-xs text-gray-600 mt-1">
                  {pipeline.source_type} → {pipeline.destination_type}
                </p>
                <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-medium ${
                  pipeline.status === 'running' ? 'bg-blue-100 text-blue-800' :
                  pipeline.status === 'success' ? 'bg-green-100 text-green-800' :
                  pipeline.status === 'failed' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {pipeline.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
