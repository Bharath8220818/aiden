import React, { useEffect, useRef, useState } from 'react';

import { formatDuration, formatRows, type PlatformPulse } from '../services/pulse.service';

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

const stamp = () => new Date().toTimeString().slice(0, 8);

/**
 * RunTerminal — the landing's run log. The lineage demo reports its phases;
 * the boot lines and header come from the REAL platform pulse
 * (GET /platform/pulse — actual run/incident/agent aggregates).
 */
export const RunTerminal: React.FC<{
  line: { text: string; tone: Tone } | null;
  pulse: PlatformPulse | null;
  offline: boolean;
}> = ({ line, pulse, offline }) => {
  const bootedRef = useRef(false);
  const [lines, setLines] = useState<LogLine[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(1);

  // Boot lines — from the real pulse, or an honest offline note.
  useEffect(() => {
    if (bootedRef.current) return;
    if (pulse) {
      bootedRef.current = true;
      const a = pulse.agents;
      const r = pulse.runs;
      setLines([
        {
          id: idRef.current++,
          time: stamp(),
          text: `aiden orchestrator online · ${a.registered} agents registered`,
          tone: 'dim',
        },
        {
          id: idRef.current++,
          time: stamp(),
          text: `last completed run · ${r.last?.status ?? 'none yet'}${
            r.last?.rowsProcessed ? ` · ${formatRows(r.last.rowsProcessed)} rows` : ''
          }${r.last?.durationMs ? ` · ${formatDuration(r.last.durationMs)}` : ''}`,
          tone: r.last?.status === 'failed' ? 'warn' : 'ok',
        },
        {
          id: idRef.current++,
          time: stamp(),
          text: `${r.total24h} runs in ${pulse.windowHours}h · ${r.success24h} ok${
            r.failed24h ? ` · ${r.failed24h} failed` : ''
          }${
            pulse.incidents.open ? ` · ${pulse.incidents.open} open incidents` : ''
          } · ${a.agentRuns24h} agent runs`,
          tone: r.failed24h || pulse.incidents.open ? 'warn' : 'ok',
        },
      ]);
    } else if (offline) {
      bootedRef.current = true;
      setLines([
        { id: idRef.current++, time: stamp(), text: 'platform pulse unavailable — showing scripted demo', tone: 'warn' },
        { id: idRef.current++, time: stamp(), text: 'aiden orchestrator online · demo mode', tone: 'dim' },
      ]);
    }
  }, [pulse, offline]);

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
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 99,
            background: offline ? '#FBBF24' : '#3FB950',
            display: 'inline-block',
          }}
        />
        <span>{pulse ? `pulse · aiden.log` : 'demo · aiden.log'}</span>
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
