/**
 * 1.4 Project overview rules (screens/02-project.md). Pure functions over library tests (BR-EXPLORE-07): every
 * count is computed (CLAUDE.md rule 5).
 */
import type { ID, Result, Run, Status, Suite, TestCase } from '@/data/types';
import { countByStatus, countRunStatuses, type StatusCounts } from './status';
import { NOT_IN_A_SUITE } from './resultRules';

/** BR-RUN-10: the run the banner offers to resume: the newest Interrupted or Paused run (a stopped run cannot resume, D55). */
export function runToResume(runs: Run[]): Run | undefined {
  return [...runs].sort((a, b) => b.number - a.number).find((r) => (r.state === 'interrupted' || r.state === 'paused') && !r.stoppedAt);
}

/** Banner text: "Run #13 was interrupted at test 34 of 83 · All tests · UAT" (or "is paused at …"). */
export function resumeBannerText(run: Pick<Run, 'number' | 'state' | 'progress' | 'scopeLabel' | 'environment'>): string {
  const verb = run.state === 'paused' ? 'is paused' : 'was interrupted';
  return `Run #${run.number} ${verb} at test ${run.progress.done} of ${run.progress.total} · ${run.scopeLabel} · ${run.environment.name}`;
}

export const pauseReasonText: Record<NonNullable<Run['pauseReason']>, string> = {
  app_closed: 'stopped when the app closed',
  provider_unavailable: 'paused: the AI provider stayed unavailable',
  environment_unresponsive: 'paused: the environment stopped responding',
  preflight_blocked: 'paused: the pre-flight check blocked it',
};

/** "Last completed run" card: the newest Completed run (a stopped run is Completed too, D55). */
export function lastCompletedRun(runs: Run[]): Run | undefined {
  return [...runs].sort((a, b) => b.number - a.number).find((r) => r.state === 'completed');
}

/** "Needs attention" card: failed + couldn't complete in that run, and its Worth a look count [PROPOSAL]. */
export function needsAttention(run: Pick<Run, 'testIds'>, results: Pick<Result, 'testId' | 'status' | 'flags'>[]): { count: number; worthALook: number; counts: StatusCounts } {
  const counts = countRunStatuses(run.testIds, results);
  return { count: counts.failed + counts.couldnt_complete, worthALook: results.filter((r) => r.flags.worthALook).length, counts };
}

/** "New from AI explore" card: library tests not in a suite (hidden when 0). */
export const notInASuiteCount = (tests: Pick<TestCase, 'suiteId'>[]) => tests.filter((t) => t.suiteId === null).length;

export interface SuiteRow {
  suite: Suite | null; // null = Not in a suite
  name: string;
  testIds: ID[];
  counts: StatusCounts;
  lastRun?: Run;
}

/**
 * Suites table: one row per suite (alphabetical, BR-LIST-01) and Not in a suite last when it has tests; latest status
 * counts (never run = Not run, BR-STATUS-01); last run = the newest run that ran any of its tests.
 */
export function suiteRows(suites: Suite[], tests: TestCase[], latest: Record<ID, Pick<Result, 'status' | 'runId'>>, runs: Run[]): SuiteRow[] {
  const byNumber = new Map(runs.map((r) => [r.id, r]));
  const row = (suite: Suite | null): SuiteRow => {
    const own = tests.filter((t) => t.suiteId === (suite?.id ?? null));
    const statuses: { status: Status }[] = own.map((t) => ({ status: latest[t.id]?.status ?? 'not_run' }));
    const lastRun = own
      .map((t) => latest[t.id] && byNumber.get(latest[t.id]!.runId))
      .filter((r): r is Run => Boolean(r))
      .sort((a, b) => b.number - a.number)[0];
    return { suite, name: suite?.name ?? NOT_IN_A_SUITE, testIds: own.map((t) => t.id), counts: countByStatus(statuses), ...(lastRun ? { lastRun } : {}) };
  };
  const rows = [...suites].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })).map(row);
  const loose = row(null);
  return loose.testIds.length ? [...rows, loose] : rows;
}

/** Recent runs table: the newest runs first. */
export const recentRuns = (runs: Run[], n = 3) => [...runs].sort((a, b) => b.number - a.number).slice(0, n);
