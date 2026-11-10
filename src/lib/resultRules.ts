/**
 * Run results rules (screens/07-results.md, 6.1–6.4): rows, sorting, filters, reason guidance, version line,
 * override, visual flags, bug report. Pure functions; the rule ID is in each comment.
 */
import type { App, Browser, CcReason, FailReason, ID, Mode, Result, ResultStep, Run, Status, Suite, TestCase, TestData } from '@/data/types';
import { browserLabels, modeLabels, reasonLabels } from './labels';
import { compareTestIds } from './suiteRules';
import { formatDate } from './format';

export type Reason = FailReason | CcReason;

// ---------- rows (BR-STATUS-01, D55) ----------
export interface ResultRow {
  /** Result id, or `not-run:<testId>` for a test of the run with no result (stopped before it, D55). */
  key: string;
  testId: ID;
  result: Result | null;
  status: Status;
  displayId: string;
  title: string;
  deleted: boolean;
  reason?: Reason;
  mode?: Mode;
  suiteName: string;
  cost: number | null;
  worthALook?: string;
  knownIssue: boolean;
  overridden: boolean;
  note?: string;
}

export const NOT_IN_A_SUITE = 'Not in a suite';
export const notRunKey = (testId: ID) => `not-run:${testId}`;

/**
 * BR-STATUS-01 / D55: one row per test in the run's frozen list. A test with no result (the run was stopped before it)
 * is Not run. Names follow BR-TEST-06 / D46 (current ID + title; the snapshot once the test is deleted).
 */
export function buildResultRows(
  run: Pick<Run, 'testIds' | 'stoppedAt'>,
  results: Result[],
  tests: Pick<TestCase, 'id' | 'testId' | 'title' | 'suiteId' | 'knownIssue'>[],
  suites: Pick<Suite, 'id' | 'name'>[],
): ResultRow[] {
  const byTest = new Map(results.map((r) => [r.testId, r]));
  const testsById = new Map(tests.map((t) => [t.id, t]));
  const suiteName = (t: { suiteId: ID | null } | undefined) => (t?.suiteId ? (suites.find((s) => s.id === t.suiteId)?.name ?? NOT_IN_A_SUITE) : NOT_IN_A_SUITE);
  return run.testIds.map((testId) => {
    const r = byTest.get(testId) ?? null;
    const t = testsById.get(testId);
    const name = t ? { displayId: t.testId, title: t.title, deleted: false } : r ? { displayId: r.testSnapshot.testId, title: r.testSnapshot.title, deleted: true } : { displayId: '(deleted test)', title: '', deleted: true };
    return {
      key: r?.id ?? notRunKey(testId),
      testId,
      result: r,
      status: r?.status ?? 'not_run',
      ...name,
      ...(r?.reason ? { reason: r.reason } : {}),
      ...(r ? { mode: r.mode } : {}),
      suiteName: t ? suiteName(t) : '',
      cost: r ? r.cost : null,
      ...(r?.flags.worthALook ? { worthALook: r.flags.worthALook } : {}),
      knownIssue: Boolean(t?.knownIssue),
      overridden: Boolean(r?.overrides?.length),
      ...(r?.note ? { note: r.note } : !r && run.stoppedAt ? { note: 'The run was stopped before this test' } : {}),
    };
  });
}

// ---------- sorting and filters (BR-LIST-03 / BR-LIST-04) ----------
const STATUS_ORDER: Record<Status, number> = { failed: 0, couldnt_complete: 1, passed: 2, not_run: 3 };

// BR-LIST-03: flat list sorted Failed → Couldn't complete → Passed → Not run, then by ID.
export function sortResultRows<R extends Pick<ResultRow, 'status' | 'displayId'>>(rows: R[]): R[] {
  return [...rows].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || compareTestIds(a.displayId, b.displayId));
}

export const FAIL_REASONS: FailReason[] = ['product_bug', 'needs_confirmation', 'test_data_problem', 'test_case_unclear', 'blocked']; // BR-REASON-01
export const CC_REASONS: CcReason[] = ['environment_down', 'service_problem', 'ai_couldnt_finish']; // BR-REASON-02

export type StatusFilter = Status | 'all';

// BR-LIST-03: reason options depend on the status: failed reasons for Failed, couldn't-complete reasons for
// Couldn't complete, all for All; hidden (null) for Passed and Not run.
export function reasonOptions(status: StatusFilter): Reason[] | null {
  if (status === 'failed') return FAIL_REASONS;
  if (status === 'couldnt_complete') return CC_REASONS;
  if (status === 'all') return [...FAIL_REASONS, ...CC_REASONS];
  return null;
}

export interface ResultFilterState {
  status: StatusFilter;
  reason: Reason | 'all';
  mode: Mode | 'all';
  search: string;
  worthALook: boolean;
}
export const NO_RESULT_FILTERS: ResultFilterState = { status: 'all', reason: 'all', mode: 'all', search: '', worthALook: false };

export function hasActiveResultFilters(f: ResultFilterState): boolean {
  return f.status !== 'all' || f.reason !== 'all' || f.mode !== 'all' || f.search.trim() !== '' || f.worthALook;
}

/** BR-LIST-03: a status change drops a reason that is no longer offered. */
export function withStatus(f: ResultFilterState, status: StatusFilter): ResultFilterState {
  const options = reasonOptions(status);
  return { ...f, status, reason: f.reason !== 'all' && options?.includes(f.reason) ? f.reason : 'all' };
}

// BR-LIST-03: status (summary buttons), reason, mode (AI / Script / Data rows), search (ID / title), Worth a look [PROPOSAL].
export function matchesResultFilters(row: Pick<ResultRow, 'status' | 'reason' | 'mode' | 'displayId' | 'title' | 'worthALook'>, f: ResultFilterState): boolean {
  if (f.status !== 'all' && row.status !== f.status) return false;
  if (f.reason !== 'all' && row.reason !== f.reason) return false;
  if (f.mode !== 'all' && row.mode !== f.mode) return false;
  if (f.worthALook && !row.worthALook) return false;
  const q = f.search.trim().toLowerCase();
  return !q || row.displayId.toLowerCase().includes(q) || row.title.toLowerCase().includes(q);
}

/** BR-LIST-03 + BR-LIST-04: the rows shown (filtered, sorted); "Select all shown" selects exactly these. */
export function shownRows<R extends ResultRow>(rows: R[], f: ResultFilterState): R[] {
  return sortResultRows(rows.filter((r) => matchesResultFilters(r, f)));
}

// ---------- reason guidance (BR-REASON-04, 04 · F5) ----------
export const reasonGuidance: Record<Reason, { explanation: string; action: string }> = {
  product_bug: { explanation: 'The app clearly does not work (an error, crash, missing element or wrong data), or a linked document confirms the expected result.', action: 'Copy the bug report into ClickUp; re-run the test after the fix.' },
  needs_confirmation: { explanation: 'The behaviour looks deliberate and no linked document confirms the expected result.', action: 'Confirm with the BA or PM, then report a bug or edit the test.' },
  test_data_problem: { explanation: 'The account or data the test needs did not work.', action: 'Fix the account or data in Knowledge, then re-run.' },
  test_case_unclear: { explanation: 'The steps or the expected result can be read more than one way.', action: 'Edit the test (Save and re-run).' },
  blocked: { explanation: 'An earlier failure stopped this test from reaching its checks.', action: 'Fix the root failure first, then re-run the group.' },
  environment_down: { explanation: 'The site did not respond.', action: 'Check the site, then re-run.' },
  service_problem: { explanation: 'QAI or the AI provider failed (for example the key or credits).', action: 'Fix the key or credits in Global settings, then resume or re-run.' },
  ai_couldnt_finish: { explanation: 'The AI ran out of steps or could not reach a verdict.', action: 'Filter this reason, select all shown and use Re-run with model….' },
};

/** "Failed at step 2 of 3: <step>" for the failure summary card; null when there is no failure evidence. */
export function failureHeadline(result: Pick<Result, 'aiVerdict' | 'failure' | 'steps'>): string | null {
  if (!result.failure || (result.aiVerdict.status !== 'failed' && result.aiVerdict.status !== 'couldnt_complete')) return null;
  const step = result.steps.find((s) => s.index === result.failure!.stepIndex);
  const verb = result.aiVerdict.status === 'failed' ? 'Failed' : "Couldn't complete";
  return `${verb} at step ${result.failure.stepIndex} of ${result.steps.length}${step ? `: ${step.text}` : ''}`;
}

/** The step to expand by default: the failed (or couldn't-complete) step (07-results 6.1). */
export function defaultExpandedStep(steps: Pick<ResultStep, 'index' | 'status'>[]): number | null {
  return steps.find((s) => s.status === 'failed' || s.status === 'couldnt_complete')?.index ?? null;
}

// ---------- versions (BR-VERSION-02) ----------
export function versionLine(testVersion: number, currentVersion: number | null): string {
  if (currentVersion === null) return `Ran on test v${testVersion}`;
  return testVersion === currentVersion ? `Ran on test v${testVersion} (current)` : `Ran on test v${testVersion} (old) · now v${currentVersion}`;
}

// ---------- browsers and data rows (BR-STATUS-03 / BR-STATUS-04) ----------
// BR-STATUS-03: failed if any browser failed; else couldn't complete if any; else passed if all passed; else not run.
export function rollUpBrowsers(perBrowser: { status: Status }[]): Status {
  if (perBrowser.some((b) => b.status === 'failed')) return 'failed';
  if (perBrowser.some((b) => b.status === 'couldnt_complete')) return 'couldnt_complete';
  if (perBrowser.length > 0 && perBrowser.every((b) => b.status === 'passed')) return 'passed';
  return 'not_run';
}

/** Short browser names for row marks ("Chrome ✓ Safari ✕"): only for multi-browser results. */
export function browserMarks(perBrowser: { browser: Browser; status: Status }[]): { label: string; status: Status }[] {
  if (perBrowser.length < 2) return [];
  return perBrowser.map((b) => ({ label: b.browser === 'webkit' ? 'Safari' : browserLabels[b.browser], status: b.status }));
}

// BR-STATUS-04 / BR-DATA-04: Row · varied field/value · Expected · Result. Rows removed from the test since keep their result.
export function dataRowsBreakdown(
  dataRows: NonNullable<Result['dataRows']>,
  testData: TestData | undefined,
): { rowId: ID; index: number | null; varied: string; expected: string; status: Status }[] {
  return dataRows.map((d) => {
    const row = testData?.rows.find((r) => r.id === d.rowId);
    if (!row) return { rowId: d.rowId, index: null, varied: 'Row no longer in the test', expected: '', status: d.status };
    const field = row.index === 1 ? null : row.variedField;
    return {
      rowId: d.rowId,
      index: row.index,
      varied: row.index === 1 ? 'Recorded row' : field ? `${field} = “${row.values[field] ?? ''}”` : 'Several fields',
      expected: row.expected === 'accepted' ? 'Accepted' : 'Rejected',
      status: d.status,
    };
  });
}

// ---------- override (BR-ACTION-01 / BR-STATUS-05) ----------
/** Single result only; a Not run result has no verdict to override. */
export const canOverride = (r: Pick<Result, 'aiVerdict'>) => r.aiVerdict.status !== 'not_run';

export function validateOverride(input: { reason: string; proofName: string }): { reason?: string; proof?: string } {
  return {
    ...(input.reason.trim() ? {} : { reason: 'Enter the reason.' }),
    ...(input.proofName.trim() ? {} : { proof: 'Add a proof file.' }),
  };
}

export type ResultOverride = NonNullable<Result['overrides']>[number];

/** The override that applies: the newest one (D62). */
export const latestOverride = (r: Pick<Result, 'overrides'>): ResultOverride | undefined => r.overrides?.[r.overrides.length - 1];

/**
 * BR-STATUS-05: the override replaces the status used in all counts; the AI verdict is kept. Every override is kept as
 * history (oldest first) and the newest applies (D62, CLAUDE.md rule 10). A failed override keeps the AI's failure reason
 * when the AI also said Failed (BR-REASON-03: reasons are set by the system, never typed).
 */
export function applyOverride(result: Result, input: { status: 'passed' | 'failed'; reason: string; proofName: string }, by: string, at: string): Result {
  const { reason: _r, ...rest } = result;
  const keepReason = input.status === 'failed' && result.aiVerdict.status === 'failed' ? result.aiVerdict.reason : undefined;
  return {
    ...rest,
    status: input.status,
    ...(keepReason ? { reason: keepReason } : {}),
    overrides: [...(result.overrides ?? []), { status: input.status, reason: input.reason.trim(), proofName: input.proofName.trim(), by, at }],
  };
}

// ---------- visual flags (BR-VISUAL-03, D59) ----------
/** Changed areas still flagged: steps with a comparison, changes, and no "Looks fine". */
export function visualFlagCount(steps: Pick<ResultStep, 'visual'>[]): number {
  return steps.reduce((n, s) => n + (s.visual && !s.visual.dismissed ? s.visual.changedAreas : 0), 0);
}

/** Steps that have a comparison with a previous run (Previous step / Next step in 6.2 move between these). */
export function comparedSteps<S extends Pick<ResultStep, 'index' | 'visual'>>(steps: S[]): S[] {
  return steps.filter((s) => s.visual?.previousScreenshotId);
}

/** "Looks fine" (dismiss) or Undo: the decision is stored with who and when (CLAUDE.md rule 10). */
export function setVisualDismissed(result: Result, stepIndex: number, dismissed: { by: string; at: string } | null): Result {
  const steps = result.steps.map((s) => {
    if (s.index !== stepIndex || !s.visual) return s;
    const { dismissed: _d, ...visual } = s.visual;
    return { ...s, visual: dismissed ? { ...visual, dismissed } : visual };
  });
  const count = visualFlagCount(steps);
  const { visualChanges: _v, ...flags } = result.flags;
  return { ...result, steps, flags: count > 0 ? { ...flags, visualChanges: count } : flags };
}

// ---------- ignore areas (BR-VISUAL-04, D45) ----------
export type Rect = { x: number; y: number; width: number; height: number };
export const MIN_AREA = 0.02;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** A rectangle from two corners, as a share of the screenshot (0–1), at least MIN_AREA in each direction. */
export function rectFromCorners(a: { x: number; y: number }, b: { x: number; y: number }): Rect {
  const x1 = clamp01(Math.min(a.x, b.x));
  const y1 = clamp01(Math.min(a.y, b.y));
  const x2 = clamp01(Math.max(a.x, b.x));
  const y2 = clamp01(Math.max(a.y, b.y));
  return clampRect({ x: x1, y: y1, width: Math.max(MIN_AREA, x2 - x1), height: Math.max(MIN_AREA, y2 - y1) });
}

/** Keep a rectangle inside the screenshot (keyboard move / resize). */
export function clampRect(r: Rect): Rect {
  const width = Math.min(1, Math.max(MIN_AREA, r.width));
  const height = Math.min(1, Math.max(MIN_AREA, r.height));
  return { x: Math.min(1 - width, clamp01(r.x)), y: Math.min(1 - height, clamp01(r.y)), width, height };
}

// ---------- bug report (BR-ACTION-03) ----------
export interface BugReport {
  resultId: ID;
  title: string;
  /** env · app · browser · viewport · run · date */
  environment: string;
  steps: string[];
  expected: string;
  actual: string;
  screenshots: { stepIndex: number; screenshotId: ID }[];
}

/** Bug reports describe app problems: Failed results only (D63). Visual compare › Mark as bug reports a visual change for any status. */
export const hasBugReport = (r: Pick<Result, 'status'>) => r.status === 'failed';

/** The app a test uses: the one whose URL (in any environment) has the test's start page host. */
export function appForStartPage(startPage: string | undefined, apps: Pick<App, 'id' | 'name' | 'urls'>[]): Pick<App, 'id' | 'name' | 'urls'> | undefined {
  if (!startPage) return undefined;
  const host = (u: string) => {
    try {
      return new URL(u).host;
    } catch {
      return null;
    }
  };
  const h = host(startPage);
  return h ? apps.find((a) => Object.values(a.urls).some((u) => u && host(u) === h)) : undefined;
}

/**
 * BR-ACTION-03: generated per result — title, environment (env · app · browser · viewport · run · date), steps to
 * reproduce in plain language (up to the failing step), expected, actual, screenshots. `visualStep` → a report of
 * a visual change at that step (6.2 Mark as bug).
 */
export function buildBugReportFor(opts: {
  result: Result;
  test: { testId: string; title: string; expectedResult?: string } ;
  appName?: string;
  run: Pick<Run, 'number' | 'environment' | 'viewport' | 'startedAt'>;
  visualStep?: { index: number; previousRunNumber?: number };
}): BugReport {
  const { result, test, run } = opts;
  const failing = opts.visualStep?.index ?? result.failure?.stepIndex ?? [...result.steps].reverse().find((s) => s.status !== 'not_run')?.index ?? result.steps.length;
  const upTo = result.steps.filter((s) => s.index <= failing);
  const step = result.steps.find((s) => s.index === failing);
  const browser = result.perBrowser.find((b) => b.status === result.status)?.browser ?? result.perBrowser[0]?.browser ?? 'chrome';
  const environment = [run.environment.name, opts.appName, `${browserLabels[browser]} ${run.viewport.width}×${run.viewport.height}`, `Run #${run.number}, ${formatDate(run.startedAt)}`]
    .filter(Boolean)
    .join(' · ');
  if (opts.visualStep) {
    const areas = step?.visual?.changedAreas ?? 0;
    return {
      resultId: result.id,
      title: `${test.title}: the page looks different at step ${failing}`,
      environment,
      steps: upTo.map((s) => s.text),
      expected: `The page looks as it did in ${opts.visualStep.previousRunNumber ? `Run #${opts.visualStep.previousRunNumber}` : 'the previous run'}.`,
      actual: `${areas} ${areas === 1 ? 'area' : 'areas'} changed at step ${failing}${step ? ` (${step.text.replace(/\.$/, '')})` : ''}.`,
      screenshots: upTo.filter((s) => s.screenshotId && s.index === failing).map((s) => ({ stepIndex: s.index, screenshotId: s.screenshotId! })),
    };
  }
  return {
    resultId: result.id,
    title: result.failure ? `${test.title}: ${result.failure.found}` : `${test.title}: ${result.reason ? reasonLabels[result.reason] : 'does not behave as expected'}`,
    environment,
    steps: upTo.map((s) => s.text),
    expected: result.failure?.expected ?? test.expectedResult ?? '',
    actual: result.failure?.found ?? result.note ?? '',
    screenshots: upTo.filter((s) => s.screenshotId).map((s) => ({ stepIndex: s.index, screenshotId: s.screenshotId! })),
  };
}

/** Copy report: formatted text for a ClickUp task. Several reports are separated by a line. */
export function formatBugReport(r: Pick<BugReport, 'title' | 'environment' | 'steps' | 'expected' | 'actual' | 'screenshots'>): string {
  return [
    r.title,
    '',
    `Environment: ${r.environment}`,
    '',
    'Steps to reproduce:',
    ...r.steps.map((s, i) => `${i + 1}. ${s}`),
    '',
    `Expected: ${r.expected}`,
    `Actual: ${r.actual}`,
    ...(r.screenshots.length ? ['', `Screenshots: ${r.screenshots.map((s) => `step ${s.stepIndex}`).join(', ')}`] : []),
  ].join('\n');
}

export function formatBugReports(reports: Parameters<typeof formatBugReport>[0][]): string {
  return reports.map(formatBugReport).join('\n\n----------\n\n');
}

/** Second line of a row: "<reason> · <mode> · <suite>" (07-results 6.1). */
export function rowDetails(row: Pick<ResultRow, 'reason' | 'mode' | 'suiteName' | 'overridden' | 'note'>): string {
  return [row.overridden ? 'Overridden' : row.reason ? reasonLabels[row.reason] : null, row.mode ? modeLabels[row.mode] : null, row.suiteName || null, row.note ?? null]
    .filter(Boolean)
    .join(' · ');
}
