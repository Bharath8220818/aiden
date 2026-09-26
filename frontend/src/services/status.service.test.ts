import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  inspectConfig,
  probeHealthz,
  probeFullHealth,
  probeWebSocket,
  runStatusProbes,
} from './status.service';

/* ------------------------------------------------------------------ */
/* inspectConfig — the deployment-bug detector                         */
/* ------------------------------------------------------------------ */

describe('inspectConfig', () => {
  it('flags an https site built with localhost API/WS URLs (the classic deploy bug)', () => {
    vi.stubEnv('VITE_ENABLE_MOCK_DATA', 'false');

    const report = inspectConfig('http://localhost:8000/api/v1', 'ws://localhost:8000/api/v1/ws', {
      origin: 'https://aiden-orcin.vercel.app',
      protocol: 'https:',
    });

    expect(report.isProductionOrigin).toBe(true);
    expect(report.warnings).toHaveLength(1);
    expect(report.warnings[0]).toMatch(/localhost/i);
    expect(report.warnings[0]).toMatch(/VITE_API_URL/i);
  });

  it('does not warn for localhost URLs in a local (http) context', () => {
    vi.stubEnv('VITE_ENABLE_MOCK_DATA', 'false');

    const report = inspectConfig('http://localhost:8000/api/v1', 'ws://localhost:8000/api/v1/ws', {
      origin: 'http://localhost:5173',
      protocol: 'http:',
    });
    expect(report.warnings).toHaveLength(0);
  });

  it('warns when the API is cross-origin from an https site (CORS implication)', () => {
    vi.stubEnv('VITE_ENABLE_MOCK_DATA', 'false');

    const report = inspectConfig(
      'https://aiden-backend-fq08.onrender.com/api/v1',
      'wss://aiden-backend-fq08.onrender.com/api/v1/ws',
      { origin: 'https://aiden-orcin.vercel.app', protocol: 'https:' }
    );
    expect(report.warnings.some((w) => /CORS_ORIGINS/.test(w))).toBe(true);
  });

  it('warns when the bundle runs in mock mode', () => {
    vi.stubEnv('VITE_ENABLE_MOCK_DATA', 'true');

    const report = inspectConfig(
      'https://aiden-backend-fq08.onrender.com/api/v1',
      'wss://aiden-backend-fq08.onrender.com/api/v1/ws',
      { origin: 'https://aiden-orcin.vercel.app', protocol: 'https:' }
    );
    expect(report.warnings.some((w) => /mock/i.test(w))).toBe(true);
  });

  it('stays quiet for a correctly wired same-origin production build', () => {
    vi.stubEnv('VITE_ENABLE_MOCK_DATA', 'false');

    const report = inspectConfig('https://aiden-orcin.vercel.app/api/v1', 'wss://aiden-orcin.vercel.app/api/v1/ws', {
      origin: 'https://aiden-orcin.vercel.app',
      protocol: 'https:',
    });
    expect(report.warnings).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/* probeHealthz / probeFullHealth                                      */
/* ------------------------------------------------------------------ */

describe('probeHealthz', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reports ok for a healthy endpoint', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'healthy' }), { status: 200 }))
    );
    const result = await probeHealthz('http://test');
    expect(result.status).toBe('ok');
    expect(result.latencyMs).not.toBeNull();
  });

  it('reports unreachable on network failure (the CORS/localhost case)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const result = await probeHealthz('http://localhost:8000/api/v1');
    expect(result.status).toBe('unreachable');
    expect(result.error).toMatch(/network error|CORS/i);
  });

  it('reports degraded for a non-200 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"detail":"x"}', { status: 503 })));
    const result = await probeHealthz('http://test');
    expect(result.status).toBe('degraded');
    expect(result.error).toContain('503');
  });
});

describe('probeFullHealth', () => {
  it('maps backend dependency checks into the report', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: 'degraded',
            checks: {
              database: { status: 'degraded', detail: 'unreachable' },
              redis: { status: 'not_configured', detail: null },
            },
          }),
          { status: 200 }
        )
      )
    );
    const result = await probeFullHealth('http://test');
    expect(result.status).toBe('degraded');
    expect(result.services).toHaveLength(2);
    expect(result.services[0]).toMatchObject({ name: 'database', status: 'degraded', detail: 'unreachable' });
  });
});

/* ------------------------------------------------------------------ */
/* probeWebSocket                                                      */
/* ------------------------------------------------------------------ */

describe('probeWebSocket', () => {
  class MockWebSocket {
    static instances: MockWebSocket[] = [];
    onopen: (() => void) | null = null;
    onmessage: ((e: { data: string }) => void) | null = null;
    onclose: ((e: { code: number }) => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(public url: string) {
      MockWebSocket.instances.push(this);
    }
    close() {}
  }

  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket as unknown as typeof WebSocket);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('reports ok when the server sends connection_established', async () => {
    const promise = probeWebSocket('ws://test/ws', 'tok');
    const ws = MockWebSocket.instances[0];
    ws.onmessage?.({ data: JSON.stringify({ type: 'connection_established' }) });
    const result = await promise;
    expect(result.status).toBe('ok');
  });

  it('treats a 4401 close as reachable-but-needs-auth (degraded, not down)', async () => {
    const promise = probeWebSocket('ws://test/ws', null);
    MockWebSocket.instances[0].onclose?.({ code: 4401 });
    const result = await promise;
    expect(result.status).toBe('degraded');
    expect(result.detail).toMatch(/sign in/i);
  });

  it('reports an auth-ambiguous handshake as degraded while signed out (not an outage)', async () => {
    // Signed out, the backend rejects the upgrade before it completes — the
    // browser reports an error indistinguishable from a dead server.
    const promise = probeWebSocket('ws://test/ws', null);
    MockWebSocket.instances[0].onerror?.();
    const result = await promise;
    expect(result.status).toBe('degraded');
    expect(result.detail).toMatch(/session|sign in/i);
  });

  it('reports a connection error as unreachable when authenticated', async () => {
    const promise = probeWebSocket('ws://test/ws', 'tok');
    MockWebSocket.instances[0].onerror?.();
    const result = await promise;
    expect(result.status).toBe('unreachable');
  });
});

/* ------------------------------------------------------------------ */
/* runStatusProbes                                                     */
/* ------------------------------------------------------------------ */

describe('runStatusProbes', () => {
  it('aggregates config + all three probes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'healthy' }), { status: 200 }))
    );
    class WsOk {
      onmessage: ((e: { data: string }) => void) | null = null;
      constructor(public url: string) {
        queueMicrotask(() => this.onmessage?.({ data: JSON.stringify({ type: 'connection_established' }) }));
      }
      close() {}
    }
    vi.stubGlobal('WebSocket', WsOk as unknown as typeof WebSocket);

    const report = await runStatusProbes('http://localhost:8000/api/v1', 'ws://localhost:8000/api/v1/ws');
    expect(report.config).toBeDefined();
    expect(report.healthz.status).toBe('ok');
    expect(report.full.status).toBeDefined();
    expect(report.ws.status).toBe('ok');
  });
});
