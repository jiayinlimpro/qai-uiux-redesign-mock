import { describe, expect, it } from 'vitest';
import type { Result, ResultStep } from '@/data/types';
import {
  applyOverride,
  latestOverride,
  platformForStartPage,
  browserMarks,
  buildBugReportFor,
  buildResultRows,
  canOverride,
  clampRect,
  comparedSteps,
  dataRowsBreakdown,
  defaultExpandedStep,
  failureHeadline,
  formatBugReport,
  hasBugReport,
  NO_RESULT_FILTERS,
  reasonOptions,
  rectFromCorners,
  rollUpBrowsers,
  rowDetails,
  setVisualDismissed,
  shownRows,
  sortResultRows,
  validateOverride,
  versionLine,
  visualFlagCount,
  withStatus,
} from './resultRules';

const step = (index: number, status: ResultStep['status'], extra: Partial<ResultStep> = {}): ResultStep => ({ index, text: `Step ${index} text.`, status, durationMs: 1000, actions: [], ...extra });
const result = (over: Partial<Result> = {}): Result => ({
  id: 'r1',
  runId: 'run-12',
  testId: 't-cnt-04',
  testVersion: 2,
  mode: 'ai',
  testSnapshot: { testId: 'CNT-04', title: 'Contact phone and email links' },
  status: 'failed',
  reason: 'needs_confirmation',
  aiVerdict: { status: 'failed', reason: 'needs_confirmation', confidence: 'medium' },
  perBrowser: [{ browser: 'chrome', status: 'failed' }],
  failure: { stepIndex: 2, expected: 'tel: link', found: 'https://wa.link/mgz96d' },
  steps: [step(1, 'passed', { screenshotId: 's1' }), step(2, 'failed', { screenshotId: 's2' }), step(3, 'not_run')],
  cost: 0.07,
  durationMs: 174_000,
  flags: {},
  ...over,
});

describe('rows (BR-STATUS-01, D55, D46)', () => {
  const tests = [
    { id: 'a', testId: 'CNT-02', title: 'B', suiteId: 's1' },
    { id: 'b', testId: 'CNT-01', title: 'A', suiteId: 's1', knownIssue: { markedAt: 'x' } },
    { id: 'c', testId: 'T-01', title: 'C', suiteId: null },
  ];
  const suites = [{ id: 's1', name: '09 Contact Us' }];
  it('one row per test in the run; no result → Not run, with the stop note', () => {
    const rows = buildResultRows({ testIds: ['a', 'b', 'c'], stoppedAt: { done: 1, total: 3, at: 'x' } }, [result({ id: 'ra', testId: 'a' })], tests, suites);
    expect(rows.map((r) => [r.displayId, r.status, r.suiteName])).toEqual([
      ['CNT-02', 'failed', '09 Contact Us'],
      ['CNT-01', 'not_run', '09 Contact Us'],
      ['T-01', 'not_run', 'Not in a suite'],
    ]);
    expect(rows[1]!.note).toBe('The run was stopped before this test');
    expect(rows[1]!.knownIssue).toBe(true);
    expect(rows[1]!.cost).toBeNull();
  });
  it('a deleted test shows its snapshot', () => {
    const [row] = buildResultRows({ testIds: ['gone'] }, [result({ testId: 'gone' })], tests, suites);
    expect(row).toMatchObject({ displayId: 'CNT-04', title: 'Contact phone and email links', deleted: true });
  });
  it('second line: reason · mode · suite (Overridden replaces the reason)', () => {
    expect(rowDetails({ reason: 'product_bug', mode: 'ai', suiteName: '04 About Us', overridden: false })).toBe('Product bug · AI · 04 About Us');
    expect(rowDetails({ reason: 'product_bug', mode: 'script', suiteName: 'X', overridden: true })).toBe('Overridden · Script · X');
  });
});

describe('sorting and filters (BR-LIST-03 / BR-LIST-04)', () => {
  const row = (displayId: string, status: Result['status'], extra: object = {}) => ({ key: displayId, testId: displayId, result: null, displayId, title: displayId, deleted: false, suiteName: '', cost: 0, knownIssue: false, overridden: false, status, ...extra });
  const rows = [row('PRT-02', 'passed'), row('ABT-03', 'failed', { reason: 'product_bug', mode: 'ai' }), row('NAV-01', 'not_run'), row('GEN-02', 'couldnt_complete', { reason: 'ai_couldnt_finish', mode: 'ai', worthALook: 'Low confidence verdict' }), row('ABT-10', 'failed', { reason: 'blocked', mode: 'script' }), row('ABT-2', 'failed', { mode: 'script', reason: 'blocked' })];
  it('Failed → Couldn’t complete → Passed → Not run, then by ID (numeric)', () => {
    expect(sortResultRows(rows).map((r) => r.displayId)).toEqual(['ABT-2', 'ABT-03', 'ABT-10', 'GEN-02', 'PRT-02', 'NAV-01']);
  });
  it('reason options follow the status; hidden for Passed and Not run', () => {
    expect(reasonOptions('failed')).toEqual(['product_bug', 'needs_confirmation', 'test_data_problem', 'test_case_unclear', 'blocked']);
    expect(reasonOptions('couldnt_complete')).toEqual(['environment_down', 'service_problem', 'ai_couldnt_finish']);
    expect(reasonOptions('all')).toHaveLength(8);
    expect(reasonOptions('passed')).toBeNull();
    expect(reasonOptions('not_run')).toBeNull();
  });
  it('changing the status drops a reason that is no longer offered', () => {
    const f = { ...NO_RESULT_FILTERS, status: 'failed' as const, reason: 'blocked' as const };
    expect(withStatus(f, 'all').reason).toBe('blocked');
    expect(withStatus(f, 'couldnt_complete').reason).toBe('all');
  });
  it('filters by status, reason, mode, search and Worth a look; shown = filtered + sorted', () => {
    expect(shownRows(rows, { ...NO_RESULT_FILTERS, status: 'failed', mode: 'script' }).map((r) => r.displayId)).toEqual(['ABT-2', 'ABT-10']);
    expect(shownRows(rows, { ...NO_RESULT_FILTERS, reason: 'product_bug' }).map((r) => r.displayId)).toEqual(['ABT-03']);
    expect(shownRows(rows, { ...NO_RESULT_FILTERS, search: 'abt' })).toHaveLength(3);
    expect(shownRows(rows, { ...NO_RESULT_FILTERS, worthALook: true }).map((r) => r.displayId)).toEqual(['GEN-02']);
  });
});

describe('result detail', () => {
  it('failure headline uses the AI verdict and the failing step (BR-REASON-04 card)', () => {
    expect(failureHeadline(result())).toBe('Failed at step 2 of 3: Step 2 text.');
    expect(failureHeadline(result({ aiVerdict: { status: 'couldnt_complete', confidence: 'low' } }))).toMatch(/^Couldn't complete at step 2 of 3/);
    expect(failureHeadline(result({ failure: undefined }))).toBeNull();
  });
  it('the failed step is expanded by default', () => {
    expect(defaultExpandedStep(result().steps)).toBe(2);
    expect(defaultExpandedStep([step(1, 'passed')])).toBeNull();
  });
  it('version line (BR-VERSION-02)', () => {
    expect(versionLine(2, 2)).toBe('Ran on test v2 (current)');
    expect(versionLine(1, 3)).toBe('Ran on test v1 (old) · now v3');
    expect(versionLine(2, null)).toBe('Ran on test v2');
  });
  it('browser roll-up and marks (BR-STATUS-03)', () => {
    expect(rollUpBrowsers([{ status: 'passed' }, { status: 'failed' }])).toBe('failed');
    expect(rollUpBrowsers([{ status: 'passed' }, { status: 'couldnt_complete' }])).toBe('couldnt_complete');
    expect(rollUpBrowsers([{ status: 'passed' }, { status: 'passed' }])).toBe('passed');
    expect(rollUpBrowsers([{ status: 'passed' }, { status: 'not_run' }])).toBe('not_run');
    expect(browserMarks([{ browser: 'chrome', status: 'passed' }])).toEqual([]);
    expect(browserMarks([{ browser: 'chrome', status: 'passed' }, { browser: 'webkit', status: 'failed' }])).toEqual([
      { label: 'Chrome', status: 'passed' },
      { label: 'Safari', status: 'failed' },
    ]);
  });
  it('data rows breakdown (BR-STATUS-04)', () => {
    const testData = {
      fields: [{ name: 'email', type: 'text' as const }],
      rows: [
        { id: 'r1', index: 1, values: { email: 'a@b.c' }, expected: 'accepted' as const, use: true, generated: false },
        { id: 'r2', index: 2, values: { email: 'bad' }, expected: 'rejected' as const, use: true, generated: false, variedField: 'email' },
      ],
    };
    expect(dataRowsBreakdown([{ rowId: 'r1', status: 'passed' }, { rowId: 'r2', status: 'failed' }, { rowId: 'gone', status: 'passed' }], testData)).toEqual([
      { rowId: 'r1', index: 1, varied: 'Recorded row', expected: 'Accepted', status: 'passed' },
      { rowId: 'r2', index: 2, varied: 'email = “bad”', expected: 'Rejected', status: 'failed' },
      { rowId: 'gone', index: null, varied: 'Row no longer in the test', expected: '', status: 'passed' },
    ]);
  });
});

describe('override (BR-ACTION-01 / BR-STATUS-05)', () => {
  it('needs a reason and a proof file', () => {
    expect(validateOverride({ reason: ' ', proofName: '' })).toEqual({ reason: 'Enter the reason.', proof: 'Add a proof file.' });
    expect(validateOverride({ reason: 'PM confirmed', proofName: 'x.png' })).toEqual({});
  });
  it('replaces the status, keeps the AI verdict, stores who and when', () => {
    const r = applyOverride(result(), { status: 'passed', reason: ' PM confirmed ', proofName: 'x.png' }, 'Jia Yin', '2026-11-10T10:00:00Z');
    expect(r.status).toBe('passed');
    expect(r.reason).toBeUndefined();
    expect(r.aiVerdict).toEqual(result().aiVerdict);
    expect(r.overrides).toEqual([{ status: 'passed', reason: 'PM confirmed', proofName: 'x.png', by: 'Jia Yin', at: '2026-11-10T10:00:00Z' }]);
  });
  it('keeps every override as history; the newest applies (D62)', () => {
    const first = applyOverride(result(), { status: 'passed', reason: 'a', proofName: 'x.png' }, 'Jia Yin', 't1');
    const second = applyOverride(first, { status: 'failed', reason: 'b', proofName: 'y.png' }, 'Sam', 't2');
    expect(second.overrides!.map((o) => [o.status, o.by])).toEqual([['passed', 'Jia Yin'], ['failed', 'Sam']]);
    expect(latestOverride(second)?.reason).toBe('b');
    expect(second.status).toBe('failed');
    expect(latestOverride(result())).toBeUndefined();
  });
  it('a failed override keeps the AI reason only when the AI also said Failed (BR-REASON-03)', () => {
    expect(applyOverride(result(), { status: 'failed', reason: 'x', proofName: 'y' }, 'u', 't').reason).toBe('needs_confirmation');
    const cc = result({ status: 'couldnt_complete', reason: 'environment_down', aiVerdict: { status: 'couldnt_complete', reason: 'environment_down', confidence: 'high' } });
    expect(applyOverride(cc, { status: 'failed', reason: 'x', proofName: 'y' }, 'u', 't').reason).toBeUndefined();
  });
  it('a Not run result cannot be overridden', () => {
    expect(canOverride(result({ aiVerdict: { status: 'not_run', confidence: 'high' } }))).toBe(false);
    expect(canOverride(result())).toBe(true);
  });
});

describe('visual flags (BR-VISUAL-03, D59)', () => {
  const visualResult = () =>
    result({
      status: 'passed',
      mode: 'script',
      steps: [step(1, 'passed', { visual: { previousScreenshotId: 'p1', changedAreas: 0 } }), step(2, 'passed', { visual: { previousScreenshotId: 'p2', changedAreas: 3 } }), step(3, 'passed')],
      flags: { visualChanges: 3 },
    });
  it('counts changed areas that are not dismissed', () => {
    expect(visualFlagCount(visualResult().steps)).toBe(3);
    expect(comparedSteps(visualResult().steps).map((s) => s.index)).toEqual([1, 2]);
  });
  it('Looks fine keeps the change with who and when; the flag count leaves it out; Undo restores it', () => {
    const dismissed = setVisualDismissed(visualResult(), 2, { by: 'Jia Yin', at: 't' });
    expect(dismissed.steps[1]!.visual).toEqual({ previousScreenshotId: 'p2', changedAreas: 3, dismissed: { by: 'Jia Yin', at: 't' } });
    expect(dismissed.flags.visualChanges).toBeUndefined();
    const undone = setVisualDismissed(dismissed, 2, null);
    expect(undone.steps[1]!.visual).toEqual({ previousScreenshotId: 'p2', changedAreas: 3 });
    expect(undone.flags.visualChanges).toBe(3);
  });
});

describe('ignore area drawing (BR-VISUAL-04, D45)', () => {
  it('a rectangle from two corners, as a share of the screenshot, kept inside', () => {
    expect(rectFromCorners({ x: 0.5, y: 0.6 }, { x: 0.1, y: 0.2 })).toEqual({ x: 0.1, y: 0.2, width: 0.4, height: 0.39999999999999997 });
    expect(rectFromCorners({ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 })).toEqual({ x: 0.5, y: 0.5, width: 0.02, height: 0.02 });
    expect(clampRect({ x: 0.9, y: -0.1, width: 0.3, height: 0.2 })).toEqual({ x: 0.7, y: 0, width: 0.3, height: 0.2 });
  });
});

describe('bug report (BR-ACTION-03)', () => {
  const run = { number: 12, environment: { name: 'UAT', platforms: [] }, viewport: { width: 1920, height: 1080 }, startedAt: '2026-11-03T08:30:00.000Z' };
  it('only Failed results have one (D63)', () => {
    expect(hasBugReport({ status: 'failed' })).toBe(true);
    expect(hasBugReport({ status: 'couldnt_complete' })).toBe(false);
    expect(hasBugReport({ status: 'passed' })).toBe(false);
  });
  it('finds the platform by the start page host in any environment', () => {
    const platforms = [{ id: 'a', name: 'Customer website', urls: { uat: 'https://uat.qcfixer.com', prod: 'https://www.qcfixer.com' } }];
    expect(platformForStartPage('https://www.qcfixer.com/', platforms)?.name).toBe('Customer website');
    expect(platformForStartPage('https://other.test/', platforms)).toBeUndefined();
    expect(platformForStartPage(undefined, platforms)).toBeUndefined();
  });
  it('title, environment, steps up to the failing step, expected, actual, screenshots', () => {
    const r = buildBugReportFor({ result: result(), test: { testId: 'CNT-04', title: 'Contact phone and email links' }, platformName: 'Customer website', run });
    expect(r).toMatchObject({
      title: 'Contact phone and email links: https://wa.link/mgz96d',
      environment: 'UAT · Customer website · Chrome 1920×1080 · Run #12, 3 Nov 2026',
      steps: ['Step 1 text.', 'Step 2 text.'],
      expected: 'tel: link',
      actual: 'https://wa.link/mgz96d',
      screenshots: [{ stepIndex: 1, screenshotId: 's1' }, { stepIndex: 2, screenshotId: 's2' }],
    });
    expect(formatBugReport(r)).toBe(
      'Contact phone and email links: https://wa.link/mgz96d\n\nEnvironment: UAT · Customer website · Chrome 1920×1080 · Run #12, 3 Nov 2026\n\nSteps to reproduce:\n1. Step 1 text.\n2. Step 2 text.\n\nExpected: tel: link\nActual: https://wa.link/mgz96d\n\nScreenshots: step 1, step 2',
    );
  });
  it('a visual change report (6.2 Mark as bug)', () => {
    const res = result({ status: 'passed', failure: undefined, steps: [step(1, 'passed', { screenshotId: 's1' }), step(2, 'passed', { screenshotId: 's2', visual: { previousScreenshotId: 'p', changedAreas: 3 } })] });
    const r = buildBugReportFor({ result: res, test: { testId: 'NAV-01', title: 'Homepage loads' }, run, visualStep: { index: 2, previousRunNumber: 9 } });
    expect(r.expected).toBe('The page looks as it did in Run #9.');
    expect(r.actual).toBe('3 areas changed at step 2 (Step 2 text).');
    expect(r.screenshots).toEqual([{ stepIndex: 2, screenshotId: 's2' }]);
  });
});
