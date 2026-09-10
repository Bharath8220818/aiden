import { type ReactNode } from 'react';

interface Stat {
  label: string;
  value: string | number;
  accent?: 'green' | 'amber' | 'red' | 'purple' | 'cyan';
}

interface OpsPageShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  stats?: Stat[];
  children: ReactNode;
}

const accentText: Record<NonNullable<Stat['accent']>, string> = {
  green: 'text-emerald-400',
  amber: 'text-amber-400',
  red: 'text-rose-400',
  purple: 'text-purple-400',
  cyan: 'text-cyan-400',
};

/**
 * Shared shell for operations pages: title bar, optional stat row, content.
 * Keeps all new Stage-1 pages visually consistent with the dark enterprise theme.
 */
export function OpsPageShell({ title, subtitle, actions, stats = [], children }: OpsPageShellProps) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-[var(--color-text-muted)]">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>

      {stats.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"
            >
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                {s.label}
              </p>
              <p className={`mt-1 text-2xl font-semibold ${s.accent ? accentText[s.accent] : 'text-[var(--color-text)]'}`}>
                {s.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {children}
    </div>
  );
}

export default OpsPageShell;
