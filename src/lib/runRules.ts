import type { EnvironmentSnapshot, ID, Mode, Project, TestCase } from '@/data/types';

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
 * BR-ENV-04: a run stores a snapshot of its environment (name + every app's URL in it) when it starts,
 * so history shows what was used even after the environment is renamed or deleted, or a URL changes.
 */
export function snapshotEnvironment(project: Pick<Project, 'environments' | 'apps'>, environmentId: ID): EnvironmentSnapshot {
  const env = project.environments.find((e) => e.id === environmentId);
  if (!env) throw new Error(`Environment not found: ${environmentId}`);
  return { name: env.name, apps: project.apps.map((a) => ({ appId: a.id, name: a.name, url: a.urls[environmentId] ?? null })) };
}
