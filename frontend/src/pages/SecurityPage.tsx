import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, Users, Puzzle } from 'lucide-react';
import OpsPageShell from '../components/ops/OpsPageShell';
import { api } from '../api';

interface RiskAssessment {
  tool: string;
  action: string;
  environment: string;
  base_score: number;
  risk: string;
  approval_required: boolean;
}

const riskBadge: Record<string, string> = {
  low: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  high: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  critical: 'bg-rose-600/20 text-rose-300 border-rose-600/40',
};

const SAMPLE_ACTIONS: Array<{ tool: string; action: string }> = [
  { tool: 'database', action: 'execute_readonly_sql' },
  { tool: 'airflow', action: 'trigger_dag' },
  { tool: 'database', action: 'delete_data' },
  { tool: 'kafka', action: 'delete_topic' },
];

const ROLES = [
  { role: 'viewer', can: 'Read-only: view dashboards, schemas, and logs' },
  { role: 'engineer', can: 'Run pipelines, trigger DAGs, execute read-only SQL' },
  { role: 'admin', can: 'Approve high-risk changes, manage connections and team' },
  { role: 'owner', can: 'Approve critical changes, delete projects, manage billing' },
];

export default function SecurityPage() {
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [plugins, setPlugins] = useState<Array<{ name: string; type: string }>>([]);

  useEffect(() => {
    // Risk assessments are computed client-side from the same matrix the backend uses,
    // so the page works even before login.
    const envFactor: Record<string, number> = { dev: 1, staging: 2, production: 3 };
    const baseScore: Record<string, number> = {
      execute_readonly_sql: 2, trigger_dag: 6, delete_data: 10, delete_topic: 9,
    };
    const level = (score: number) => (score <= 3 ? 'low' : score <= 9 ? 'medium' : score <= 18 ? 'high' : 'critical');
    setAssessments(
      SAMPLE_ACTIONS.flatMap(({ tool, action }) =>
        ['dev', 'production'].map(environment => ({
          tool, action, environment,
          base_score: baseScore[action],
          risk: level(baseScore[action] * (envFactor[environment] ?? 2)),
          approval_required: baseScore[action] * (envFactor[environment] ?? 2) > 3,
        })),
      ),
    );

    api.get('/api/v1/admin/plugins')
      .then(r => setPlugins(r.data.plugins ?? []))
      .catch(() => setPlugins([]));
  }, []);

  return (
    <OpsPageShell
      title="Security"
      subtitle="Risk policy, role permissions, and plugin trust"
      stats={[
        { label: 'Roles', value: ROLES.length },
        { label: 'Plugins', value: plugins.length, accent: 'purple' },
      ]}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-purple-400" />
            <h2 className="font-semibold text-[var(--color-text)]">Risk Matrix</h2>
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Score = action risk × environment factor (dev ×1, production ×3). Anything above LOW requires approval.
          </p>
          <div className="mt-3 overflow-hidden rounded-lg border border-[var(--color-border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-background)] text-left text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
                <tr>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Environment</th>
                  <th className="px-3 py-2">Risk</th>
                  <th className="px-3 py-2">Approval</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {assessments.map((a, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 font-mono text-xs text-[var(--color-text)]">{a.action}</td>
                    <td className="px-3 py-2 capitalize text-[var(--color-text-secondary)]">{a.environment}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${riskBadge[a.risk]}`}>{a.risk}</span>
                    </td>
                    <td className="px-3 py-2 text-xs text-[var(--color-text-muted)]">{a.approval_required ? 'Required' : 'Not required'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-cyan-400" />
            <h2 className="font-semibold text-[var(--color-text)]">Role Permissions</h2>
          </div>
          <div className="mt-3 space-y-2">
            {ROLES.map(r => (
              <div key={r.role} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3">
                <p className="font-mono text-sm font-medium capitalize text-[var(--color-text)]">{r.role}</p>
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{r.can}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <div className="flex items-center gap-2">
          <Puzzle className="h-5 w-5 text-emerald-400" />
          <h2 className="font-semibold text-[var(--color-text)]">Notification Plugins</h2>
        </div>
        {plugins.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Plugin registry needs admin access to display. Built-in plugins: email, slack, teams.
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {plugins.map(p => (
              <span key={p.name} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                <ShieldAlert className="h-3 w-3" /> {p.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </OpsPageShell>
  );
}
