import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Real speech-to-text for the universal input (Web Speech API).
 *
 * - Chrome/Edge: webkitSpeechRecognition — live interim results while holding
 *   the conversation open, final transcripts appended to the target field.
 * - Firefox/Safari-older: unsupported → `isSupported` false so the mic button
 *   renders disabled with an explanatory tooltip instead of silently failing.
 * - Microphone permission denied / no speech: surfaces the error honestly.
 */

interface SpeechRecognitionAlternative {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternative;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechRecognitionResultLike };
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface UseSpeechRecognitionResult {
  /** True when the browser exposes a SpeechRecognition implementation. */
  isSupported: boolean;
  isListening: boolean;
  /** Final transcripts accumulated this session (joined by spaces). */
  transcript: string;
  /** In-progress partial transcript for the current utterance. */
  interim: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  /** Stop and clear accumulated transcript (call after consuming it). */
  reset: () => void;
  /** Append a manually typed correction — keeps transcript single source. */
  appendManual: (text: string) => void;
}

export function useSpeechRecognition(): UseSpeechRecognitionResult {
  const [isSupported] = useState<boolean>(() => getRecognitionCtor() !== null);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  /** Set when the user explicitly stopped — onend must not auto-restart. */
  const userStoppedRef = useRef(false);

  const stop = useCallback(() => {
    userStoppedRef.current = true;
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
    }
    setIsListening(false);
    setInterim('');
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    }
    setError(null);
    userStoppedRef.current = false;

    const rec = new Ctor();
    rec.lang = navigator.language || 'en-US';
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (event) => {
      let finalChunk = '';
      let interimChunk = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) {
          finalChunk += result[0].transcript;
        } else {
          interimChunk += result[0].transcript;
        }
      }
      if (finalChunk) {
        setTranscript((prev) => (prev ? `${prev} ${finalChunk.trim()}` : finalChunk.trim()));
      }
      setInterim(interimChunk);
    };

    rec.onerror = (event) => {
      const code = event.error;
      if (code === 'no-speech') return; // benign — keep listening
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        setError('Microphone permission denied. Enable it in your browser settings.');
        userStoppedRef.current = true;
        setIsListening(false);
        return;
      }
      if (code === 'aborted') return;
      setError(`Speech recognition error: ${code}`);
    };

    rec.onend = () => {
      // Chrome ends the session periodically — restart unless the user stopped,
      // so continuous dictation survives longer conversations.
      if (!userStoppedRef.current) {
        try {
          rec.start();
          return;
        } catch {
          /* fall through to stop state */
        }
      }
      setIsListening(false);
      setInterim('');
    };

    recognitionRef.current = rec;
    try {
      rec.start();
      setIsListening(true);
    } catch {
      setError('Could not start the microphone. Is another app using it?');
      setIsListening(false);
    }
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setInterim('');
    setError(null);
  }, []);

  const appendManual = useCallback((text: string) => {
    setTranscript((prev) => (prev ? `${prev} ${text}` : text));
  }, []);

  useEffect(
    () => () => {
      // Unmount cleanup — never leak a live mic session.
      userStoppedRef.current = true;
      const rec = recognitionRef.current;
      if (rec) {
        try {
          rec.abort();
        } catch {
          /* ignore */
        }
      }
    },
    []
  );

  return { isSupported, isListening, transcript, interim, error, start, stop, reset, appendManual };
}
