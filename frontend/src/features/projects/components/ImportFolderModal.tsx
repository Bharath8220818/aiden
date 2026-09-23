import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderUp,
  FileCode,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useImportProject } from '../hooks/useProjects';
import {
  readFilesAsEntries,
  IMPORT_LIMITS,
  ImportFileEntry,
  ProjectImportResponse,
} from '../services/projectImport.service';

/* ------------------------------------------------------------------ */
/* Import Existing Project Folder modal                                */
/*                                                                     */
/* AIDEN ingests the folder's text artifacts (SQL DDL, DAGs, READMEs,  */
/* dbt models, contracts, incident notes) into project knowledge so    */
/* the workspace can immediately help edit, run, and monitor it.       */
/* ------------------------------------------------------------------ */

interface ImportFolderModalProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
}

export const ImportFolderModal: React.FC<ImportFolderModalProps> = ({
  projectId,
  projectName,
  onClose,
}) => {
  const navigate = useNavigate();
  const importMutation = useImportProject();
  const inputRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<ImportFileEntry[]>([]);
  const [preErrors, setPreErrors] = useState<string[]>([]);
  const [result, setResult] = useState<ProjectImportResponse | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const acceptFiles = async (files: FileList | File[] | null) => {
    if (!files) return;
    const { entries: newEntries, errors } = await readFilesAsEntries(files);
    setEntries((prev) => {
      const seen = new Set(prev.map((e) => e.path));
      return [...prev, ...newEntries.filter((e) => !seen.has(e.path))];
    });
    setPreErrors(errors);
  };

  const runImport = async () => {
    if (!entries.length) return;
    const res = await importMutation.mutateAsync({ projectId, entries });
    setResult(res);
  };

  const summary = result?.summary;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
              <FolderUp className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary">Import existing project</h2>
              <p className="text-[11px] text-text-secondary">
                Into <span className="text-indigo-600">{projectName}</span> — AIDEN learns it, then helps you edit, run, and monitor
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-card-hover transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!result && (
            <>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  void acceptFiles(e.dataTransfer.files);
                }}
                onClick={() => inputRef.current?.click()}
                className={`p-8 rounded-xl border-2 border-dashed text-center cursor-pointer transition-colors ${
                  isDragging ? 'border-indigo-400 bg-indigo-500/10' : 'border-border hover:border-indigo-500/40 bg-card'
                }`}
              >
                <FolderUp className="w-8 h-8 text-indigo-600 mx-auto mb-3" />
                <p className="text-sm font-semibold text-text-primary">Drop your project folder here</p>
                <p className="text-[11px] text-text-secondary mt-1">
                  or click to choose files · {IMPORT_LIMITS.include.join(' ')} · up to {IMPORT_LIMITS.maxFiles} files, 1 MB each
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  // @ts-expect-error non-standard but widely supported directory pick
                  webkitdirectory=""
                  directory=""
                  className="hidden"
                  onChange={(e) => void acceptFiles(e.target.files)}
                />
              </div>

              {preErrors.length > 0 && (
                <div className="space-y-1">
                  {preErrors.slice(0, 4).map((err) => (
                    <p key={err} className="text-[11px] text-amber-600 flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3" /> {err}
                    </p>
                  ))}
                  {preErrors.length > 4 && (
                    <p className="text-[11px] text-text-muted">…and {preErrors.length - 4} more skipped</p>
                  )}
                </div>
              )}

              {entries.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide">
                    {entries.length} file{entries.length !== 1 ? 's' : ''} ready to ingest
                  </p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {entries.map((e) => (
                      <div key={e.path} className="flex items-center gap-2 text-[11px] text-text-secondary bg-card rounded-md px-2.5 py-1.5">
                        {/\.(sql|py)$/.test(e.path) ? (
                          <FileCode className="w-3 h-3 text-emerald-600 shrink-0" />
                        ) : (
                          <FileText className="w-3 h-3 text-sky-600 shrink-0" />
                        )}
                        <span className="truncate font-mono">{e.path}</span>
                        <span className="ml-auto text-text-secondary">{(e.content.length / 1024).toFixed(1)} KB</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {result && summary && (
            <div className="space-y-4" data-testid="import-result">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Ingested', value: summary.ingested, cls: 'text-emerald-600' },
                  { label: 'Skipped', value: summary.skipped, cls: 'text-text-secondary' },
                  { label: 'Failed', value: summary.failed, cls: summary.failed > 0 ? 'text-amber-600' : 'text-text-secondary' },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg bg-card border border-border p-3 text-center">
                    <p className={`text-xl font-bold font-mono ${s.cls}`}>{s.value}</p>
                    <p className="text-[10px] text-text-muted uppercase tracking-wide">{s.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-text-secondary">
                <span className="font-mono text-indigo-600">{summary.totalChunks}</span> knowledge chunks are now part of
                this project's memory — ask AIDEN about any of them in the workspace.
              </p>
              <div className="max-h-44 overflow-y-auto space-y-1.5">
                {result.results.slice(0, 40).map((r) => (
                  <div key={r.path} className="flex items-center gap-2 text-[11px]">
                    {r.status === 'ingested' ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                    ) : r.status === 'skipped' ? (
                      <AlertTriangle className="w-3 h-3 text-text-muted shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                    )}
                    <span className="truncate font-mono text-text-secondary">{r.path}</span>
                    <Badge variant="neutral" size="sm" className="ml-auto shrink-0">
                      {r.status === 'ingested' ? `${r.chunks} chunks` : r.reason ?? r.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
          {result ? (
            <>
              <Button variant="secondary" size="sm" onClick={onClose}>
                Close
              </Button>
              <Button
                size="sm"
                data-testid="goto-workspace"
                leftIcon={<MessageSquare className="w-3.5 h-3.5" />}
                onClick={() => navigate('/workspace')}
              >
                Open in Command Workspace
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                isLoading={importMutation.isPending}
                disabled={entries.length === 0 || importMutation.isPending}
                onClick={() => void runImport()}
                leftIcon={importMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderUp className="w-3.5 h-3.5" />}
              >
                Import {entries.length > 0 ? `${entries.length} files` : ''}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
