import { Mic, Square, Loader2 } from 'lucide-react';
import { useVoiceInput } from '../../hooks/useVoiceInput';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function VoiceInput({ onTranscript, disabled }: VoiceInputProps) {
  const { isListening, transcript, isSupported, startListening, stopListening } = useVoiceInput();

  if (!isSupported) {
    return (
      <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
        <Mic className="w-4 h-4" />
        Voice input not supported in this browser
      </div>
    );
  }

  const handleToggle = () => {
    if (isListening) {
      stopListening();
      if (transcript.trim()) onTranscript(transcript);
    } else {
      startListening();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleToggle}
        disabled={disabled}
        className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
          isListening
            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
            : 'bg-[var(--color-card-hover)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:border-purple-500/20'
        }`}
      >
        {isListening ? (
          <>
            <Square className="w-4 h-4" />
            Stop
          </>
        ) : (
          <>
            <Mic className="w-4 h-4" />
            Voice
          </>
        )}
      </button>
      {isListening && (
        <span className="flex items-center gap-1 text-xs text-red-400 animate-pulse">
          <Loader2 className="w-3 h-3 animate-spin" />
          Recording...
        </span>
      )}
      {transcript && !isListening && (
        <span className="text-xs text-green-400">✓ Transcribed</span>
      )}
    </div>
  );
}
