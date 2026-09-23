import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchProjects,
  fetchProject,
  createProject,
  updateProject,
  deleteProject,
} from '../services/project.service';
import {
  importProjectFiles,
  ImportFileEntry,
  ProjectImportResponse,
} from '../services/projectImport.service';
import { ProjectCreate, ProjectUpdate } from '../types';

/* ------------------------------------------------------------------ */
/* Query keys                                                          */
/* ------------------------------------------------------------------ */

export const PROJECTS_KEY = ['projects'] as const;
export const projectKey = (id: string) => ['projects', id] as const;

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */

/** List all accessible projects (optionally scoped to a workspace). */
export function useProjectsList(workspaceId?: string) {
  return useQuery({
    queryKey: [...PROJECTS_KEY, workspaceId] as const,
    queryFn: () => fetchProjects(workspaceId),
    staleTime: 30_000,
  });
}

/** Single project by ID. */
export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: projectKey(projectId ?? ''),
    queryFn: () => fetchProject(projectId!),
    enabled: Boolean(projectId),
    staleTime: 30_000,
  });
}

/** Create a new project. */
export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProjectCreate) => createProject(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROJECTS_KEY });
    },
  });
}

/** Update an existing project. */
export function useUpdateProject(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProjectUpdate) => updateProject(projectId, payload),
    onSuccess: (updated) => {
      qc.setQueryData(projectKey(projectId), updated);
      qc.invalidateQueries({ queryKey: PROJECTS_KEY });
    },
  });
}

/** Delete a project. */
export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => deleteProject(projectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROJECTS_KEY });
    },
  });
}

/** Import an existing project folder's text files into project knowledge. */
export function useImportProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      entries,
    }: {
      projectId: string;
      entries: ImportFileEntry[];
    }) => importProjectFiles(projectId, entries),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROJECTS_KEY });
    },
  });
}

export type { ImportFileEntry, ProjectImportResponse };
