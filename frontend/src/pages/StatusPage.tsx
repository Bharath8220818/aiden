import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, AlertTriangle, CheckCircle2, Database, RefreshCw, Server, XCircle, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { runStatusProbes, type ConfigReport, type FullHealthResult, type HealthProbeResult, type WsProbeResult } from '@/services/status.service';

/**
 * /status — the honest wiring report.
 *
 * Public (no auth): when the app cannot reach the backend, nobody can sign in
 * to see why. This page needs no session to answer "is it them or is it me?".
 * Probes the deployed backend's health endpoints, the WebSocket channel, and
 * the build-time configuration that produced the URLs — so the classic
 * deployment mistakes (missing VITE_API_URL, CORS gaps, a misconfigured
 * database) are visible at a glance.
 */

const RESOLVE_BASEURL = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl;
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return `${window.location.origin}/api/v1`;
  }
  return 'http://localhost:8000/api/v1';
};

const RESOLVE_WSURL = (): string => {
  const envUrl = import.meta.env.VITE_WS_URL;
  if (envUrl) return envUrl;
  if (typeof window === 'undefined') return 'ws://localhost:8000/api/v1/ws';
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/api/v1/ws`;
};

const StatusDot: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    ok: 'bg-emerald-500',
    degraded: 'bg-amber-500',
    unreachable: 'bg-red-500',
    checking: 'bg-gray-400 animate-pulse',
  };
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${map[status] ?? 'bg-gray-400'}`} />;
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const variant = status === 'ok' ? 'success' : status === 'degraded' ? 'warning' : status === 'checking' ? 'neutral' : 'error';
  return <Badge variant={variant} dot pulse={status === 'checking'}>{status}</Badge>;
};

const Latency: React.FC<{ ms: number | null }> = ({ ms }) =>
  ms == null ? <span className="text-[10px] text-text-muted">—</span> : <span className="font-mono text-[10px] text-text-secondary">{ms} ms</span>;

const REFRESH_MS = 30_000;

export const StatusPage: React.FC = () => {
  const [healthz, setHealthz] = useState<HealthProbeResult | null>(null);
  const [full, setFull] = useState<FullHealthResult | null>(null);
  const [ws, setWs] = useState<WsProbeResult | null>(null);
  const [config, setConfig] = useState<ConfigReport | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const report = await runStatusProbes(RESOLVE_BASEURL(), RESOLVE_WSURL());
      setHealthz(report.healthz);
      setFull(report.full);
      setWs(report.ws);
      setConfig(report.config);
      setLastChecked(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Defer the first probe past the effect body (fetch-after-paint) so the
    // initial mount renders its skeletons before state updates fire.
    const kickoff = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => void refresh(), REFRESH_MS);
    return () => {
      clearTimeout(kickoff);
      clearInterval(timer);
    };
  }, [refresh]);

  const overall = healthz?.status === 'ok' && full?.status === 'ok' && (ws?.status === 'ok' || ws?.status === 'degraded')
    ? 'operational'
    : healthz?.status === 'unreachable'
      ? 'backend unreachable'
      : full?.services.some((s) => s.name === 'database' && s.status !== 'ok')
        ? 'database degraded'
        : 'degraded';

  return (
    <div className="min-h-[80vh] w-full bg-background">
      <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-text-primary">
              <Activity className="w-5 h-5 text-indigo-600" />
              AIDEN status
            </h1>
            <p className="mt-1 text-xs text-text-secondary">
              Live probes of the deployed backend, its dependencies, the realtime channel, and this build's wiring.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => void refresh()} disabled={isRefreshing} leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}>
            Refresh
          </Button>
        </div>

        {/* Overall banner */}
        <Card className={overall === 'operational' ? 'border-emerald-500/30' : overall === 'backend unreachable' ? 'border-red-500/40' : 'border-amber-500/30'}>
          <CardContent className="flex items-center justify-between gap-3 py-4">
            <div className="flex items-center gap-3">
              {overall === 'operational' ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              )}
              <div>
                <p className="text-sm font-semibold text-text-primary capitalize">{overall}</p>
                <p className="text-[10px] text-text-muted">
                  {lastChecked ? `Checked ${lastChecked.toLocaleTimeString()} · auto-refresh ${REFRESH_MS / 1000}s` : 'Probing…'}
                </p>
              </div>
            </div>
            <StatusBadge status={overall === 'operational' ? 'ok' : overall === 'backend unreachable' ? 'unreachable' : 'degraded'} />
          </CardContent>
        </Card>

        {/* Reachability + realtime */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Server className="w-4 h-4 text-indigo-600" /> Backend API
              </CardTitle>
              <CardDescription className="truncate font-mono text-[10px]">{config?.apiBaseUrl ?? '…'}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusDot status={healthz?.status ?? 'checking'} />
                <span className="text-xs font-medium text-text-primary capitalize">{healthz?.status ?? 'checking'}</span>
                {healthz?.error && <span className="text-[10px] text-text-muted">{healthz.error}</span>}
              </div>
              <Latency ms={healthz?.latencyMs ?? null} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Zap className="w-4 h-4 text-indigo-600" /> WebSocket
              </CardTitle>
              <CardDescription className="truncate font-mono text-[10px]">{config?.wsUrl ?? '…'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusDot status={ws?.status ?? 'checking'} />
                  <span className="text-xs font-medium text-text-primary capitalize">{ws?.status ?? 'checking'}</span>
                </div>
                <Latency ms={ws?.latencyMs ?? null} />
              </div>
              {ws?.detail && <p className="text-[10px] text-text-muted">{ws.detail}</p>}
            </CardContent>
          </Card>
        </div>

        {/* Backend dependencies */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Database className="w-4 h-4 text-indigo-600" /> Backend dependencies
            </CardTitle>
            <CardDescription>
              Reported by the backend itself (<span className="font-mono">/health/full</span>){full?.latencyMs != null && <> · {full.latencyMs} ms</>}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(full?.services.length ?? 0) === 0 ? (
              <p className="text-xs text-text-muted">
                {full?.error ? `Dependency state unknown — ${full.error}.` : 'Probing dependencies…'}
              </p>
            ) : (
              full!.services.map((svc) => (
                <div key={svc.name} className="flex items-center justify-between py-1 border-b border-border-subtle/40 last:border-0">
                  <div className="flex items-center gap-2">
                    <StatusDot status={svc.status} />
                    <span className="text-xs font-medium text-text-primary capitalize">{svc.name}</span>
                    {svc.detail && <span className="text-[10px] text-text-muted">— {svc.detail}</span>}
                  </div>
                  <StatusBadge status={svc.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Build configuration */}
        {config && (
          <Card className={config.warnings.length > 0 ? 'border-amber-500/40' : undefined}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <AlertTriangle className={`w-4 h-4 ${config.warnings.length > 0 ? 'text-amber-500' : 'text-emerald-500'}`} /> Build configuration
              </CardTitle>
              <CardDescription>What this deployed bundle was built with — the source of most "works locally, broken deployed" bugs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[11px]">
                <dt className="text-text-muted">App env</dt>
                <dd className="font-mono text-text-primary">{config.appEnv}</dd>
                <dt className="text-text-muted">Mock mode</dt>
                <dd className="font-mono text-text-primary">{config.mockMode ? 'on (simulated data)' : 'off (real backend)'}</dd>
                <dt className="text-text-muted">Site origin</dt>
                <dd className="font-mono text-text-primary truncate">{config.origin}</dd>
                <dt className="text-text-muted">API target</dt>
                <dd className="font-mono text-text-primary truncate">{config.apiBaseUrl}</dd>
                <dt className="text-text-muted">WS target</dt>
                <dd className="font-mono text-text-primary truncate">{config.wsUrl}</dd>
              </dl>
              {config.warnings.length > 0 ? (
                <ul className="space-y-2 pt-1">
                  {config.warnings.map((w) => (
                    <li key={w} className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="flex items-center gap-1.5 text-[11px] text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" /> No configuration problems detected.
                </p>
              )}
              <p className="pt-1 text-[10px] text-text-muted">
                Signed in? The app itself is at{' '}
                <Link to="/dashboard" className="text-indigo-600 hover:underline">
                  /dashboard
                </Link>
                .
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default StatusPage;
