import React from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { useSqlWorkspace } from '@/features/sql/hooks/useSqlWorkspace';
import { SqlEditor } from '@/features/sql/components/SqlEditor';
import { SchemaExplorer } from '@/features/sql/components/SchemaExplorer';
import { ResultsPanel } from '@/features/sql/components/ResultsPanel';
import { AiAssistantPanel } from '@/features/sql/components/AiAssistantPanel';
import { cn } from '@/lib/utils';
import {
  Terminal,
  Play,
  Square,
  History,
  Database,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
} from 'lucide-react';

export const SQLPage: React.FC = () => {
  const {
    databases,
    activeDatabase,
    setActiveDatabaseId,
    isLoadingCatalog,
    sql,
    setSql,
    result,
    isRunning,
    runSeconds,
    runQuery,
    cancelQuery,
    logs,
    plan,
    isPlanLoading,
    loadPlan,
    suggestions,
    isSuggestionsLoading,
    loadSuggestions,
    applySuggestionSql,
    chatMessages,
    isChatLoading,
    askAiden,
    insertSqlFromChat,
  } = useSqlWorkspace();

  const [explorerOpen, setExplorerOpen] = React.useState(true);
  const [assistantOpen, setAssistantOpen] = React.useState(true);

  const dbOptions = databases.map((d) => ({ value: d.id, label: d.name }));

  return (
    <PageContainer
      title="SQL Workspace"
      description="Multi-warehouse query workbench — Monaco editor, schema explorer, execution plans, and the AIDEN SQL assistant"
      fullWidth
      breadcrumbs={[
        { label: 'AIDEN' },
        { label: 'Studio' },
        { label: 'SQL Workspace' },
      ]}
      actions={
        <div className="flex items-center gap-2">
          <Select
            value={activeDatabase?.id ?? ''}
            onChange={(e) => setActiveDatabaseId(e.target.value)}
            options={dbOptions}
            className="text-xs w-56"
            disabled={isLoadingCatalog}
          />
          <Button
            variant="primary"
            size="sm"
            onClick={runQuery}
            isLoading={isRunning}
            leftIcon={<Play className="w-3.5 h-3.5" />}
            className="text-xs"
          >
            Execute
          </Button>
        </div>
      }
    >
      {/* Workspace layout */}
      <div className="flex flex-col border border-border rounded-lg overflow-hidden bg-card h-[calc(100vh-230px)] min-h-[560px]">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 py-2 bg-card border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExplorerOpen((v) => !v)}
              className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-card-active transition-colors"
              title={explorerOpen ? 'Hide explorer' : 'Show explorer'}
            >
              {explorerOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>
            <Terminal className="w-4 h-4 text-indigo-600" />
            <span className="text-[11px] font-mono text-text-secondary">
              {activeDatabase ? activeDatabase.name : 'Loading catalog…'}
            </span>
            {activeDatabase && (
              <Badge
                variant={activeDatabase.status === 'connected' ? 'success' : 'warning'}
                size="sm"
                dot
              >
                {activeDatabase.status}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" leftIcon={<History className="w-3.5 h-3.5" />} className="text-xs hidden sm:inline-flex" onClick={() => setSql(STARTER_RESET)}>
              Reset
            </Button>
            {isRunning ? (
              <Button variant="danger" size="sm" onClick={cancelQuery} leftIcon={<Square className="w-3.5 h-3.5" />} className="text-xs">
                Cancel
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={runQuery}
                leftIcon={<Play className="w-3.5 h-3.5" />}
                className="text-xs"
              >
                Run <span className="hidden md:inline font-mono text-[9px] opacity-70 ml-1">Ctrl+↵</span>
              </Button>
            )}
            <button
              onClick={() => setAssistantOpen((v) => !v)}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                assistantOpen ? 'text-indigo-600 bg-indigo-500/10' : 'text-text-muted hover:text-text-primary hover:bg-card-active'
              )}
              title={assistantOpen ? 'Hide assistant' : 'Show assistant'}
            >
              <Sparkles className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main three-pane area */}
        <div className="flex flex-1 min-h-0">
          {/* Explorer */}
          {explorerOpen && (
            <div className="w-60 shrink-0 border-r border-border bg-card hidden md:block">
              <SchemaExplorer
                databases={databases}
                activeDatabaseId={activeDatabase?.id ?? null}
                onSelectDatabase={setActiveDatabaseId}
                onInsertTableName={(qualified) => insertSqlFromChat(`SELECT * FROM ${qualified} LIMIT 100;`)}
              />
            </div>
          )}

          {/* Editor + results */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="h-[45%] min-h-[180px] border-b border-border">
              <SqlEditor value={sql} onChange={setSql} onRun={runQuery} />
            </div>
            <div className="flex-1 min-h-0">
              <ResultsPanel
                result={result}
                plan={plan}
                isPlanLoading={isPlanLoading}
                logs={logs}
                onLoadPlan={loadPlan}
                isRunning={isRunning}
                runSeconds={runSeconds}
              />
            </div>
          </div>

          {/* AI assistant */}
          {assistantOpen && (
            <div className="w-72 shrink-0 border-l border-border bg-card hidden lg:block">
              <AiAssistantPanel
                messages={chatMessages}
                suggestions={suggestions}
                isChatLoading={isChatLoading}
                isSuggestionsLoading={isSuggestionsLoading}
                onLoadSuggestions={loadSuggestions}
                onAsk={askAiden}
                onApplySql={applySuggestionSql}
              />
            </div>
          )}
        </div>
      </div>

      {/* Mobile hints for hidden panes */}
      <div className="flex items-center gap-3 text-[10px] text-text-muted md:hidden lg:hidden">
        <Database className="w-3 h-3" />
        Schema explorer (md+) and AI assistant (lg+) are hidden on small screens.
      </div>
    </PageContainer>
  );
};

const STARTER_RESET = `SELECT 1;`;

export default SQLPage;
