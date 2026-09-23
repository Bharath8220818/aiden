import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  CheckSquare,
  Database,
  ExternalLink,
  GitBranch,
  Lightbulb,
  Loader2,
  Mic,
  MicOff,
  Network,
  Paperclip,
  Send,
  Terminal,
  TriangleAlert,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { IntegrationRegistry } from './IntegrationRegistry';
import { QuickLaunch } from './QuickLaunch';
import { sendWorkspaceMessage } from '../services/workspace.service';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

/** Strips any trailing partial speech buffer before appending a fresh chunk. */
const SPEECH_TAIL_RE = /\s*“[^”]*”?\s*$/;
import type {
  ArtifactAction,
  ChatMessage,
  WorkspaceArtifact,
  WorkspaceContextPayload,
} from '../types';

/* ------------------------------------------------------------------ */
/* Sidebar mini-nav (section 3)                                        */
/* ------------------------------------------------------------------ */
const ActivityIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TOOL_LINKS = [
  { label: 'Architecture', path: '/architecture', icon: Network },
  { label: 'Pipeline', path: '/pipelines', icon: GitBranch },
  { label: 'SQL', path: '/sql', icon: Terminal },
  { label: 'Monitor', path: '/monitoring', icon: ActivityIcon },
  { label: 'Fix', path: '/self-healing', icon: TriangleAlert },
];

/* ------------------------------------------------------------------ */
/* Artifact cards (section 7)                                          */
/* ------------------------------------------------------------------ */
const FlowDiagram: React.FC<{ nodes: string[]; edges?: Array<[string, string]> }> = ({ nodes, edges }) => (
  <div className="flex flex-wrap items-center gap-1.5 py-1">
    {nodes.map((n, i) => (
      <React.Fragment key={`${n}-${i}`}>
        {i > 0 && <ArrowRight className="w-3.5 h-3.5 text-text-muted" />}
        <span className="px-2 py-0.5 rounded-md bg-card-hover border border-border text-xs text-text-primary">{n}</span>
      </React.Fragment>
    ))}
    {edges && null}
  </div>
);

const ArtifactCard: React.FC<{
  artifact: WorkspaceArtifact;
  onAction: (action: ArtifactAction) => void;
}> = ({ artifact, onAction }) => {
  const icon = {
    architecture: <Network className="w-4 h-4 text-indigo-600" />,
    pipeline: <GitBranch className="w-4 h-4 text-emerald-600" />,
    sql: <Terminal className="w-4 h-4 text-amber-600" />,
    incident: <TriangleAlert className="w-4 h-4 text-red-600" />,
    knowledge: <Lightbulb className="w-4 h-4 text-violet-600" />,
    task: <CheckSquare className="w-4 h-4 text-sky-600" />,
    table: <Database className="w-4 h-4 text-slate-600" />,
  }[artifact.type] ?? <Database className="w-4 h-4" />;

  return (
    <div
      data-testid="artifact-card"
      className="mt-2 rounded-lg border border-border bg-card p-3 space-y-2 max-w-xl"
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-semibold text-text-primary">{artifact.title}</span>
        {artifact.severity && (
          <Badge variant={artifact.severity === 'critical' || artifact.severity === 'high' ? 'error' : 'warning'} size="sm">
            {artifact.severity}
          </Badge>
        )}
        {artifact.status && !artifact.severity && (
          <Badge variant="neutral" size="sm">{artifact.status}</Badge>
        )}
      </div>

      {(artifact.nodes?.length || artifact.stages?.length) && (
        <FlowDiagram nodes={artifact.nodes ?? artifact.stages ?? []} />
      )}

      {artifact.citations && (
        <div className="space-y-1.5">
          {artifact.citations.map((c) => (
            <div key={c.docId} className="rounded-md bg-card p-2">
              <p className="text-xs font-medium text-text-primary">
                {c.docTitle} <span className="text-text-muted">· score {c.score}</span>
              </p>
              <p className="text-[11px] text-text-secondary mt-0.5 line-clamp-2">{c.content}</p>
            </div>
        ))}
        </div>
      )}

      {artifact.rows && artifact.rows.length > 0 && (
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-xs">
            <tbody>
              {artifact.rows.map((row, i) => (
                <tr key={i} className={cn('border-b border-border/60 last:border-0', i % 2 && 'bg-card')}>
                  {Object.entries(row).map(([k, v]) => (
                    <td key={k} className="px-2.5 py-1.5 text-text-secondary">
                      <span className="text-text-muted mr-1.5">{k}</span>
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {artifact.cause && (
        <p className="text-xs text-text-secondary">
          <span className="text-text-muted">Cause:</span> {artifact.cause}
        </p>
      )}
      {artifact.fix && (
        <p className="text-xs text-text-secondary">
          <span className="text-text-muted">Proposed fix:</span> {artifact.fix}
        </p>
      )}

      {artifact.actions && artifact.actions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {artifact.actions.map((a) => (
            <button
              key={a}
              onClick={() => onAction({ label: a, kind: a as ArtifactAction['kind'] })}
              className="px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-600/15 text-indigo-600 border border-indigo-500/30 hover:bg-indigo-600/25 transition-colors"
            >
              {actionLabel(a)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

function actionLabel(action: string): string {
  const labels: Record<string, string> = {
    open: 'Open',
    build: 'Build Pipeline',
    run: 'Run',
    edit: 'Edit',
    validate: 'Validate',
    'review-fix': 'Review Fix',
    introspect: 'Introspect',
    'open-sql': 'Open SQL Workspace',
  };
  return labels[action] ?? action;
}

/* ------------------------------------------------------------------ */
/* Context panel (section 5) + Integration Registry (section 13)       */
/* ------------------------------------------------------------------ */
const ContextPanel: React.FC<{
  context: WorkspaceContextPayload | null;
  onOpenPipeline: () => void;
}> = ({ context, onOpenPipeline }) => (
  <div data-testid="context-panel" className="w-72 shrink-0 border-l border-border bg-card p-4 space-y-5 overflow-y-auto hidden xl:block">
    <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Context</p>
    <IntegrationRegistry />
    {!context ? (
      <p className="text-xs text-text-secondary">Ask AIDEN something and the relevant context appears here.</p>
    ) : (
      <>
        <div>
          <p className="text-[10px] text-text-muted uppercase">Project</p>
          <p className="text-sm text-text-primary mt-0.5">{context.projectName ?? 'No project selected'}</p>
        </div>
        {context.pipelines && context.pipelines.length > 0 && (
          <div>
            <p className="text-[10px] text-text-muted uppercase mb-1.5">Pipelines</p>
            <div className="space-y-1">
              {context.pipelines.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-xs">
                  <span className="text-text-primary truncate">{p.name}</span>
                  <span className={cn('ml-2 shrink-0', p.status === 'active' ? 'text-emerald-600' : 'text-text-secondary')}>● {p.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {context.incidents && context.incidents.length > 0 && (
          <div>
            <p className="text-[10px] text-text-muted uppercase mb-1.5">Open Incidents</p>
            <div className="space-y-1.5">
              {context.incidents.map((i) => (
                <div key={i.id} className="rounded-md bg-card border border-border p-2">
                  <p className="text-xs text-text-primary truncate">{i.title}</p>
                  <p className="text-[10px] text-text-secondary mt-0.5">
                    {i.severity} · {i.status}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
        {context.projectId && (
          <button
            onClick={onOpenPipeline}
            className="w-full px-3 py-1.5 rounded-md text-xs font-medium bg-card border border-border text-text-primary hover:bg-card-hover transition-colors"
          >
            Open Pipelines
          </button>
        )}
      </>
    )}
  </div>
);

/* ------------------------------------------------------------------ */
/* Universal AI input (section 6) — voice + attachments                */
/* ------------------------------------------------------------------ */

/** Text formats whose contents are sent to AIDEN inline (≤ 64 KB each). */
const INLINE_EXTS = ['.md', '.markdown', '.txt', '.csv', '.json', '.sql', '.py', '.yaml', '.yml', '.html', '.htm'];
const INLINE_MAX_BYTES = 64 * 1024;

interface AttachedFile {
  name: string;
  size: number;
  /** Inlined text content for text formats; undefined for binaries. */
  content?: string;
}

async function stagedFile(file: File): Promise<AttachedFile> {
  const lower = file.name.toLowerCase();
  const isText = INLINE_EXTS.some((ext) => lower.endsWith(ext)) && file.size <= INLINE_MAX_BYTES;
  if (!isText) return { name: file.name, size: file.size };
  try {
    return { name: file.name, size: file.size, content: await file.text() };
  } catch {
    return { name: file.name, size: file.size };
  }
}

const UniversalInput: React.FC<{
  onSend: (text: string) => void;
  isSending: boolean;
}> = ({ onSend, isSending }) => {
  const [value, setValue] = useState('');
  const [micError, setMicError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const {
    isSupported: micSupported,
    isListening,
    transcript,
    interim,
    error: speechError,
    start: startSpeech,
    stop: stopSpeech,
  } = useSpeechRecognition();

  // Final transcript chunks flow into the textarea as they arrive; interim
  // (still-being-said) text is shown live in the placeholder strip below.
  useEffect(() => {
    if (!transcript) return;
    setValue((prev) => {
      const base = prev.replace(SPEECH_TAIL_RE, '');
      return base ? `${base} ${transcript}` : transcript;
    });
    setMicError(null);
  }, [transcript]);

  const submit = () => {
    if (isSending) return;
    const text = value.trim();
    if (!text && attachments.length === 0) return;
    if (isListening) stopSpeech();
    // Attachments with inlined content ride along as fenced context blocks;
    // binaries are listed by name so AIDEN can still acknowledge them.
    const attachBlocks = attachments
      .map((a) =>
        a.content != null
          ? `\n\n--- attached: ${a.name} ---\n${a.content}`
          : `\n\n(attached file, not previewable: ${a.name}, ${(a.size / 1024).toFixed(1)} KB)`
      )
      .join('');
    onSend((text || `Please review my attached file${attachments.length > 1 ? 's' : ''}: ${attachments.map((a) => a.name).join(', ')}`) + attachBlocks);
    setValue('');
    setAttachments([]);
  };

  const toggleMic = () => {
    if (isListening) {
      stopSpeech();
    } else {
      setMicError(null);
      startSpeech();
    }
  };

  const micDisabled = !micSupported;
  const micTitle = !micSupported
    ? 'Voice input needs Chrome or Edge (Web Speech API)'
    : isListening
      ? 'Stop voice input'
      : 'Dictate your request';

  return (
    <div className="border-t border-border bg-card p-3">
      <div className="flex items-end gap-2 max-w-4xl mx-auto">
        <textarea
          ref={inputRef}
          data-testid="workspace-input"
          rows={2}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Ask AIDEN anything…   /pipeline  /sql  /incident  /task"
          className="flex-1 resize-none rounded-lg bg-card border border-border px-3.5 py-2.5 text-sm text-text-primary placeholder-[#9CA3AF] focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
        />
        <button
          type="button"
          aria-label={micTitle}
          title={micTitle}
          data-testid="workspace-mic"
          onClick={toggleMic}
          disabled={micDisabled}
          className={cn(
            'p-2.5 rounded-lg transition-colors',
            isListening
              ? 'bg-red-500/15 text-red-600 border border-red-500/40 animate-pulse'
              : 'text-text-muted hover:text-text-primary hover:bg-card',
            micDisabled && 'opacity-40 cursor-not-allowed hover:text-text-muted hover:bg-transparent'
          )}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>
        <button
          type="button"
          aria-label="Attach files"
          title="Attach files (md/txt/csv/sql/json/py feed AIDEN directly)"
          data-testid="workspace-attach"
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-card transition-colors"
        >
          <Paperclip className="w-4 h-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            void Promise.all(files.map(stagedFile)).then((staged) => {
              setAttachments((prev) => {
                const names = new Set(prev.map((a) => a.name));
                return [...prev, ...staged.filter((f) => !names.has(f.name))];
              });
            });
            e.target.value = '';
          }}
        />
        <button
          aria-label="Send message"
          data-testid="workspace-send"
          onClick={submit}
          disabled={isSending || (!value.trim() && attachments.length === 0)}
          className="p-2.5 rounded-lg bg-indigo-600 text-white disabled:opacity-40 hover:bg-indigo-500 transition-colors"
        >
          {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
      {attachments.length > 0 && (
        <div className="max-w-4xl mx-auto mt-2 flex flex-wrap gap-1.5">
          {attachments.map((a, i) => (
            <span
              key={`${a.name}-${i}`}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-card border border-border text-[11px] text-text-secondary"
            >
              <Paperclip className="w-3 h-3 text-indigo-600" />
              <span className="max-w-[180px] truncate">{a.name}</span>
              <span className="text-text-secondary">{(a.size / 1024).toFixed(1)} KB</span>
              <button
                type="button"
                aria-label={`Remove ${a.name}`}
                onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                className="hover:text-indigo-600 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      {(isListening || speechError || micError) && (
        <div
          data-testid="workspace-mic-status"
          className="max-w-4xl mx-auto mt-1.5 flex items-center gap-2 text-[11px]"
        >
          {isListening && (
            <span className="flex items-center gap-1.5 text-red-600">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              Listening…
              {interim && <span className="text-text-secondary italic"> “{interim}”</span>}
            </span>
          )}
          {(speechError || micError) && <span className="text-amber-600">{speechError ?? micError}</span>}
        </div>
        )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export const WorkspacePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Project context (spec §10): the topbar selector defines AIDEN's context
  // boundary — every chat request carries it so RAG, tasks, and incidents stay
  // project-scoped. The header (ProjectSelector → "Work with AIDEN") jumps
  // here with the project preselected; this chip shows + manages it in-page.
  const currentProject = useWorkspaceStore((s) => s.currentProject);
  const setActiveProject = useWorkspaceStore((s) => s.setActiveProject);
  const projectId = currentProject?.id ?? null;

  // Deep-link contract (WI-2): /workspace?p=<route>&projectId=<id>&focus=<id>
  // `p` highlights the launched page in Quick Launch; `projectId` applies
  // project context on arrival; `focus` names an artifact to pin a greeting
  // for (the conversation then continues with that context loaded).
  const params = new URLSearchParams(location.search);
  const highlightPath = params.get('p');
  const focusId = params.get('focus');
  const [focusNote, setFocusNote] = useState<string | null>(null);
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const deepProjectId = params.get('projectId');
    const deepProjectName = params.get('projectName');
    if (deepProjectId && (!currentProject || currentProject.id !== deepProjectId)) {
      setActiveProject({
        id: deepProjectId,
        name: deepProjectName ?? deepProjectId,
        workspaceId: '',
      });
    }
    if (focusId) {
      setFocusNote(`Continuing from ${focusId} — ask me anything about it.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const projectIdFromDeepLink = params.get('projectId');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'aiden',
      text: "I'm AIDEN. Ask me to design a pipeline, investigate a failure, check platform health, or create a task — I'll bring the right tools into the workspace.",
      ts: new Date().toISOString(),
    },
  ]);
  const [context, setContext] = useState<WorkspaceContextPayload | null>(null);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && typeof el.scrollTo === 'function') {
      el.scrollTo({ top: el.scrollHeight });
    }
  }, [messages]);

  const handleAction = useCallback(
    (action: ArtifactAction) => {
      const routes: Record<string, string> = {
        open: '/pipelines/manage',
        build: '/pipelines',
        run: '/pipelines/manage',
        edit: '/architecture',
        validate: '/architecture',
        'review-fix': '/self-healing',
        introspect: '/connections',
        'open-sql': '/sql',
      };
      navigate(routes[action.kind] ?? '/dashboard');
    },
    [navigate]
  );

  const handleSend = useCallback(
    async (text: string, overrideProjectId?: string | null) => {
      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        text,
        ts: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsSending(true);
      try {
        const history = messages.slice(-8).map((m) => ({ role: m.role, content: m.text }));
        const response = await sendWorkspaceMessage(text, overrideProjectId ?? projectId, history);
        setContext(response.context);
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'aiden',
            text: response.reply,
            ts: new Date().toISOString(),
            intent: response.intent,
            artifacts: response.artifacts,
            suggestions: response.suggestions,
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: 'aiden',
            text: 'Something went wrong reaching the AIDEN backend. Check that it is running and try again.',
            ts: new Date().toISOString(),
          },
        ]);
      } finally {
        setIsSending(false);
      }
    },
    [messages, projectId]
  );

  // Quick Launch suggestions: pre-seed the input intent per target page so
  // "Work here" starts the conversation already pointed at the domain.
  const workHere = useCallback(
    (path: string) => {
      const seed: Record<string, string> = {
        '/architecture': 'Draft an architecture for ',
        '/pipelines': 'Create a pipeline that ',
        '/pipelines/manage': 'What is the status of my pipelines?',
        '/sql': 'Write a SQL query that ',
        '/connections': 'Show me the tables in my connected warehouse',
        '/monitoring': 'Check platform health',
        '/incidents': 'Show me why the latest incident happened',
        '/self-healing': 'Walk me through the healing plan for the latest incident',
        '/agents': 'What can each of my agents do?',
        '/knowledge': 'What do you know about ',
        '/integrations': 'Which tools and integrations are available?',
        '/approvals': 'Which approvals are waiting and why?',
        '/governance': 'Show recent audit activity',
        '/team': 'Who is on my team and what can they do?',
        '/projects': 'Help me start a new project ',
        '/dashboard': 'Give me a status summary of everything',
      };
      const note = seed[path];
      if (note) {
        void handleSend(note.endsWith(' ') ? `${note}…` : note);
      } else {
        navigate(path);
      }
    },
    [handleSend, navigate]
  );

  const effectiveProjectId = projectIdFromDeepLink ?? projectId;

  return (
    <div data-testid="workspace-page" className="flex flex-col h-[calc(100vh-4rem)] bg-background">
      {/* Zone 0: active project context chip (header ↔ workspace link) */}
      <div className="border-b border-border bg-card px-6 py-2 flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Context</span>
        {currentProject ? (
          <span
            data-testid="workspace-project-chip"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-600"
          >
            {currentProject.name}
            <button
              aria-label={`Open project ${currentProject.name}`}
              title="Open project detail"
              onClick={() => navigate(`/projects/${currentProject.id}`)}
              className="hover:text-indigo-600 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
            </button>
            <button
              aria-label="Clear project context"
              title="Work workspace-wide instead"
              onClick={() => setActiveProject(null)}
              className="hover:text-indigo-600 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ) : (
          <button
            data-testid="workspace-project-chip"
            onClick={() => navigate('/projects')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card border border-border text-xs text-text-secondary hover:text-text-primary hover:border-border-highlight transition-colors"
          >
            All Projects — pick one to scope AIDEN's memory
          </button>
        )}
        <span className="ml-auto text-[10px] text-text-muted">
          Chat, artifacts, and RAG retrieval are scoped to this context
        </span>
      </div>

      {/* Zone 0.5: Quick Launch — every page one click away (universal page) */}
      <div className="border-b border-border bg-background px-6 py-2">
        <QuickLaunch highlightPath={highlightPath} />
      </div>

      {/* Zone 1: workspace canvas with conversation + embedded tool links */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="max-w-4xl mx-auto space-y-4">
              {focusNote && (
                <div
                  data-testid="workspace-focus-note"
                  className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-2 text-xs text-indigo-600"
                >
                  {focusNote}
                </div>
              )}
              {messages.map((m) => (
                <div key={m.id} className={cn('flex message-in', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div className={cn('max-w-2xl', m.role === 'user' ? 'max-w-md' : 'w-full')}>
                    <div
                      className={cn(
                        'rounded-xl px-4 py-2.5 text-sm leading-relaxed',
                        m.role === 'user'
                          ? 'bg-indigo-600 text-white rounded-br-sm'
                          : 'bg-card border border-border text-text-primary rounded-bl-sm'
                      )}
                    >
                      {m.role === 'aiden' && (
                        <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-indigo-600 mb-1">
                          <Bot className="w-3 h-3" /> AIDEN{m.intent && ` · ${m.intent}`}
                        </p>
                      )}
                      {m.text}
                    </div>
                    {m.artifacts?.map((artifact, i) => (
                      <ArtifactCard key={i} artifact={artifact} onAction={handleAction} />
                    ))}
                    {m.suggestions && m.suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {m.suggestions.map((s) => (
                          <button
                            key={s}
                            onClick={() => handleSend(s)}
                            className="px-2.5 py-1 rounded-full text-xs bg-card border border-border text-text-secondary hover:text-text-primary hover:border-border-highlight transition-colors"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Zone 3: right context panel */}
        <ContextPanel
          context={context}
          onOpenPipeline={() => navigate('/pipelines/manage')}
        />
      </div>

      {/* Zone 4: universal AI input */}
      <UniversalInput onSend={(text) => handleSend(text, effectiveProjectId)} isSending={isSending} />
    </div>
  );
};

export default WorkspacePage;
