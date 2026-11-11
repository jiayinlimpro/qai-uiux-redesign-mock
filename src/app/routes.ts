/**
 * Every route path in QAI (docs/03-navigation.md), in one place (D26).
 * - `paths`: patterns for the router.
 * - `to`: builders for links. Always build links with `to.*`, never write a path as a string.
 * The router serves these after `#` (hash addresses); switching to normal addresses only changes router.tsx.
 */
import type { ID } from '@/data/types';

export const paths = {
  welcome: '/welcome', // 1.1
  projects: '/projects', // 1.2
  newProject: '/projects/new', // 1.3
  globalSettings: '/settings', // 2.3
  overview: '/p/:projectId', // 1.4
  projectSettings: '/p/:projectId/settings', // 2.2
  environments: '/p/:projectId/environments', // 2.4 (D72)
  knowledge: '/p/:projectId/knowledge', // 2.1
  suites: '/p/:projectId/suites', // 3.1
  suiteTest: '/p/:projectId/suites/:testId', // 3.1 with a test selected (?tab=)
  importTests: '/p/:projectId/suites/import', // 3.3
  newTest: '/p/:projectId/tests/new', // 3.2
  editTest: '/p/:projectId/tests/:testId/edit', // 3.2 (?from=resultId)
  explore: '/p/:projectId/explore', // 3.4
  exploreChat: '/p/:projectId/explore/:chatId', // 3.4 (?message=)
  runs: '/p/:projectId/runs', // 5.4
  run: '/p/:projectId/runs/:runId', // 5.2 / 5.3 / 6.1 by run state (?result=)
} as const;

/** Test detail tabs (screens/04-suites.md): Definition · Test data · Visual check · History. */
export type TestTab = 'definition' | 'test-data' | 'visual-check' | 'history';

const seg = encodeURIComponent;
const p = (projectId: ID) => `/p/${seg(projectId)}`;
const query = (params: Record<string, string | number | undefined>): string => {
  const entries = Object.entries(params).filter((e): e is [string, string | number] => e[1] !== undefined);
  return entries.length ? `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString()}` : '';
};

export const to = {
  welcome: () => paths.welcome,
  projects: () => paths.projects,
  newProject: () => paths.newProject,
  globalSettings: () => paths.globalSettings,
  overview: (projectId: ID) => p(projectId),
  projectSettings: (projectId: ID) => `${p(projectId)}/settings`,
  environments: (projectId: ID) => `${p(projectId)}/environments`,
  knowledge: (projectId: ID) => `${p(projectId)}/knowledge`,
  suites: (projectId: ID) => `${p(projectId)}/suites`,
  suiteTest: (projectId: ID, testId: ID, tab?: TestTab) => `${p(projectId)}/suites/${seg(testId)}${query({ tab })}`,
  importTests: (projectId: ID) => `${p(projectId)}/suites/import`,
  newTest: (projectId: ID) => `${p(projectId)}/tests/new`,
  /** `fromResultId`: opened from a run result → shows "Opened from Run #N result" and "Save and re-run" (3.2). */
  editTest: (projectId: ID, testId: ID, fromResultId?: ID) => `${p(projectId)}/tests/${seg(testId)}/edit${query({ from: fromResultId })}`,
  explore: (projectId: ID) => `${p(projectId)}/explore`,
  /** `messageIndex` scrolls to a message, e.g. the cases card of an AI case (Open in chat, View in AI explore; BR-EXPLORE-05). */
  exploreChat: (projectId: ID, chatId: ID, messageIndex?: number) =>
    `${p(projectId)}/explore/${seg(chatId)}${query({ message: messageIndex })}`,
  runs: (projectId: ID) => `${p(projectId)}/runs`,
  run: (projectId: ID, runId: ID, resultId?: ID) => `${p(projectId)}/runs/${seg(runId)}${query({ result: resultId })}`,
};
