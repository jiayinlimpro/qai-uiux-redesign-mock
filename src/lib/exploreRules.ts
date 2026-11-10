/**
 * AI explore and Ready for Suites rules (BR-EXPLORE-03…09, D65). Pure functions; the rule ID is in each comment.
 */
import type { ID, TestCase } from '@/data/types';

export type ValidationStatus = NonNullable<TestCase['aiValidationStatus']>;
export const VALIDATION_STATUSES: ValidationStatus[] = ['not_checked', 'checked', 'needs_fixing'];

// BR-EXPLORE-07: the library is the tests in Suites (location 'suites'). AI cases in the tray or discarded are not part of it.
// Data saved before D65 has no location: it was all library.
export function isLibraryTest(t: Pick<TestCase, 'location'>): boolean {
  return (t.location ?? 'suites') === 'suites';
}

/** BR-EXPLORE-05: tooltip of the "Needs fixing" badge. */
export const NEEDS_FIXING_TIP = 'AI explore could not make this test pass (the fix failed or the site looks broken). Not yet confirmed by a run.';

// BR-EXPLORE-05: a moved Needs fixing case shows a "Needs fixing" badge until its first real run.
// It has no status of its own (Not run) and never counts as failed.
export function showsNeedsFixingBadge(test: Pick<TestCase, 'aiValidationStatus' | 'location'>, hasRunResult: boolean): boolean {
  return test.aiValidationStatus === 'needs_fixing' && isLibraryTest(test) && !hasRunResult;
}

export type MoveBlocker = 'missing_steps' | 'unresolved_duplicate';
export const moveBlockerLabels: Record<MoveBlocker, string> = {
  missing_steps: 'Missing: steps',
  unresolved_duplicate: 'Possible duplicate: choose Keep both, Replace existing or Discard',
};

// BR-EXPLORE-04/05: any validation status can move, but a case needs test steps and a resolved duplicate choice.
export function moveBlockers(c: Pick<TestCase, 'steps' | 'duplicateOf' | 'duplicateChoice'>): MoveBlocker[] {
  const out: MoveBlocker[] = [];
  if (!c.steps.some((s) => s.trim())) out.push('missing_steps');
  if (c.duplicateOf && !c.duplicateChoice) out.push('unresolved_duplicate');
  return out;
}

/** Tray filter counts: All · Not checked · Checked · Needs fixing (3.5). */
export function trayCounts(cases: Pick<TestCase, 'aiValidationStatus'>[]): Record<ValidationStatus | 'all', number> {
  const counts = { all: cases.length, not_checked: 0, checked: 0, needs_fixing: 0 };
  for (const c of cases) counts[c.aiValidationStatus ?? 'not_checked']++;
  return counts;
}

/**
 * Where a case is now, for the chat's cases card (3.4): In Ready for Suites · "<ID> in Suites" · "Replaced <ID>" · Discarded.
 * `testsById` gives the current display ID of a replaced test.
 */
export function caseWhereabouts(
  c: Pick<TestCase, 'location' | 'testId' | 'locationChange'>,
  testsById: Map<ID, Pick<TestCase, 'testId'>>,
): { kind: 'tray' } | { kind: 'moved'; testId: string } | { kind: 'replaced'; testId: string; testRef: ID } | { kind: 'discarded' } {
  const replaced = c.locationChange?.replacedTestId;
  if (replaced) return { kind: 'replaced', testId: testsById.get(replaced)?.testId ?? 'a deleted test', testRef: replaced };
  if (c.location === 'tray') return { kind: 'tray' };
  if (c.location === 'discarded') return { kind: 'discarded' };
  return { kind: 'moved', testId: c.testId };
}

/** Fields an AI case carries, like an imported test (BR-EXPLORE-03); "Replace existing" copies these onto the existing test. */
export const AI_CASE_FIELDS = ['title', 'preconditions', 'steps', 'expectedResult', 'expectedKeywords', 'startPage', 'browserPreference'] as const;

/** BR-EXPLORE-08: the small fields edited inline in the tray (steps and preconditions change through the chat). */
export const TRAY_INLINE_FIELDS = ['title', 'expectedResult', 'expectedKeywords', 'startPage', 'browserPreference'] as const;
