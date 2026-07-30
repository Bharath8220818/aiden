import { useState, useRef } from 'react';
import { Mic, Upload, Sparkles, Loader2 } from 'lucide-react';
import { useVoiceInput } from '../../hooks/useVoiceInput';

interface CommandBarProps {
  onGenerate: (input: string, file?: File) => Promise<void>;
  isGenerating: boolean;
  placeholder?: string;
}

export function CommandBar({
  onGenerate,
  isGenerating,
  placeholder = 'Describe your pipeline in plain English, speak, or upload a diagram...',
}: CommandBarProps) {
  const [input, setInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const { isListening, transcript, startListening, stopListening, reset } = useVoiceInput();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    const finalInput = transcript || input;
    if (!finalInput.trim()) return;
    await onGenerate(finalInput, file || undefined);
    setInput('');
    setFile(null);
    reset();
    if (isListening) stopListening();
  };

  return (
    <div className="glass-card p-4 transition-all duration-300">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={transcript || input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card-hover)] px-4 py-3 text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)] outline-none focus:border-purple-500/40 focus:ring-2 focus:ring-purple-500/20 transition-all"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            disabled={isListening}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {/* Upload button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-icon btn-sm"
              title="Upload diagram"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {/* Voice button */}
            <button
              onClick={isListening ? stopListening : startListening}
              className={`btn-icon btn-sm ${isListening ? '!bg-red-500/20 !text-red-500' : ''}`}
              title={isListening ? 'Stop listening' : 'Start voice input'}
            >
              <Mic className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={isGenerating || (!input.trim() && !transcript)}
          className="btn-primary-gradient px-6 py-3 disabled:opacity-50 flex items-center gap-2"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          Generate
        </button>
      </div>

      {/* File info */}
      {file && (
        <div className="mt-2 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <span>📎 {file.name}</span>
          <button onClick={() => setFile(null)} className="text-red-400 hover:text-red-300">×</button>
        </div>
      )}

      {/* Listening indicator */}
      {isListening && (
        <div className="mt-2 flex items-center gap-2 text-xs text-red-400">
          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          Listening... Speak your pipeline description
        </div>
      )}
    </div>
  );
}
