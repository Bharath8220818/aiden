import React, { useEffect, useMemo, useRef, useState } from 'react';

import { formatDuration, formatRows, type PlatformPulse } from '../services/pulse.service';

/**
 * LineageHero — the signature element.
 *
 * An SVG data lineage that runs a scripted, endless run-loop:
 *   flow → incident at validate → diagnose → heal → flow resumes
 * Every state is real product vocabulary (task ids, severities, actions);
 * the "animation" is the product's story, not decoration.
 * When the platform pulse is live, the completion line reports the REAL
 * last-run stats instead of the scripted ones.
 */

type NodeState = 'idle' | 'running' | 'ok' | 'bad' | 'healing';

const POS = {
  pg:    { x: 30,  y: 78 },
  val:   { x: 220, y: 30 },
  xform: { x: 410, y: 30 },
  snow:  { x: 600, y: 78 },
  dash:  { x: 740, y: 190 },
} as const;

const EDGES: [keyof typeof POS, keyof typeof POS][] = [
  ['pg', 'val'],
  ['val', 'xform'],
  ['xform', 'snow'],
  ['snow', 'dash'],
];

const NODE_META: Record<keyof typeof POS, { label: string; sub: string }> = {
  pg:    { label: 'pg.raw_orders', sub: 'postgres · source' },
  val:   { label: 'validate',      sub: 'quality gate · 4 checks' },
  xform: { label: 'transform',     sub: 'type-safe mapping' },
  snow:  { label: 'snow.marts',    sub: 'snowflake · target' },
  dash:  { label: 'dashboards',    sub: '3 consumers' },
};

interface Phase {
  name: string;
  states: Partial<Record<keyof typeof POS, NodeState>>;
  status: { text: string; tone: 'info' | 'ok' | 'bad' | 'warn' | 'dim' };
  log: string;
  hold: number;
}

const PHASES: Phase[] = [
  {
    name: 'run',
    states: { pg: 'running', val: 'running' },
    status: { text: 'run_1042 · extracting from pg.raw_orders…', tone: 'info' },
    log: 'rows flowing',
    hold: 2600,
  },
  {
    name: 'incident',
    states: { pg: 'ok', val: 'bad', xform: 'idle', snow: 'idle', dash: 'idle' },
    status: { text: 'INC-1045 · customer_id changed varchar → bigint', tone: 'bad' },
    log: 'incident detected',
    hold: 3000,
  },
  {
    name: 'diagnose',
    states: { val: 'healing' },
    status: { text: 'debug_agent · correlated 2 evidence sources', tone: 'warn' },
    log: 'diagnosing',
    hold: 2400,
  },
  {
    name: 'fix',
    states: { val: 'healing' },
    status: { text: 'fix drafted · sandbox passed · risk: low', tone: 'warn' },
    log: 'healing',
    hold: 2600,
  },
  {
    name: 'approve',
    states: { val: 'ok' },
    status: { text: 'approved by bharath · resuming run_1042', tone: 'ok' },
    log: 'approved',
    hold: 2200,
  },
  {
    name: 'resume',
    states: { val: 'ok', xform: 'running', snow: 'running', dash: 'running' },
    status: { text: 'run_1042 · rows flowing to snow.marts…', tone: 'info' },
    log: 'rows flowing',
    hold: 2800,
  },
  {
    name: 'done',
    states: { pg: 'ok', val: 'ok', xform: 'ok', snow: 'ok', dash: 'ok' },
    status: { text: 'run_1042 succeeded · 418,233 rows · 6m 12s', tone: 'ok' },
    log: 'success',
    hold: 3000,
  },
];

/** Override for the final phase when the real pulse has a last completed run. */
const realDoneLine = (pulse: PlatformPulse | null): string | null => {
  const last = pulse?.runs.last;
  if (!last?.status) return null;
  const bits = [
    `last run ${last.status}`,
    last.rowsProcessed != null ? `${formatRows(last.rowsProcessed)} rows` : null,
    last.durationMs != null ? formatDuration(last.durationMs) : null,
  ].filter(Boolean);
  return bits.join(' · ');
};

/** Edge segments light up when both endpoints are past them. */
const edgeActive = (from: keyof typeof POS, to: keyof typeof POS, states: Partial<Record<keyof typeof POS, NodeState>>) => {
  const done = (s: NodeState | undefined) => s === 'ok';
  const active = (s: NodeState | undefined) => s === 'running' || s === 'healing';
  return done(states[from]) && (active(states[to]) || done(states[to]));
};

const edgeMid = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  // Match the cubic bezier's visual midpoint (control points at vertical centers).
  const t = 0.5;
  const c1y = a.y, c2y = b.y;
  const x = (1 - t) ** 3 * a.x + 3 * (1 - t) ** 2 * t * a.x + 3 * (1 - t) * t ** 2 * b.x + t ** 3 * b.x;
  const y = (1 - t) ** 3 * a.y + 3 * (1 - t) ** 2 * t * c1y + 3 * (1 - t) * t ** 2 * c2y + t ** 3 * b.y;
  return { x, y };
};

export const LineageHero: React.FC<{
  onLog?: (line: string, tone: Phase['status']['tone']) => void;
  pulse?: PlatformPulse | null;
}> = ({ onLog, pulse }) => {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const phase = PHASES[phaseIdx % PHASES.length];

  const states = useMemo(() => {
    // States accumulate within a cycle: later phases inherit earlier 'ok's.
    const acc: Partial<Record<keyof typeof POS, NodeState>> = {};
    for (let i = 0; i <= phaseIdx % PHASES.length; i++) Object.assign(acc, PHASES[i].states);
    return acc;
  }, [phaseIdx]);

  // Logging must fire once per phase — pulse updates (30s poll) must NOT
  // re-emit the current phase line, so it's read through a ref here.
  const pulseRef = useRef(pulse);
  useEffect(() => {
    pulseRef.current = pulse;
  }, [pulse]);

  useEffect(() => {
    const isDone = phase.name === 'done';
    const text =
      isDone && pulseRef.current
        ? realDoneLine(pulseRef.current) ?? phase.status.text
        : phase.status.text;
    onLog?.(text, phase.status.tone);
    const t = setTimeout(() => setPhaseIdx((i) => i + 1), phase.hold);
    return () => clearTimeout(t);
  }, [phaseIdx, phase, onLog]);

  const st = (k: keyof typeof POS): NodeState => states[k] ?? 'idle';

  return (
    <div className="lineage" role="img" aria-label="Animated demo: a data pipeline detects a schema change, AIDEN diagnoses and heals it, and the run resumes">
      <svg viewBox="0 0 900 250" fill="none">
        <defs>
          <marker id="ln-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0 L8 4 L0 8 Z" fill="rgb(var(--text-muted) / 0.5)" />
          </marker>
        </defs>

        {/* Edges */}
        {EDGES.map(([a, b]) => {
          const pa = POS[a];
          const pb = POS[b];
          const ax = pa.x + 118, ay = pa.y + 16;
          const bx = pb.x, by = pb.y + 16;
          const active = edgeActive(a, b, states);
          return (
            <g key={`${a}-${b}`}>
              <path className="edge" d={`M ${ax} ${ay} C ${ax + 40} ${ay}, ${bx - 40} ${by}, ${bx} ${by}`} markerEnd="url(#ln-arrow)" />
              {active && (
                <path
                  className="edge-flow"
                  d={`M ${ax} ${ay} C ${ax + 40} ${ay}, ${bx - 40} ${by}, ${bx} ${by}`}
                />
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {(Object.keys(POS) as (keyof typeof POS)[]).map((k) => {
          const p = POS[k];
          const meta = NODE_META[k];
          const s = st(k);
          const w = 118, h = 34;
          return (
            <g key={k} className="ln-node" data-state={s}>
              <rect className="box" x={p.x} y={p.y} width={w} height={h} rx={8} />
              <circle className="ln-dot" cx={p.x + 14} cy={p.y + 17} />
              <text className="ln-label" x={p.x + 26} y={p.y + 15}>{meta.label}</text>
              <text className="ln-sub" x={p.x + 26} y={p.y + 27}>{meta.sub}</text>
              {k === 'val' && (s === 'bad' || s === 'healing') && (
                <text className="ln-flag" x={p.x + w + 8} y={p.y + 12}>⚠ INC-1045</text>
              )}
            </g>
          );
        })}

        {/* Status line under the canvas */}
        <text className="ln-status" x={30} y={232}>
          {phase.name === 'done' && pulse ? realDoneLine(pulse) ?? phase.status.text : phase.status.text}
        </text>
      </svg>
    </div>
  );
};

export default LineageHero;
