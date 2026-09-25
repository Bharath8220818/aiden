import { useEffect, useState } from 'react';

import { api } from '@/services/api';

/** Shape of GET /platform/pulse — coarse aggregates only, no user data. */
export interface PulseLastRun {
  status: 'success' | 'failed' | null;
  rowsProcessed: number | null;
  durationMs: number | null;
}

export interface PlatformPulse {
  database: 'available';
  generatedAt: string;
  windowHours: number;
  runs: {
    total24h: number;
    success24h: number;
    failed24h: number;
    successRate: number | null;
    last: PulseLastRun;
  };
  incidents: { open: number; resolved24h: number };
  agents: { registered: number; agentRuns24h: number };
}

const PULSE_POLL_MS = 30_000;

/**
 * usePlatformPulse — fetches the public pulse and re-polls while visible.
 * `offline` is true only after a failed fetch, so the demo can say so
 * honestly instead of pretending the numbers are live.
 */
export function usePlatformPulse(): { pulse: PlatformPulse | null; offline: boolean } {
  const [pulse, setPulse] = useState<PlatformPulse | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const data = await api.get<PlatformPulse>('/platform/pulse');
        if (!alive) return;
        setPulse(data);
        setOffline(false);
      } catch {
        if (alive) setOffline(true);
      }
    };
    void load();
    const id = setInterval(load, PULSE_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return { pulse, offline };
}

/** 418233 → "418,233" */
export const formatRows = (n: number | null): string =>
  n == null ? '—' : n.toLocaleString('en-US');

/** 372000 → "6m 12s" */
export const formatDuration = (ms: number | null): string => {
  if (ms == null) return '—';
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};
