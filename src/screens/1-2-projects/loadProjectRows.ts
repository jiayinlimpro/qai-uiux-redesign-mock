import { listProjects, listResults, listRuns, listSuites } from '@/data/api';
import type { Project, Run } from '@/data/types';
import { lastCompletedRun, lastRun, needsAttention, type NeedsAttention } from '@/lib/projectRules';

export interface ProjectRow {
  project: Project;
  suiteCount: number;
  lastRun?: Run;
  needsAttention: NeedsAttention;
}

/** One row per project for the Projects table (1.2). All counts computed from the data (CLAUDE.md rule 5). */
export async function loadProjectRows(): Promise<ProjectRow[]> {
  const projects = await listProjects();
  return Promise.all(
    projects.map(async (project) => {
      const [suites, runs] = await Promise.all([listSuites(project.id), listRuns(project.id)]);
      const completed = lastCompletedRun(runs);
      const results = completed ? await listResults(completed.id) : [];
      return { project, suiteCount: suites.length, lastRun: lastRun(runs), needsAttention: needsAttention(completed, results) };
    }),
  );
}
