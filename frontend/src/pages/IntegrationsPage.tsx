import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plug, Webhook, Puzzle, ArrowRight, Database, GitBranch, Layers } from 'lucide-react';
import OpsPageShell from '../components/ops/OpsPageShell';
import { api } from '../api';

interface ConnectorInfo {
  name: string;
  display_name?: string;
  category?: string;
  status?: string;
}

interface WebhookInfo {
  id: string;
  name: string;
  url: string;
  is_active: boolean;
}

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  database: <Database className="h-4 w-4 text-cyan-400" />,
  orchestration: <GitBranch className="h-4 w-4 text-purple-400" />,
  streaming: <Layers className="h-4 w-4 text-emerald-400" />,
  compute: <Layers className="h-4 w-4 text-amber-400" />,
  transformation: <Layers className="h-4 w-4 text-purple-400" />,
  storage: <Database className="h-4 w-4 text-cyan-400" />,
};

export default function IntegrationsPage() {
  const [connectors, setConnectors] = useState<ConnectorInfo[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookInfo[]>([]);
  const [plugins, setPlugins] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get('/api/v1/execution/connectors'),
      api.get('/api/v1/webhooks/'),
      api.get('/api/v1/admin/plugins'),
    ]).then(([c, w, p]) => {
      if (c.status === 'fulfilled') setConnectors(c.value.data.connectors ?? []);
      if (w.status === 'fulfilled') setWebhooks(w.value.data ?? []);
      if (p.status === 'fulfilled') setPlugins((p.value.data.plugins ?? []).map((x: { name: string }) => x.name));
    }).finally(() => setLoading(false));
  }, []);

  const healthy = connectors.filter(c => c.status === 'connected').length;

  return (
    <OpsPageShell
      title="Integrations"
      subtitle="Everything AIDEN connects to: tools, webhooks, and plugins"
      stats={[
        { label: 'Connectors', value: connectors.length },
        { label: 'Connected', value: healthy, accent: healthy > 0 ? 'green' : undefined },
        { label: 'Webhooks', value: webhooks.length, accent: 'purple' },
        { label: 'Plugins', value: plugins.length, accent: 'cyan' },
      ]}
    >
      {loading ? (
        <div className="h-48 animate-pulse rounded-xl bg-[var(--color-card)]" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plug className="h-5 w-5 text-purple-400" />
                <h2 className="font-semibold text-[var(--color-text)]">Tool Connectors</h2>
              </div>
              <Link to="/tool-gateway" className="inline-flex items-center gap-1 text-xs font-medium text-purple-400 hover:text-purple-300">
                Manage <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {connectors.length === 0 && (
                <p className="text-sm text-[var(--color-text-muted)]">Start the backend to list connectors.</p>
              )}
              {connectors.map(c => (
                <div key={c.name} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2">
                  <div className="flex items-center gap-2">
                    {CATEGORY_ICON[c.category ?? ''] ?? <Plug className="h-4 w-4 text-slate-400" />}
                    <span className="text-sm font-medium text-[var(--color-text)]">{c.display_name ?? c.name}</span>
                  </div>
                  <span className={`font-mono text-xs capitalize ${c.status === 'connected' ? 'text-emerald-400' : 'text-slate-400'}`}>{c.status ?? '—'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
              <div className="flex items-center gap-2">
                <Webhook className="h-5 w-5 text-cyan-400" />
                <h2 className="font-semibold text-[var(--color-text)]">Outbound Webhooks</h2>
              </div>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                {webhooks.length === 0
                  ? 'No webhooks registered. POST /api/v1/webhooks/ to subscribe pipelines and incidents to an external URL.'
                  : `${webhooks.length} active webhook${webhooks.length === 1 ? '' : 's'} delivering signed events.`}
              </p>
            </div>

            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
              <div className="flex items-center gap-2">
                <Puzzle className="h-5 w-5 text-emerald-400" />
                <h2 className="font-semibold text-[var(--color-text)]">Notification Plugins</h2>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {plugins.length === 0
                  ? <p className="text-xs text-[var(--color-text-muted)]">email · slack · teams (built-in)</p>
                  : plugins.map(p => (
                      <span key={p} className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">{p}</span>
                    ))}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
              <h2 className="text-sm font-semibold text-[var(--color-text)]">Stored Connections</h2>
              <Link to="/data-sources" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-purple-400 hover:text-purple-300">
                View data sources <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </OpsPageShell>
  );
}
