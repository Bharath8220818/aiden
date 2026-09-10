import { useCallback, useEffect, useRef, useState } from 'react';
import { Terminal, Trash2 } from 'lucide-react';
import OpsPageShell from '../components/ops/OpsPageShell';
import { api } from '../api';

interface Line {
  kind: 'input' | 'output' | 'error' | 'system';
  text: string;
}

const HELP_LINES = [
  'Available commands:',
  '  help                     Show this help',
  '  ask <question>           Ask AIDEN anything (routes through the orchestrator)',
  '  status                   Show orchestrator status',
  '  agents                   List registered agents',
  '  connectors               List tool connectors',
  '  quality                  Show recent data-quality results',
  '  incidents                List open incidents',
  '  clear                    Clear the terminal',
  '',
  'Anything else is sent to the orchestrator as a natural-language request.',
];

const PROMPT = 'aiden>';

export default function CLITerminalPage() {
  const [lines, setLines] = useState<Line[]>([
    { kind: 'system', text: 'AIDEN Terminal — connected to the orchestrator. Type "help" for commands.' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const push = useCallback((kind: Line['kind'], text: string) => {
    setLines(prev => [...prev, { kind, text }]);
  }, []);

  const run = useCallback(async (raw: string) => {
    const cmd = raw.trim();
    if (!cmd) return;
    push('input', cmd);
    setHistory(prev => [cmd, ...prev].slice(0, 100));
    setHistoryIdx(-1);

    const [verb, ...rest] = cmd.split(/\s+/);
    const arg = rest.join(' ');

    if (verb === 'clear') { setLines([]); return; }
    if (verb === 'help') { HELP_LINES.forEach(t => push('system', t)); return; }

    setBusy(true);
    try {
      if (verb === 'status') {
        const r = await api.get('/api/v1/execution/status');
        push('output', `Agents: ${(r.data.agents ?? []).length} · Runs: ${r.data.total_runs ?? 0}`);
      } else if (verb === 'agents') {
        const r = await api.get('/api/v1/execution/agents');
        const agents: Array<{ name: string; type: string; description: string }> = r.data.agents ?? [];
        agents.forEach(a => push('output', `${a.name.padEnd(16)} ${a.type.padEnd(14)} ${a.description}`));
      } else if (verb === 'connectors') {
        const r = await api.get('/api/v1/execution/connectors');
        const connectors: Array<{ name: string; status: string }> = r.data.connectors ?? [];
        connectors.forEach(c => push('output', `${c.name.padEnd(16)} ${c.status}`));
      } else if (verb === 'quality') {
        const r = await api.get('/api/v1/monitoring/quality', { params: { limit: 10 } });
        const rows: Array<{ rule_name: string; status: string; evaluated_at: string }> = r.data ?? [];
        if (rows.length === 0) push('output', 'No quality checks recorded yet.');
        rows.forEach(q => push('output', `${q.rule_name.padEnd(30)} ${q.status}  ${q.evaluated_at?.slice(0, 19) ?? ''}`));
      } else if (verb === 'incidents') {
        const r = await api.get('/api/v1/incidents', { params: { limit: 10 } });
        const rows: Array<{ incident_key: string; severity: string; status: string; title: string }> = r.data ?? [];
        if (rows.length === 0) push('output', 'No incidents.');
        rows.forEach(i => push('output', `${i.incident_key}  ${i.severity.padEnd(9)} ${i.status.padEnd(13)} ${i.title}`));
      } else if (verb === 'ask' && arg) {
        const r = await api.post('/api/v1/execution/execute', { objective: arg, project_id: 'default' });
        push('output', r.data.summary ?? JSON.stringify(r.data).slice(0, 800));
      } else {
        // Natural language → orchestrator
        const r = await api.post('/api/v1/execution/execute', { objective: cmd, project_id: 'default' });
        push('output', r.data.summary ?? JSON.stringify(r.data).slice(0, 800));
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { status?: number }; message?: string })?.response?.status === 401
        ? 'Not authenticated. Log in first.'
        : (e as Error)?.message ?? 'Request failed. Is the backend running?';
      push('error', msg);
    } finally {
      setBusy(false);
    }
  }, [push]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !busy) {
      run(input);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(historyIdx + 1, history.length - 1);
      if (next >= 0) { setHistoryIdx(next); setInput(history[next]); }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = historyIdx - 1;
      setHistoryIdx(next);
      setInput(next >= 0 ? history[next] : '');
    }
  };

  const lineColor = (kind: Line['kind']) =>
    kind === 'input' ? 'text-purple-300'
    : kind === 'error' ? 'text-rose-400'
    : kind === 'system' ? 'text-cyan-400'
    : 'text-[var(--color-text)]';

  return (
    <OpsPageShell
      title="CLI Terminal"
      subtitle="Talk to the AIDEN orchestrator without leaving the browser"
      actions={
        <button onClick={() => setLines([])} className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-card-hover)]">
          <Trash2 className="h-4 w-4" /> Clear
        </button>
      }
    >
      <div
        className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[#0B0F1A]"
        onClick={() => inputRef.current?.focus()}
      >
        <div className="flex items-center gap-2 border-b border-[#1F2937] px-4 py-2">
          <Terminal className="h-4 w-4 text-purple-400" />
          <span className="font-mono text-xs text-slate-400">aiden — web terminal</span>
          {busy && <span className="ml-auto font-mono text-xs text-purple-400">running…</span>}
        </div>
        <div className="h-[480px] overflow-y-auto p-4 font-mono text-sm leading-6">
          {lines.map((l, i) => (
            <div key={i} className={`whitespace-pre-wrap break-words ${lineColor(l.kind)}`}>
              {l.kind === 'input' ? `${PROMPT} ${l.text}` : l.text}
            </div>
          ))}
          {busy && <div className="animate-pulse text-purple-400">▊</div>}
          <div ref={bottomRef} />
        </div>
        <div className="flex items-center gap-2 border-t border-[#1F2937] px-4 py-3">
          <span className="font-mono text-sm text-purple-400">{PROMPT}</span>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={busy}
            placeholder={busy ? '' : 'ask why is the customer_etl pipeline slow?'}
            className="flex-1 bg-transparent font-mono text-sm text-[var(--color-text)] placeholder:text-slate-500 focus:outline-none"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>
    </OpsPageShell>
  );
}
