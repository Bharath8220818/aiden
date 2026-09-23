import { Subject } from './subject';

/* ------------------------------------------------------------------ */
/* Live platform events                                                */
/* ------------------------------------------------------------------ */

export type LiveEventType = 'incident' | 'healing' | 'pipeline' | 'insight' | 'info' | 'success';

export interface LiveEvent {
  id: string;
  type: LiveEventType;
  title: string;
  message: string;
  link?: string;
  ts: string;
}

/* ------------------------------------------------------------------ */
/* Mock event simulation (used when no WebSocket backend is present)   */
/* ------------------------------------------------------------------ */

const MOCK_TEMPLATES: Omit<LiveEvent, 'id' | 'ts'>[] = [
  { type: 'incident', title: 'Incident detected', message: 'sales_daily_pipeline failed quality gate — freshness SLA breach on mart_orders.', link: '/incidents' },
  { type: 'healing', title: 'Auto-healing deployed', message: 'inventory_sync patched (dedup guard) and rerun verified — 0 data loss.', link: '/self-healing' },
  { type: 'pipeline', title: 'Pipeline completed', message: 'customer_360_etl finished in 14m 22s · 2.4M rows merged into Snowflake.', link: '/pipelines/manage' },
  { type: 'insight', title: 'Optimization available', message: 'Architect Agent estimates 18% cost reduction on sales_daily_pipeline warehouse.', link: '/dashboard' },
  { type: 'pipeline', title: 'Kafka lag warning', message: 'fraud_stream_processor consumer lag at 12.8k — threshold 15k.', link: '/monitoring' },
  { type: 'success', title: 'Contract published', message: 'orders v1.3.0 verified by QA Agent and published to the catalog.', link: '/workspace' },
];

const MOCK_INTERVAL_MS = 14_000;

let mockTimer: ReturnType<typeof setInterval> | null = null;
let mockIndex = 0;

function startMockSimulation() {
  if (mockTimer) return;
  mockTimer = setInterval(() => {
    const template = MOCK_TEMPLATES[mockIndex % MOCK_TEMPLATES.length];
    mockIndex += 1;
    events.next({
      ...template,
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ts: new Date().toISOString(),
    });
  }, MOCK_INTERVAL_MS);
}

function stopMockSimulation() {
  if (mockTimer) {
    clearInterval(mockTimer);
    mockTimer = null;
  }
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

const events = new Subject<LiveEvent>();

/**
 * Connects the realtime layer. Uses the WebSocket client when a backend is
 * reachable; otherwise runs the in-browser event simulation so the UX stays
 * alive in demo mode. Returns a disposer.
 */
export function connectLiveEvents(): () => void {
  const mockEnabled = import.meta.env.VITE_ENABLE_MOCK_DATA !== 'false';

  if (mockEnabled) {
    startMockSimulation();
    return stopMockSimulation;
  }

  // Real backend path: bridge the WebSocket client into the event subject.
  // (No VITE_WS_URL is fine — the ws client falls back to the same-origin
  // /api/v1/ws, which works behind Nginx and the Vite dev proxy alike.)
  let unsubscribeWs: (() => void) | null = null;
  let disconnectWs: (() => void) | null = null;
  import('./websocket').then(({ wsClient }) => {
    disconnectWs = () => wsClient.disconnect();
    wsClient.connect();
    let wsEventSeq = 0;
    unsubscribeWs = wsClient.subscribe('platform-event', (payload) => {
      const data = payload as Partial<LiveEvent>;
      if (data && data.type && data.title) {
        wsEventSeq += 1;
        events.next({
          // Server ids may repeat or arrive within the same millisecond —
          // make the id unique so keyed renders never collide.
          id: data.id ?? `evt-${Date.now()}-${wsEventSeq}-${Math.random().toString(36).slice(2, 7)}`,
          type: data.type,
          title: data.title,
          message: data.message ?? '',
          link: data.link,
          ts: data.ts ?? new Date().toISOString(),
        });
      }
    });
  });

  return () => {
    unsubscribeWs?.();
    disconnectWs?.();
  };
}

/** Subscribe to live platform events. */
export const liveEvents$ = {
  subscribe(handler: (event: LiveEvent) => void) {
    return events.subscribe(handler);
  },
};
