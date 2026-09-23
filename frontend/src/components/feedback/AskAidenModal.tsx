import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useUIStore } from '@/store/uiStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  Sparkles,
  ArrowRight,
  CornerDownLeft,
  Bot,
  GitBranch,
  AlertOctagon,
  Terminal,
  Search,
  FolderOpen,
  MapPin,
  X,
} from 'lucide-react';

/** Human label for the route the user is on when they open the panel. */
const ROUTE_LABELS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /^\/dashboard/, label: 'Dashboard' },
  { pattern: /^\/projects/, label: 'Projects' },
  { pattern: /^\/requirements/, label: 'Requirement Studio' },
  { pattern: /^\/architecture/, label: 'Architecture Studio' },
  { pattern: /^\/pipelines\/manage/, label: 'Pipeline Manager' },
  { pattern: /^\/pipelines/, label: 'Pipeline Builder' },
  { pattern: /^\/sql/, label: 'SQL Workspace' },
  { pattern: /^\/connections/, label: 'Connections' },
  { pattern: /^\/monitoring/, label: 'Monitoring' },
  { pattern: /^\/incidents/, label: 'Incidents' },
  { pattern: /^\/self-healing/, label: 'Self-Healing' },
  { pattern: /^\/agents/, label: 'Agents' },
  { pattern: /^\/knowledge/, label: 'Knowledge' },
  { pattern: /^\/governance/, label: 'Governance' },
  { pattern: /^\/team/, label: 'Team' },
  { pattern: /^\/integrations/, label: 'Integrations' },
  { pattern: /^\/approvals/, label: 'Approvals' },
];

const routeContext = (pathname: string): string | null => {
  for (const { pattern, label } of ROUTE_LABELS) {
    if (pattern.test(pathname)) return label;
  }
  return null;
};

export const AskAidenModal: React.FC = () => {
  const { isAskAidenOpen, closeAskAiden } = useUIStore();
  const { currentProject } = useWorkspaceStore();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [responseMessage, setResponseMessage] = useState<string | null>(null);

  const project = currentProject;
  const page = routeContext(location.pathname);

  const placeholder = useMemo(() => {
    if (project && page) return `Ask about ${project.name} ${page.toLowerCase()}…`;
    if (project) return `Ask about ${project.name}…`;
    if (page) return `Ask about ${page.toLowerCase()}…`;
    return 'e.g. Create a daily sales pipeline from PostgreSQL to Snowflake with anomaly detection...';
  }, [project, page]);

  const quickCommands = [
    {
      title: 'Generate pipeline',
      prompt: 'Create a daily sales pipeline from PostgreSQL to Snowflake with hourly incremental CDC',
      icon: GitBranch,
      tag: 'Studio',
    },
    {
      title: 'Diagnose failed pipeline',
      prompt: 'Diagnose failure on fraud_stream_processor: checkpoint timeout on Spark worker 3',
      icon: AlertOctagon,
      tag: 'Self-Healing',
    },
    {
      title: 'Explain architecture',
      prompt: 'Summarize customer_360 end-to-end data lineage and dependency graph',
      icon: Bot,
      tag: 'Architecture',
    },
    {
      title: 'Optimize SQL',
      prompt: 'Analyze query execution plan for aggregated_monthly_revenue and suggest partitioning indexes',
      icon: Terminal,
      tag: 'SQL',
    },
  ];

  const handleSubmit = (promptText?: string) => {
    const textToSubmit = promptText || query;
    if (!textToSubmit.trim()) return;

    setIsProcessing(true);
    setResponseMessage(null);

    // Context envelope (spec §20): the panel tells AIDEN where the user is —
    // which project and which page — so pronouns like "it" resolve correctly.
    // In Phase 3 this rides on the /ask endpoint alongside the prompt.
    const contextEnvelope = [
      project ? `project: ${project.name} (${project.id})` : null,
      page ? `page: ${page}` : null,
    ]
      .filter(Boolean)
      .join(' | ');

    // Mock autonomous AI generation response for Phase 1
    setTimeout(() => {
      setIsProcessing(false);
      const scope = project ? ` within ${project.name}` : ' across the workspace';
      setResponseMessage(
        `AIDEN Autonomous Agent has analyzed: "${textToSubmit}"${scope} [context: ${contextEnvelope || 'global'}]. Requirement intent identified. In Phase 3, this will auto-generate requirement specifications, pipeline DAGs, and validation tests.`
      );
    }, 800);
  };

  const handleReset = () => {
    setQuery('');
    setResponseMessage(null);
    closeAskAiden();
  };

  return (
    <Modal
      isOpen={isAskAidenOpen}
      onClose={handleReset}
      maxWidth="2xl"
      className="p-0 border-indigo-500/30 shadow-ai-glow"
    >
      {/* Top AI Banner */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-600 flex items-center justify-center shadow-ai-glow">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
              Ask AIDEN
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-600 border border-indigo-500/30">
                Autonomous AI
              </span>
            </h2>
            <p className="text-xs text-text-secondary">
              Natural language to data pipelines, root-cause diagnosis, &amp; architecture
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Context chips (spec §20 context awareness) */}
        {(project || page) && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-text-muted font-semibold">
              <MapPin className="w-3 h-3" /> Context
            </span>
            {project && (
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-[11px] font-medium text-indigo-600">
                <FolderOpen className="w-3 h-3" />
                {project.name}
                <button
                  onClick={() => useWorkspaceStore.getState().setActiveProject(null)}
                  className="ml-0.5 text-indigo-600/70 hover:text-indigo-200 transition-colors"
                  aria-label={`Clear ${project.name} project context`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {page && (
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-card border border-border text-[11px] font-medium text-text-secondary">
                {page}
              </span>
            )}
          </div>
        )}

        {/* Main Prompt Input */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-2">
            What do you want to build or diagnose?
          </label>
          <div className="relative">
            <textarea
              rows={3}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder={placeholder}
              className="w-full bg-background text-text-primary placeholder-[#9CA3AF] text-sm rounded-lg border border-border p-3.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
            />
            <div className="absolute right-3 bottom-3 flex items-center gap-2">
              <span className="text-[11px] text-text-muted flex items-center gap-1 font-mono">
                <CornerDownLeft className="w-3 h-3" /> Enter
              </span>
              <Button
                size="sm"
                variant="ai"
                isLoading={isProcessing}
                onClick={() => handleSubmit()}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Execute
              </Button>
            </div>
          </div>
        </div>

        {/* AI Output preview */}
        {responseMessage && (
          <div className="p-4 rounded-lg bg-indigo-950/30 border border-indigo-500/40 text-xs text-indigo-200 leading-relaxed flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-white">Autonomous Agent Response:</p>
              <p>{responseMessage}</p>
            </div>
          </div>
        )}

        {/* Recent Commands / Suggestions */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2.5">
            Quick Actions &amp; Recent Commands
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {quickCommands.map((cmd, idx) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setQuery(cmd.prompt);
                    handleSubmit(cmd.prompt);
                  }}
                  className="group flex flex-col p-3 rounded-lg border border-border bg-card hover:bg-card-hover hover:border-indigo-500/40 text-left transition-all duration-150"
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="flex items-center gap-2 text-xs font-medium text-text-primary group-hover:text-indigo-600">
                      <Icon className="w-3.5 h-3.5 text-indigo-600" />
                      {cmd.title}
                    </span>
                    <span className="text-[10px] text-text-muted bg-card px-1.5 py-0.5 rounded border border-border">
                      {cmd.tag}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary line-clamp-2">
                    {cmd.prompt}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-card text-[11px] text-text-muted">
        <span>
          Press{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-card-hover border border-border font-mono text-text-secondary">
            ESC
          </kbd>{' '}
          to exit
        </span>
        <span className="flex items-center gap-1.5 text-indigo-600">
          <Search className="w-3 h-3" /> Autonomous Agent v1.0 Ready
        </span>
      </div>
    </Modal>
  );
};
