import React, { useState, useRef, useEffect } from 'react';

interface MessageInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  externalValue?: string;
  onExternalChange?: (value: string) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSend, isLoading, externalValue, onExternalChange }) => {
  const [input, setInput] = useState('');

  const isControlled = externalValue !== undefined;
  const displayValue = isControlled ? externalValue : input;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    if (isControlled && onExternalChange) {
      onExternalChange(v);
    } else {
      setInput(v);
    }
  };
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    const value = isControlled ? displayValue : input;
    if (value.trim() && !isLoading) {
      onSend(value.trim());
      if (!isControlled) {
        setInput('');
      }
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [displayValue]);

  return (
    <div className="flex items-end gap-2">
      {/* Attachment button */}
      <button
        type="button"
        className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 shadow-sm transition hover:bg-gray-50 hover:text-gray-600"
        title="Attach file"
        disabled={isLoading}
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
      </button>

      {/* Input area */}
      <div className="relative flex-1">
        <textarea
          ref={textareaRef}
          id="chat-message-input"
          value={displayValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Describe the pipeline you need... (Enter to send)"
          className="w-full resize-none overflow-hidden rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 disabled:opacity-50"
          rows={1}
          disabled={isLoading}
        />
        {/* Character hint */}
        {displayValue.length > 0 && (
          <p className="absolute -bottom-4 right-1 text-[9px] text-gray-400">
            Shift+Enter for new line
          </p>
        )}
      </div>

      {/* Send button */}
      <button
        id="chat-send-btn"
        onClick={handleSubmit}
        disabled={isLoading || !displayValue.trim()}
        className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 active:scale-95"
        title="Send message"
      >
        {isLoading ? (
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        )}
      </button>
    </div>
  );
};

export default MessageInput;