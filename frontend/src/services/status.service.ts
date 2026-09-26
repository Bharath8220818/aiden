/**
 * Deployment status probes — the honest wiring report.
 *
 * Probes the real endpoints the app depends on (health/liveness, dependency
 * health, WebSocket) and inspects the build-time configuration that produced
 * them. The goal is to make deployment-config bugs — a missing VITE_API_URL
 * that leaves the bundle pointed at localhost, a CORS allowlist gap, an
 * unreachable database — visible on a single public page instead of being
 * discovered as silent failures in the network tab.
 */

export type ProbeStatus = 'ok' | 'degraded' | 'unreachable' | 'checking';

export interface ServiceCheck {
  name: string;
  status: ProbeStatus;
  detail?: string;
}

export interface HealthProbeResult {
  status: ProbeStatus;
  latencyMs: number | null;
  error?: string;
}

export interface FullHealthResult extends HealthProbeResult {
  services: ServiceCheck[];
}

export interface WsProbeResult {
  status: 'ok' | 'degraded' | 'unreachable' | 'checking';
  detail: string;
  latencyMs: number | null;
}

export interface ConfigReport {
  apiBaseUrl: string;
  wsUrl: string;
  appEnv: string;
  mockMode: boolean;
  origin: string;
  isProductionOrigin: boolean;
  /** Non-empty when the build configuration has a detectable problem. */
  warnings: string[];
}

const PROBE_TIMEOUT_MS = 10_000;

/** fetch with a hard timeout — a hung endpoint must read as unreachable. */
async function timedFetch(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    return await fetch(url, { cache: 'no-store', ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** GET /health/healthz — liveness + round-trip latency. */
export async function probeHealthz(baseUrl: string): Promise<HealthProbeResult> {
  const started = performance.now();
  try {
    const res = await timedFetch(`${baseUrl}/health/healthz`);
    const latencyMs = Math.round(performance.now() - started);
    if (!res.ok) {
      return { status: 'degraded', latencyMs, error: `HTTP ${res.status}` };
    }
    const body = (await res.json()) as { status?: string };
    return body.status === 'healthy'
      ? { status: 'ok', latencyMs }
      : { status: 'degraded', latencyMs, error: `status=${body.status ?? 'unknown'}` };
  } catch (err) {
    return {
      status: 'unreachable',
      latencyMs: null,
      error: err instanceof DOMException && err.name === 'AbortError' ? 'timed out' : 'network error / CORS block',
    };
  }
}

/** GET /health/full — per-dependency checks from the backend itself. */
export async function probeFullHealth(baseUrl: string): Promise<FullHealthResult> {
  const started = performance.now();
  try {
    const res = await timedFetch(`${baseUrl}/health/full`);
    const latencyMs = Math.round(performance.now() - started);
    if (!res.ok) {
      return { status: 'degraded', latencyMs, services: [], error: `HTTP ${res.status}` };
    }
    const body = (await res.json()) as {
      status?: string;
      checks?: Record<string, { status?: string; detail?: string | null }>;
    };
    const checks = body.checks ?? {};
    const services: ServiceCheck[] = Object.entries(checks).map(([name, check]) => ({
      name,
      status: (check.status as ProbeStatus) ?? 'degraded',
      detail: check.detail ?? undefined,
    }));
    return { status: body.status === 'ok' ? 'ok' : 'degraded', latencyMs, services };
  } catch {
    // The liveness probe already reports reachability — here the deps are unknown.
    return { status: 'unreachable', latencyMs: null, services: [], error: 'not reachable' };
  }
}

/**
 * WebSocket probe.
 *
 * With a session token the probe completes the real handshake and reports on
 * the live realtime channel. Without one, the backend rejects the upgrade
 * before it completes (the browser surfaces that as a connection error that
 * is indistinguishable from a dead server) — so a tokenless failed handshake
 * on an otherwise-reachable API host is reported honestly as "requires a
 * session", not as an outage.
 */
export function probeWebSocket(
  wsUrl: string,
  token: string | null,
  timeoutMs = 8000
): Promise<WsProbeResult> {
  const hasSession = Boolean(token);
  return new Promise((resolve) => {
    const started = performance.now();
    let settled = false;
    const finish = (result: WsProbeResult) => {
      if (settled) return;
      settled = true;
      try {
        ws?.close();
      } catch {
        /* already closed */
      }
      resolve(result);
    };

    let ws: WebSocket | null = null;
    try {
      const url = token ? `${wsUrl}?token=${encodeURIComponent(token)}` : wsUrl;
      ws = new WebSocket(url);
    } catch {
      finish({ status: 'unreachable', detail: 'invalid WebSocket URL', latencyMs: null });
      return;
    }

    const timer = setTimeout(
      () => finish({ status: 'unreachable', detail: 'no answer within timeout', latencyMs: null }),
      timeoutMs
    );

    ws.onopen = () => {
      // Wait for the server's first message to prove the full handshake + auth.
    };
    ws.onmessage = (event) => {
      clearTimeout(timer);
      try {
        const parsed = JSON.parse(event.data) as { type?: string };
        if (parsed.type === 'connection_established') {
          finish({
            status: 'ok',
            detail: 'authenticated — realtime channel established',
            latencyMs: Math.round(performance.now() - started),
          });
          return;
        }
      } catch {
        /* non-JSON message still proves connectivity */
      }
      finish({ status: 'ok', detail: 'connected — server responded', latencyMs: Math.round(performance.now() - started) });
    };
    ws.onclose = (event) => {
      clearTimeout(timer);
      if (event.code === 4401) {
        finish({
          status: 'degraded',
          detail: 'endpoint reachable — sign in to open the realtime channel',
          latencyMs: Math.round(performance.now() - started),
        });
        return;
      }
      finish({
        status: 'unreachable',
        detail: `closed (code ${event.code || '—'})`,
        latencyMs: null,
      });
    };
    ws.onerror = () => {
      clearTimeout(timer);
      if (!hasSession) {
        // Pre-handshake rejection (the server answers, but auth is required)
        // and a dead server/proxy look identical to the browser while signed
        // out — report the ambiguity instead of claiming an outage.
        finish({
          status: 'degraded',
          detail: 'handshake requires a session — sign in to verify the realtime channel end-to-end',
          latencyMs: Math.round(performance.now() - started),
        });
        return;
      }
      finish({ status: 'unreachable', detail: 'connection error (server down, wrong URL, or proxy missing)', latencyMs: null });
    };
  });
}

/** Read the persisted session token the same way services/api.ts does. */
function readSessionToken(): string | null {
  try {
    const raw = localStorage.getItem('aiden-auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { token?: string | null; expiresAt?: string | null } };
    const { token, expiresAt } = parsed.state ?? {};
    if (!token) return null;
    if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) return null;
    return token;
  } catch {
    return null;
  }
}

/** The browser bits inspectConfig reads — injectable for tests. */
export interface BrowserContext {
  origin: string;
  protocol: string;
}

/** The default context reads the real browser location. */
function defaultContext(): BrowserContext {
  if (typeof window === 'undefined') return { origin: '', protocol: '' };
  return { origin: window.location.origin, protocol: window.location.protocol };
}

/** Inspect the build-time configuration for the classic deployment mistakes. */
export function inspectConfig(
  apiBaseUrl: string,
  wsUrl: string,
  ctx: BrowserContext = defaultContext()
): ConfigReport {
  const origin = ctx.origin;
  const isProductionOrigin = ctx.protocol === 'https:';
  const mockMode = import.meta.env.VITE_ENABLE_MOCK_DATA !== 'false';
  const warnings: string[] = [];

  const isLocalhost = /\/\/(localhost|127\.0\.0\.1|\[::1\])/.test(apiBaseUrl) || /\/\/(localhost|127\.0\.0\.1|\[::1\])/.test(wsUrl);

  if (isProductionOrigin && isLocalhost) {
    warnings.push(
      'API/WS URL points at localhost while the site is served over https — VITE_API_URL / VITE_WS_URL were not set at build time, so the deployed app is calling each visitor\'s own machine.'
    );
  }
  if (isProductionOrigin && !isLocalhost && new URL(apiBaseUrl).origin !== origin) {
    warnings.push(
      'API is cross-origin from the site — the backend must list this origin in CORS_ORIGINS or requests will fail preflight.'
    );
  }
  if (mockMode) {
    warnings.push('App is in demo/mock mode (VITE_ENABLE_MOCK_DATA !== "false") — screens show simulated data, not this backend.');
  }

  return {
    apiBaseUrl,
    wsUrl,
    appEnv: import.meta.env.VITE_APP_ENV || 'development',
    mockMode,
    origin,
    isProductionOrigin,
    warnings,
  };
}

/** Run every probe in parallel and return the full report. */
export async function runStatusProbes(apiBaseUrl: string, wsUrl: string) {
  const config = inspectConfig(apiBaseUrl, wsUrl);
  const [healthz, full, ws] = await Promise.all([
    probeHealthz(apiBaseUrl),
    probeFullHealth(apiBaseUrl),
    probeWebSocket(wsUrl, readSessionToken()),
  ]);
  return { config, healthz, full, ws };
}
