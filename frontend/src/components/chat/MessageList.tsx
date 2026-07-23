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

const typeConfig = {
  success: { border: 'border-green-200', bg: 'bg-green-50', text: 'text-green-800', icon: '✅' },
  error:   { border: 'border-red-200',   bg: 'bg-red-50',   text: 'text-red-800',   icon: '❌' },
  warning: { border: 'border-yellow-200', bg: 'bg-yellow-50', text: 'text-yellow-800', icon: '⚠️' },
  info:    { border: 'border-blue-100',  bg: 'bg-blue-50',  text: 'text-blue-800',  icon: '💡' },
};

const formatMessage = (text: string) =>
  text.split('\n').map((line, i, arr) => (
    <React.Fragment key={i}>
      {line.startsWith('•') ? (
        <span className="ml-2 flex items-start gap-1.5">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current opacity-60" />
          {line.slice(1).trim()}
        </span>
      ) : (
        line
      )}
      {i < arr.length - 1 && <br />}
    </React.Fragment>
  ));

const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  return (
    <div className="space-y-4">
      {messages.map((message) => {
        if (message.sender === 'user') {
          return (
            <div key={message.id} className="flex justify-end animate-fade-in">
              <div className="flex flex-col items-end gap-1 max-w-[82%]">
                <div className="chat-bubble-user">
                  <div className="whitespace-pre-wrap leading-relaxed">{formatMessage(message.text)}</div>
                </div>
                <span className="text-[10px] text-gray-400 px-1">
                  {formatDistanceToNow(message.timestamp, { addSuffix: true })}
                </span>
              </div>
            </div>
          );
        }

        // Typing indicator
        if (message.isTyping) {
          return (
            <div key={message.id} className="flex items-end gap-2 animate-fade-in">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-sm">
                A
              </div>
              <div className="chat-bubble-ai">
                <div className="flex items-center gap-1.5 px-1 py-0.5">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            </div>
          );
        }

        // AI message
        const typeMeta = message.type ? typeConfig[message.type] : null;

        return (
          <div key={message.id} className="flex items-end gap-2 animate-fade-in">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-sm">
              A
            </div>
            <div className="flex flex-col items-start gap-1 max-w-[85%]">
              {typeMeta ? (
                <div className={`rounded-2xl rounded-tl-sm border p-3.5 text-sm ${typeMeta.border} ${typeMeta.bg} ${typeMeta.text}`}>
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {formatMessage(message.text)}
                  </div>
                </div>
              ) : (
                <div className="chat-bubble-ai">
                  <div className="whitespace-pre-wrap leading-relaxed text-gray-800">
                    {formatMessage(message.text)}
                  </div>
                </div>
              )}
              <span className="text-[10px] text-gray-400 px-1">
                {formatDistanceToNow(message.timestamp, { addSuffix: true })}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MessageList;