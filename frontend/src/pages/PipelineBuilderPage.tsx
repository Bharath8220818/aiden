import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Sparkles, Send, Play, Pause, Square, History, Save, MessageSquare, X, Paperclip, Mic
} from 'lucide-react';
import { usePipelineStore } from '../store/pipelineStore';
import { useNotificationStore } from '../store/notificationStore';
import { useWebSocket } from '../hooks/useWebSocket';
import PipelineCanvas from '../components/builder/PipelineCanvas';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  type?: 'success' | 'error' | 'info';
}

const PipelineBuilderPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { createFromPrompt, runPipeline, currentPipeline, isLoading } = usePipelineStore();
  const { addNotification } = useNotificationStore();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        "Hello! I'm AIDEN, your AI data engineering assistant. Describe the pipeline you need, and I'll build it for you.",
    },
  ]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [pipelineId, setPipelineId] = useState<number | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [pipelineData, setPipelineData] = useState<any>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Get prompt from navigation state
  const initialPrompt = location.state?.prompt as string | undefined;

  // WebSocket connection for live pipeline updates
  const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:8000'}/api/v1/ws`;
  const wsUrlFinal = pipelineId ? `${wsUrl}/pipeline-${pipelineId}` : wsUrl;
  const { isConnected, sendMessage } = useWebSocket({
    url: wsUrlFinal,
    onMessage: (data) => {
      if (data.type === 'pipeline_status') {
        addNotification({
          type: data.status === 'success' ? 'success' : data.status === 'error' ? 'error' : 'info',
          title: `Pipeline ${data.status}`,
          message: `Stage: ${data.stage || 'processing'}`,
        });
        if (data.status === 'success') setIsRunning(false);
      }
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatOpen]);

  // Auto-submit prompt if provided from dashboard
  useEffect(() => {
    if (initialPrompt) {
      handleSendMessage(initialPrompt);
    }
  }, [initialPrompt]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isGenerating) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsGenerating(true);

    try {
      const pipeline = await createFromPrompt(text);

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content:
            `✅ Pipeline "${pipeline.name}" created successfully!\n\n` +
            `**Source:** ${pipeline.source_type}\n` +
            `**Destination:** ${pipeline.destination_type}\n` +
            `**Schedule:** ${pipeline.schedule || 'Not scheduled'}\n\n` +
            `I've generated the pipeline code. You can view it in the canvas above.`,
          type: 'success',
        },
      ]);

      setPipelineId(pipeline.id);

      // Update canvas with pipeline data
      setPipelineData({
        nodes: [
          { id: 'source-1', label: `${pipeline.source_type}_Source`, status: 'success', type: 'source' },
          { id: 'transform-1', label: 'Transform', status: 'success', type: 'transform' },
          { id: 'dest-1', label: `${pipeline.destination_type}_Dest`, status: 'success', type: 'destination' },
        ],
        edges: [
          { source: 'source-1', target: 'transform-1' },
          { source: 'transform-1', target: 'dest-1' },
        ],
      });

      // Subscribe to pipeline updates via WebSocket
      sendMessage({
        type: 'subscribe',
        channel: 'pipeline_updates',
        pipeline_id: pipeline.id,
      });

      addNotification({
        type: 'success',
        title: 'Pipeline Created',
        message: `"${pipeline.name}" is ready!`,
      });
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `❌ Error: ${error.response?.data?.detail || error.message || 'Failed to create pipeline'}`,
          type: 'error',
        },
      ]);

      addNotification({
        type: 'error',
        title: 'Creation Failed',
        message: error.response?.data?.detail || error.message || 'Please try again',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRunPipeline = async () => {
    if (!pipelineId) return;
    setIsRunning(true);
    try {
      const execution = await runPipeline(pipelineId);
      addNotification({
        type: 'info',
        title: 'Pipeline Running',
        message: `Execution #${execution.id} started`,
      });
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Run Failed',
        message: error.response?.data?.detail || error.message || 'Please try again',
      });
      setIsRunning(false);
    }
  };

  const handleStopPipeline = () => {
    sendMessage({ type: 'stop', pipeline_id: pipelineId });
    setIsRunning(false);
    addNotification({ type: 'info', title: 'Pipeline Stopped', message: 'Execution halted by user' });
  };

  return (
    <div className="relative flex-1 w-full h-full overflow-hidden bg-[#050816]">
      {/* ── Background Canvas ── */}
      <div className="absolute inset-0">
        <PipelineCanvas
          pipeline={pipelineData}
          interactive={true}
          compact={false}
          className="w-full h-full"
        />
      </div>

      {/* ── Floating Bottom Controls ── */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 bg-[#111827]/90 backdrop-blur-md border border-[#1E293B] rounded-full z-20">
        <button
          onClick={isRunning ? () => {} : handleRunPipeline}
          className="text-gray-400 hover:text-green-400 transition-colors p-1"
          title={isRunning ? 'Running...' : 'Run'}
        >
          <Play size={20} className="fill-current" />
        </button>
        <div className="w-px h-5 bg-[#1E293B]" />
        <button
          onClick={() => {}}
          className="text-gray-400 hover:text-yellow-400 transition-colors p-1"
          title="Pause"
        >
          <Pause size={20} className="fill-current" />
        </button>
        <div className="w-px h-5 bg-[#1E293B]" />
        <button
          onClick={handleStopPipeline}
          className="text-gray-400 hover:text-red-400 transition-colors p-1"
          title="Stop"
        >
          <Square size={20} className="fill-current" />
        </button>
        <div className="w-px h-5 bg-[#1E293B]" />
        <button
          onClick={() => navigate('/pipelines')}
          className="text-gray-400 hover:text-white transition-colors p-1"
          title="History"
        >
          <History size={20} />
        </button>
        <div className="w-px h-5 bg-[#1E293B]" />
        <button
          onClick={() => addNotification({ type: 'success', title: 'Saved', message: 'Pipeline saved' })}
          className="text-gray-400 hover:text-white transition-colors p-1"
          title="Save"
        >
          <Save size={20} />
        </button>

        {/* Connection indicator */}
        <div className="w-px h-5 bg-[#1E293B]" />
        <div className={`flex items-center gap-1.5 text-xs ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          {isConnected ? 'Live' : 'Offline'}
        </div>
      </div>

      {/* ── Floating Chat Toggle ── */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="absolute bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] text-white shadow-lg shadow-purple-500/30 flex items-center justify-center hover:scale-105 transition-transform z-20"
        >
          <MessageSquare size={24} />
        </button>
      )}

      {/* ── Collapsible Agent Chat Panel ── */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute bottom-6 right-6 w-96 max-h-[600px] h-[calc(100vh-120px)] bg-[#111827]/95 backdrop-blur-xl border border-[#1E293B] rounded-3xl shadow-lg flex flex-col overflow-hidden z-30"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E293B] shrink-0 bg-[#050816]/50">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center shadow-md">
                  <Sparkles size={14} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">AI Agent</h3>
                  <p className="text-[10px] text-green-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Online
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-br-sm'
                        : 'bg-[#1E293B] border border-[#2D3748] text-gray-200 rounded-bl-sm'
                    }`}
                  >
                    {msg.content}
                    {msg.isStreaming && (
                      <span className="inline-block w-1.5 h-4 bg-purple-400 animate-pulse ml-1 align-text-bottom" />
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-[#1E293B] shrink-0 bg-[#050816]/50">
              <div className="flex items-center gap-2 bg-[#050816] rounded-2xl border border-[#1E293B] p-1.5 focus-within:border-purple-500/50 transition-all">
                <button className="p-2 hover:bg-white/5 rounded-xl transition-colors text-gray-400" title="Attach">
                  <Paperclip size={16} />
                </button>
                <button className="p-2 hover:bg-white/5 rounded-xl transition-colors text-gray-400" title="Voice">
                  <Mic size={16} />
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(input)}
                  placeholder={isLoading ? 'Creating pipeline...' : 'Describe your pipeline...'}
                  className="flex-1 bg-transparent border-none outline-none text-sm text-white px-2 placeholder-gray-500"
                  disabled={isLoading}
                />
                <button
                  onClick={() => handleSendMessage(input)}
                  disabled={!input.trim() || isGenerating || isLoading}
                  className="p-2 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PipelineBuilderPage;
