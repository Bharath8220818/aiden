import React, { useState, useRef, useEffect } from 'react';
import { usePipelineStore } from '../../store/pipelineStore';
import { useNotificationStore } from '../../store/notificationStore';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import SuggestionChips from './SuggestionChips';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type?: 'info' | 'success' | 'error' | 'warning';
  isTyping?: boolean;
}

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "👋 Hello! I'm AIDEN, your AI data engineering assistant. I can help you build, manage, and monitor data pipelines. Just describe what you need, and I'll take care of the rest.\n\nHere are some things I can do:\n• Build pipelines from any data source\n• Clean and transform data\n• Schedule pipelines\n• Monitor pipeline health\n• Fix broken pipelines\n\nTry asking me to build a pipeline!",
      sender: 'ai',
      timestamp: new Date(),
      type: 'info',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { createFromPrompt } = usePipelineStore();
  const { addNotification } = useNotificationStore();

  const suggestions = [
    'Build a daily sales pipeline from PostgreSQL to Snowflake',
    'Create a real-time IoT data pipeline with Kafka and Spark',
    'Set up a data quality monitoring pipeline',
    'Build a customer 360 pipeline from multiple sources',
    'Create a pipeline that cleans and aggregates log data',
  ];

  const handleSendMessage = async (text: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Add typing indicator
    const typingId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      {
        id: typingId,
        text: '...',
        sender: 'ai',
        timestamp: new Date(),
        isTyping: true,
      },
    ]);

    try {
      const pipeline = await createFromPrompt(text);
      
      // Remove typing indicator
      setMessages((prev) => prev.filter((m) => m.id !== typingId));
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `✅ **Pipeline created successfully!**\n\n` +
              `📊 **Name:** ${pipeline.name}\n` +
              `🔗 **Source:** ${pipeline.source_type}\n` +
              `🎯 **Destination:** ${pipeline.destination_type}\n` +
              `⏰ **Schedule:** ${pipeline.schedule || 'Not scheduled'}\n` +
              `📋 **Status:** ${pipeline.status}\n\n` +
              `I've generated the pipeline code and deployed it. You can view it in the pipeline list.\n\n` +
              `What would you like to do next?`,
        sender: 'ai',
        timestamp: new Date(),
        type: 'success',
      };
      setMessages((prev) => [...prev, aiMessage]);
      
      addNotification({
        type: 'success',
        message: `Pipeline "${pipeline.name}" created successfully!`,
      });
    } catch (error: any) {
      setMessages((prev) => prev.filter((m) => m.id !== typingId));
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `❌ **Error:** ${error.message || 'Failed to create pipeline. Please try again.'}\n\n` +
              `This could be because:\n` +
              `• The backend service is not running\n` +
              `• There was an issue with your request\n` +
              `• The LLM service is not available\n\n` +
              `Please check your connection and try again.`,
        sender: 'ai',
        timestamp: new Date(),
        type: 'error',
      };
      setMessages((prev) => [...prev, errorMessage]);
      
      addNotification({
        type: 'error',
        message: 'Failed to create pipeline',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSuggestionSelect = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <MessageList messages={messages} />
        <div ref={messagesEndRef} />
      </div>
      
      {messages.length === 1 && (
        <div className="px-4 pb-2">
          <SuggestionChips suggestions={suggestions} onSelect={handleSuggestionSelect} />
        </div>
      )}
      
      <div className="border-t border-gray-200 p-4 bg-white">
        <MessageInput onSend={handleSendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default ChatInterface;