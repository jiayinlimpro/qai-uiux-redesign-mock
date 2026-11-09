import { createContext, useContext, useEffect } from 'react';
import type { Project } from '@/data/types';

/**
 * The project shell (and the AI explore workspace) load the project once and provide it to every screen below,
 * including nested child routes (test detail, Import dialog).
 */
export const ProjectContext = createContext<Project | null>(null);

export function useProject(): Project {
  const project = useContext(ProjectContext);
  if (!project) throw new Error('useProject must be used inside a project shell');
  return project;
}

/** Re-reads the project after a screen changed it (Knowledge grid, Project settings), so the shell and screens update. */
export const ProjectReloadContext = createContext<() => Promise<Project | void>>(async () => {});

export function useReloadProject(): () => Promise<Project | void> {
  return useContext(ProjectReloadContext);
}

/** Lets a screen add the last breadcrumb item when it depends on data, e.g. "Run #12". */
export const ItemCrumbContext = createContext<(label: string | undefined) => void>(() => {});

export function useItemCrumb(label: string | undefined): void {
  const setLabel = useContext(ItemCrumbContext);
  useEffect(() => {
    setLabel(label);
    return () => setLabel(undefined);
  }, [label, setLabel]);
}
