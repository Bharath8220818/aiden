import { api } from '@/services/api';

/* ------------------------------------------------------------------ */
/* Project import — bring an existing project folder into AIDEN        */
/* ------------------------------------------------------------------ */

export interface ImportFileEntry {
  /** Relative path as shown to the user (e.g. "sql/ddl.sql"). */
  path: string;
  /** File contents (text formats only). */
  content: string;
}

export interface ImportFileResult {
  path: string;
  status: 'ingested' | 'skipped' | 'failed';
  reason?: string;
  chunks?: number;
  vectors?: number;
  mode?: string;
}

export interface ProjectImportResponse {
  projectId: string;
  summary: {
    filesReceived: number;
    ingested: number;
    skipped: number;
    failed: number;
    totalChunks: number;
  };
  results: ImportFileResult[];
}

/**
 * POST /projects/{id}/import — send a folder's text files to the backend,
 * where each runs through the real RAG ingestion pipeline and becomes
 * project-scoped knowledge the workspace can retrieve.
 */
export async function importProjectFiles(
  projectId: string,
  files: ImportFileEntry[]
): Promise<ProjectImportResponse> {
  return api.post<ProjectImportResponse>(`/projects/${projectId}/import`, files);
}

/** Read selected File objects (text) into import entries, enforcing limits. */
export const IMPORT_LIMITS = {
  maxFiles: 200,
  maxFileBytes: 1_000_000,
  /** Extensions the backend RAG loader understands. */
  include: ['.sql', '.py', '.md', '.markdown', '.txt', '.yaml', '.yml', '.json', '.csv', '.html', '.htm'],
} as const;

export async function readFilesAsEntries(fileList: FileList | File[]): Promise<{
  entries: ImportFileEntry[];
  errors: string[];
}> {
  const files = Array.from(fileList);
  const errors: string[] = [];
  if (files.length > IMPORT_LIMITS.maxFiles) {
    errors.push(`Too many files selected (${files.length}); the limit is ${IMPORT_LIMITS.maxFiles}.`);
    return { entries: [], errors };
  }
  const entries: ImportFileEntry[] = [];
  for (const file of files) {
    const path = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
    const lower = path.toLowerCase();
    if (IMPORT_LIMITS.include.some((ext) => lower.endsWith(ext))) {
      if (file.size > IMPORT_LIMITS.maxFileBytes) {
        errors.push(`${path}: larger than 1 MB, skipped`);
        continue;
      }
      try {
        entries.push({ path, content: await file.text() });
      } catch {
        errors.push(`${path}: could not be read`);
      }
    } else {
      errors.push(`${path}: unsupported type, skipped`);
    }
  }
  return { entries, errors };
}
