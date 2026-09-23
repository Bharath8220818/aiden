import React, { useEffect, useRef, useState } from 'react';

type Tone = 'info' | 'ok' | 'bad' | 'warn' | 'dim';

interface LogLine {
  id: number;
  time: string;
  text: string;
  tone: Tone;
}

const TONE_CLASS: Record<Tone, string> = {
  info: 't-info',
  ok: 't-ok',
  bad: 't-bad',
  warn: 't-warn',
  dim: 't-dim',
};

const MAX_LINES = 9;

const stamp = () => {
  const d = new Date();
  return d.toTimeString().slice(0, 8);
};

/**
 * RunTerminal — the landing's run log. Receives the lineage demo's phases
 * and renders them as an operator's console: real vocabulary, timestamps,
 * the product's actual statuses. Keeps the last N lines; autoscrolls.
 */
export const RunTerminal: React.FC<{ line: { text: string; tone: Tone } | null }> = ({ line }) => {
  const [lines, setLines] = useState<LogLine[]>([
    { id: 0, time: stamp(), text: 'aiden orchestrator online · 11 agents registered', tone: 'dim' },
  ]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(1);

  useEffect(() => {
    if (!line) return;
    setLines((prev) => {
      const next = [...prev, { id: idRef.current++, time: stamp(), text: line.text, tone: line.tone }];
      return next.slice(-MAX_LINES);
    });
  }, [line]);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  return (
    <div className="rterm" aria-live="polite" aria-label="Live run log from the demo above">
      <div className="rterm-head">
        <span style={{ width: 8, height: 8, borderRadius: 99, background: '#3FB950', display: 'inline-block' }} />
        <span>run_1042 · aiden.log</span>
      </div>
      <div className="rterm-body" ref={bodyRef}>
        {lines.map((l) => (
          <div key={l.id} className="t-line">
            <span className="t-time">{l.time}</span>
            <span className="t-dim"> │ </span>
            <span className={TONE_CLASS[l.tone]}>{l.text}</span>
          </div>
        ))}
        <div className="t-line">
          <span className="t-time">{stamp()}</span>
          <span className="t-dim"> │ </span>
          <span className="t-dim">watching…</span>
          <span className="caret" />
        </div>
      </div>
    </div>
  );
};

export default RunTerminal;
