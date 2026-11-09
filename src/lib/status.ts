import type { ID, Result, Status } from '@/data/types';

export type StatusCounts = Record<Status, number>;

export const STATUSES: readonly Status[] = ['passed', 'failed', 'couldnt_complete', 'not_run'];

function emptyCounts(): StatusCounts {
  return { passed: 0, failed: 0, couldnt_complete: 0, not_run: 0 };
}

// BR-STATUS-01, BR-STATUS-05: count results by effective status (Result.status already reflects any override).
export function countByStatus(results: Pick<Result, 'status'>[]): StatusCounts {
  const counts = emptyCounts();
  for (const r of results) counts[r.status]++;
  return counts;
}

// BR-STATUS-01: in a run, a test in the frozen list with no result yet is Not run.
export function countRunStatuses(runTestIds: ID[], results: Pick<Result, 'testId' | 'status'>[]): StatusCounts {
  const byTest = new Map(results.map((r) => [r.testId, r.status]));
  const counts = emptyCounts();
  for (const id of runTestIds) counts[byTest.get(id) ?? 'not_run']++;
  return counts;
}

// BR-STATUS-01: a test's latest status is the status of its result in the highest-numbered run.
// A test that has never run is Not run, never blank.
export function latestStatus(results: { status: Status; runNumber: number }[]): Status {
  let latest: { status: Status; runNumber: number } | undefined;
  for (const r of results) if (!latest || r.runNumber > latest.runNumber) latest = r;
  return latest?.status ?? 'not_run';
}

// BR-STATUS-02: pass rate = passed / (passed + failed). Null when there is nothing to rate.
export function passRate(counts: Pick<StatusCounts, 'passed' | 'failed'>): number | null {
  const rated = counts.passed + counts.failed;
  return rated === 0 ? null : counts.passed / rated;
}

/** Sum money without floating-point drift (USD, 2 decimals). BR-RUN-05 */
export function sumCost(values: number[]): number {
  return Math.round(values.reduce((acc, v) => acc + Math.round(v * 100), 0)) / 100;
}
