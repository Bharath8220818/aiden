import React from 'react';
import { formatDistanceToNow } from 'date-fns';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type?: 'info' | 'success' | 'error' | 'warning';
  isTyping?: boolean;
}

interface MessageListProps {
  messages: Message[];
}

const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const getMessageStyles = (message: Message) => {
    if (message.sender === 'user') {
      return 'bg-primary-600 text-white';
    }
    
    if (message.isTyping) {
      return 'bg-white border border-gray-200 text-gray-500';
    }
    
    switch (message.type) {
      case 'success':
        return 'bg-green-50 border border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border border-yellow-200 text-yellow-800';
      default:
        return 'bg-white border border-gray-200 text-gray-800';
    }
  };

  const formatMessage = (text: string) => {
    return text.split('\n').map((line, i) => (
      <React.Fragment key={i}>
        {line}
        {i < text.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-3xl rounded-lg p-4 ${getMessageStyles(message)}`}
          >
            {message.isTyping ? (
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
            ) : (
              <>
                <div className="whitespace-pre-wrap">{formatMessage(message.text)}</div>
                <div className={`text-xs mt-1 ${
                  message.sender === 'user' ? 'text-primary-200' : 'text-gray-400'
                }`}>
                  {formatDistanceToNow(message.timestamp, { addSuffix: true })}
                </div>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MessageList;