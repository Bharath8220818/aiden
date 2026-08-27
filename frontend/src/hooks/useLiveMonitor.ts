import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/index';

export interface ServiceStatus {
  status: 'healthy' | 'warning' | 'error' | 'disconnected' | 'unknown';
  metrics: Record<string, string>;
}

export interface LiveMonitorResult {
  statuses: Record<string, ServiceStatus>;
  isLive: boolean;
  lastUpdate: number | null;
  error: string | null;
}

/**
 * Polls the backend /api/v1/architecture/monitor endpoint at a fixed interval
 * and returns live health status for each service on the canvas.
 *
 * Usage:
 *   const { statuses, isLive, lastUpdate } = useLiveMonitor(components, 10000);
 *   // statuses["pg-1"] => { status: "healthy", metrics: { Latency: "12ms" } }
 */
export function useLiveMonitor(
  components: Array<{ id: string; service: string }>,
  intervalMs: number = 10000
): LiveMonitorResult & { toggle: () => void } {
  const [statuses, setStatuses] = useState<Record<string, ServiceStatus>>({});
  const [isLive, setIsLive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatuses = useCallback(async () => {
    if (components.length === 0) return;
    try {
      const payload = components.map((c) => ({ id: c.id, service: c.service }));
      const response = await api.post('/api/v1/architecture/monitor', payload, { timeout: 10000 });
      setStatuses(response.data);
      setLastUpdate(Date.now());
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Monitor fetch failed';
      setError(msg);
    }
  }, [components]);

  const toggle = useCallback(() => {
    setIsLive((prev) => !prev);
  }, []);

  // Start/stop polling when isLive changes
  useEffect(() => {
    if (isLive) {
      // Fetch immediately
      fetchStatuses();
      intervalRef.current = setInterval(fetchStatuses, intervalMs);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isLive, intervalMs, fetchStatuses]);

  return { statuses, isLive, lastUpdate, error, toggle };
}
