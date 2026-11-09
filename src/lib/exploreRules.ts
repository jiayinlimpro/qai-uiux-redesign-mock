import type { TestCase } from '@/data/types';

// BR-EXPLORE-05: a test proposed as Likely bug shows a "Likely bug" badge until its first real run.
// It has no status of its own (Not run) and never counts as failed.
export function showsLikelyBugBadge(test: Pick<TestCase, 'aiExploreFinding'>, hasRunResult: boolean): boolean {
  return test.aiExploreFinding?.kind === 'likely_bug' && !hasRunResult;
}
