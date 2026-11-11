import type { EnvironmentSnapshot, ID, KnowledgeItem, Mode, Project, TestCase } from '@/data/types';

export interface ModeInput {
  scriptState: TestCase['script']['state'];
  hasTestData: boolean;
}

// BR-RUN-02: valid script and Force AI off → Script replay; otherwise → AI run.
// Glossary "Data rows": a test with test data runs once per row (row 1 by AI if no script, others replayed),
// and its mode label is "Data rows".
export function modeFor(test: ModeInput, forceAi: boolean): Mode {
  if (test.hasTestData) return 'data_rows';
  return test.scriptState === 'recorded' && !forceAi ? 'script' : 'ai';
}

/**
 * Knowledge a run gives the AI for one test (glossary "Knowledge item": scope project / suite / test; D58 Result.knowledgeUsed):
 * documents in scope or linked to the test, and skills in scope or linked whose "Used by" includes Runs.
 */
export function knowledgeForRun<K extends Pick<KnowledgeItem, 'id' | 'kind' | 'scope' | 'usedBy'>>(
  test: Pick<TestCase, 'id' | 'suiteId' | 'linkedKnowledge'>,
  knowledge: K[],
): K[] {
  const inScope = (k: K) =>
    k.scope.kind === 'project' || (k.scope.kind === 'suite' && k.scope.suiteId === test.suiteId) || (k.scope.kind === 'test' && k.scope.testId === test.id);
  return knowledge.filter((k) => (inScope(k) || test.linkedKnowledge.includes(k.id)) && (k.kind === 'document' || (k.usedBy ?? []).includes('runs')));
}

/**
 * BR-ENV-04: a run stores a snapshot of its environment (name + every platform's URL in it) when it starts,
 * so history shows what was used even after the environment is renamed or deleted, or a URL changes.
 */
export function snapshotEnvironment(project: Pick<Project, 'environments' | 'platforms'>, environmentId: ID): EnvironmentSnapshot {
  const env = project.environments.find((e) => e.id === environmentId);
  if (!env) throw new Error(`Environment not found: ${environmentId}`);
  return { name: env.name, platforms: project.platforms.map((a) => ({ platformId: a.id, name: a.name, url: a.urls[environmentId] ?? null })) };
}
