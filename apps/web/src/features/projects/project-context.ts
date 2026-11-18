import type { ProjectDetail, TaskStatus } from '@teamflow/shared';
import { createContext, useContext } from 'react';

/** Kontext detailu projektu – sdílí načtený projekt s vnořenými stránkami. */
export interface ProjectContextValue {
  project: ProjectDetail;
  canEdit: boolean;
  readOnly: boolean;
  openCreateTask: (status?: TaskStatus) => void;
}

export const ProjectContext = createContext<ProjectContextValue | null>(null);

export function useProjectContext(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProjectContext musí být použit uvnitř ProjectLayout');
  return ctx;
}
