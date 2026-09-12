import React, { useState, useEffect } from 'react';
import { AudioPayload } from '../types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Mic, Square, Play, Pause, RefreshCw, FileText, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AudioInputCardProps {
  payload: AudioPayload;
  onChange: (updates: Partial<AudioPayload>) => void;
  onApplyTranscriptToText?: (transcript: string) => void;
}

export const AudioInputCard: React.FC<AudioInputCardProps> = ({
  payload,
  onChange,
  onApplyTranscriptToText,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(payload.durationSeconds);

  useEffect(() => {
    let interval: number;
    if (isRecording) {
      interval = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleToggleRecord = () => {
    if (isRecording) {
      setIsRecording(false);
      onChange({
        isRecording: false,
        durationSeconds: recordingSeconds,
      });
    } else {
      setIsRecording(true);
      setRecordingSeconds(0);
      onChange({ isRecording: true });
    }
  };

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      setTimeout(() => setIsPlaying(false), 4000);
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Recording Control & Equalizer */}
      <div className="p-4 rounded-lg bg-[#0B0D10] border border-[#242831] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            size="md"
            variant={isRecording ? 'danger' : 'ai'}
            onClick={handleToggleRecord}
            leftIcon={isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            className={cn(isRecording && 'animate-pulse')}
          >
            {isRecording ? 'Stop Recording' : 'Record Audio Intent'}
          </Button>

          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-[#F5F7FA]">
              {formatTimer(recordingSeconds)}
            </span>
            {isRecording && (
              <Badge variant="error" dot pulse size="sm">
                REC Live
              </Badge>
            )}
          </div>
        </div>

        {/* Dynamic Simulated Audio Waveform */}
        <div className="flex items-center gap-1 h-8 px-3 rounded-md bg-[#14171C] border border-[#242831]">
          {[8, 14, 22, 12, 18, 28, 16, 24, 10, 19, 26, 15, 20, 11, 25, 14].map(
            (height, i) => (
              <span
                key={i}
                className={cn(
                  'w-1 rounded-full transition-all duration-150',
                  isRecording
                    ? 'bg-red-500 animate-pulse'
                    : isPlaying
                    ? 'bg-indigo-400 animate-pulse'
                    : 'bg-[#383F4D]'
                )}
                style={{
                  height: isRecording || isPlaying ? `${(height / 28) * 100}%` : `${height}px`,
                }}
              />
            )
          )}
        </div>

        {/* Playback simulation */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleTogglePlay}
            leftIcon={isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          >
            {isPlaying ? 'Pause' : 'Play Sample'}
          </Button>
        </div>
      </div>

      {/* Real-time Speech-to-Text Transcript Output */}
      <div className="p-4 rounded-lg bg-[#14171C] border border-[#242831] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-semibold text-[#F5F7FA]">
              Automatic Speech-to-Text Transcription
            </h4>
            <Badge variant="success" size="sm" dot>
              {Math.round(payload.confidence * 100)}% Confidence
            </Badge>
          </div>

          {onApplyTranscriptToText && (
            <button
              type="button"
              onClick={() => onApplyTranscriptToText(payload.transcript)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Apply to Main Text Intent</span>
            </button>
          )}
        </div>

        {/* Transcript text */}
        <p className="text-xs text-[#9CA3AF] leading-relaxed italic bg-[#0B0D10] p-3 rounded-md border border-[#1F242C]">
          "{payload.transcript}"
        </p>

        {/* Timestamp breakdown */}
        <div className="space-y-1 pt-1">
          <span className="text-[10px] font-bold uppercase text-[#6B7280] tracking-wider">
            Detected Segment Markers
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {payload.timestamps.map((ts, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-2 rounded bg-[#0F1115] border border-[#1F242C] text-[11px]"
              >
                <span className="font-mono text-indigo-400 font-semibold shrink-0">
                  {ts.time}
                </span>
                <span className="text-[#9CA3AF] truncate">{ts.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
