import { caseWhereabouts, isLibraryTest, moveBlockers, showsNeedsFixingBadge, trayCounts } from './exploreRules';

describe('BR-EXPLORE-07 library', () => {
  it('only location "suites" is the library (older data without a location counts as library)', () => {
    expect(isLibraryTest({ location: 'suites' })).toBe(true);
    expect(isLibraryTest({ location: 'tray' })).toBe(false);
    expect(isLibraryTest({ location: 'discarded' })).toBe(false);
    expect(isLibraryTest({} as { location: 'suites' })).toBe(true);
  });
});

describe('BR-EXPLORE-05 Needs fixing badge', () => {
  it('shows for a moved Needs fixing test until its first run', () => {
    expect(showsNeedsFixingBadge({ aiValidationStatus: 'needs_fixing', location: 'suites' }, false)).toBe(true);
    expect(showsNeedsFixingBadge({ aiValidationStatus: 'needs_fixing', location: 'suites' }, true)).toBe(false);
  });
  it('never for Not checked / Checked, or while still in the tray', () => {
    expect(showsNeedsFixingBadge({ aiValidationStatus: 'checked', location: 'suites' }, false)).toBe(false);
    expect(showsNeedsFixingBadge({ aiValidationStatus: 'not_checked', location: 'suites' }, false)).toBe(false);
    expect(showsNeedsFixingBadge({ aiValidationStatus: 'needs_fixing', location: 'tray' }, false)).toBe(false);
    expect(showsNeedsFixingBadge({ location: 'suites' }, false)).toBe(false);
  });
});

describe('BR-EXPLORE-04/05 move blockers', () => {
  it('steps are required; a possible duplicate needs a choice; any status can move', () => {
    expect(moveBlockers({ steps: ['Open it.'] })).toEqual([]);
    expect(moveBlockers({ steps: [' '] })).toEqual(['missing_steps']);
    expect(moveBlockers({ steps: ['a'], duplicateOf: 't-x' })).toEqual(['unresolved_duplicate']);
    expect(moveBlockers({ steps: ['a'], duplicateOf: 't-x', duplicateChoice: 'keep_both' })).toEqual([]);
    expect(moveBlockers({ steps: [], duplicateOf: 't-x' })).toEqual(['missing_steps', 'unresolved_duplicate']);
  });
});

describe('tray counts and where a case is (3.4 / 3.5)', () => {
  it('counts by validation status', () => {
    expect(trayCounts([{ aiValidationStatus: 'checked' }, { aiValidationStatus: 'checked' }, { aiValidationStatus: 'needs_fixing' }])).toEqual({ all: 3, not_checked: 0, checked: 2, needs_fixing: 1 });
  });
  it('In Ready for Suites · <ID> in Suites · Replaced <ID> · Discarded', () => {
    const tests = new Map([['t-cnt-02', { testId: 'CNT-02' }]]);
    expect(caseWhereabouts({ location: 'tray', testId: '' }, tests)).toEqual({ kind: 'tray' });
    expect(caseWhereabouts({ location: 'suites', testId: 'T-03' }, tests)).toEqual({ kind: 'moved', testId: 'T-03' });
    expect(caseWhereabouts({ location: 'discarded', testId: '', locationChange: { by: 'x', at: 'y', replacedTestId: 't-cnt-02' } }, tests)).toEqual({ kind: 'replaced', testId: 'CNT-02', testRef: 't-cnt-02' });
    expect(caseWhereabouts({ location: 'discarded', testId: '' }, tests)).toEqual({ kind: 'discarded' });
  });
});
