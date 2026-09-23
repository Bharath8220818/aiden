import React, { useState } from 'react';
import { GeneratedFile, CodeTarget } from '../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { Sparkles, Code2, FileCode, Check, Copy, Download } from 'lucide-react';

export interface GeneratedCodePanelProps {
  files: GeneratedFile[];
  activeFile: GeneratedFile | null;
  activeTarget: CodeTarget;
  onSelectTarget: (target: CodeTarget) => void;
  isGenerating: boolean;
}

const LANGUAGE_LABEL: Record<string, string> = {
  python: 'Python',
  sql: 'SQL',
  yaml: 'YAML',
  markdown: 'Markdown',
};

export const GeneratedCodePanel: React.FC<GeneratedCodePanelProps> = ({
  files,
  activeFile,
  activeTarget,
  onSelectTarget,
  isGenerating,
}) => {
  const [copied, setCopied] = useState(false);

  const tabs = files.map((f) => ({
    id: f.target,
    label: f.target === 'airflow_dag' ? 'Airflow DAG' : f.target === 'kafka_config' ? 'Kafka Config' : f.target === 'pyspark' ? 'PySpark' : f.target === 'tests' ? 'Tests' : 'SQL',
    badge: f.lineCount,
  }));

  const handleCopy = () => {
    if (!activeFile) return;
    navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!activeFile) return;
    const blob = new Blob([activeFile.content], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', activeFile.fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  if (isGenerating) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-8 flex flex-col items-center justify-center space-y-3">
          <Sparkles className="w-6 h-6 text-indigo-600 animate-pulse" />
          <p className="text-sm font-medium text-text-primary">AIDEN Codegen Agent is writing your pipeline…</p>
          <p className="text-xs text-text-secondary">Generating PySpark, SQL MERGE, Airflow DAG, Kafka config, and unit tests</p>
          <div className="w-full max-w-md space-y-2 mt-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-2.5 rounded bg-card-hover animate-pulse" style={{ width: `${90 - i * 15}%` }} />
            ))}
          </div>
          <span className="text-[10px] text-text-muted font-mono mt-2">codegen.agent.aiden — 5 artifacts queued</span>
        </CardContent>
      </Card>
    );
  }

  if (!activeFile) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-2">
          <div className="p-3 rounded-full bg-card-hover border border-border text-text-muted">
            <Code2 className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-text-primary">No code generated yet</p>
          <p className="text-xs text-text-secondary max-w-sm">
            Configure the pipeline settings, then run “Generate Pipeline Code” — AIDEN produces production-grade PySpark, SQL, Airflow, Kafka, and test artifacts.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-purple-500/20 text-purple-600">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold uppercase tracking-wider">Generated Artifacts</CardTitle>
              <CardDescription>
                {activeFile.fileName} · {LANGUAGE_LABEL[activeFile.language]} · {activeFile.lineCount} lines
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={handleCopy} leftIcon={copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />} className="text-xs">
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button size="sm" variant="outline" onClick={handleDownload} leftIcon={<Download className="w-3.5 h-3.5" />} className="text-xs">
              Download
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* File tabs */}
      <div className="px-4 pt-2.5 bg-card border-b border-border">
        <Tabs tabs={tabs} activeTab={activeTarget} onChange={(id) => onSelectTarget(id as CodeTarget)} />
      </div>

      <CardContent className="p-0">
        <div className="relative max-h-[480px] overflow-auto">
          <pre className="text-[11px] leading-relaxed font-mono p-4 selection:bg-indigo-500/40">
            {activeFile.content.split('\n').map((line, idx) => (
              <div key={idx} className="flex">
                <span className="select-none text-text-muted w-10 shrink-0 text-right pr-3">{idx + 1}</span>
                <span className="text-text-secondary whitespace-pre-wrap break-all">{line || ' '}</span>
              </div>
            ))}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
};
