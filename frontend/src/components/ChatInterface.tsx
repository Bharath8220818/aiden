import React, { useState, useRef, useEffect } from 'react';
import { pipelineApi } from '../api/pipelines';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type?: 'info' | 'success' | 'error';
}

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "👋 Hello! I'm AIDEN, your AI data engineering assistant. Tell me what pipeline you need, and I'll build it for you.",
      sender: 'ai',
      timestamp: new Date(),
      type: 'info',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestions = [
    'Build a daily sales pipeline from PostgreSQL to Snowflake',
    'Create a real-time IoT data pipeline with Kafka',
    'Set up a data quality monitoring pipeline',
    'Build a customer 360 pipeline from multiple sources',
  ];

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await pipelineApi.createFromPrompt(input);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `✅ **Pipeline "${response.name}" created successfully!**\n\n📊 **Source:** ${response.source_type}\n🎯 **Destination:** ${response.destination_type}\n⏰ **Schedule:** ${response.schedule}\n\nI'm now building and deploying your pipeline. You'll see it in the dashboard shortly.`,
        sender: 'ai',
        timestamp: new Date(),
        type: 'success',
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: '❌ Sorry, I encountered an error while building your pipeline. Please try again.',
        sender: 'ai',
        timestamp: new Date(),
        type: 'error',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-gray-50">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3xl rounded-lg p-4 ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white'
                  : msg.type === 'error'
                  ? 'bg-red-50 border border-red-200 text-red-800'
                  : msg.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-white border border-gray-200 text-gray-800'
              }`}
            >
              <div className="whitespace-pre-wrap text-sm md:text-base">{msg.text}</div>
              <div className="text-xs mt-2 opacity-60">
                {msg.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {messages.length === 1 && (
        <div className="px-4 pb-4">
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => {
                  setInput(suggestion);
                  setTimeout(() => handleSend(), 100);
                }}
                className="text-xs md:text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Describe the pipeline you need..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-6 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm md:text-base"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
