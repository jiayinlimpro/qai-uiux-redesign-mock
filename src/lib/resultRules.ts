/**
 * Run results rules (screens/07-results.md, 6.1–6.4): rows, sorting, filters, reason guidance, version line,
 * override, visual flags, bug report. Pure functions; the rule ID is in each comment.
 */
import type { Platform, Browser, CcReason, FailReason, ID, Mode, NotComparedReason, Result, ResultStep, Run, Status, Suite, TestCase, TestData } from '@/data/types';
import { browserLabels, browserShortLabels, modeLabels, reasonLabels } from './labels';
import { compareTestIds } from './suiteRules';
import { formatDate, plural } from './format';

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

/**
 * BR-LIST-03 (D87): the reason options grouped by the status they belong to, so "All" shows a Failed group and a
 * Couldn't complete group instead of one mixed list. null for Passed and Not run (no reasons; the filter is disabled).
 */
export function reasonGroups(status: StatusFilter): { status: 'failed' | 'couldnt_complete'; reasons: Reason[] }[] | null {
  if (status === 'failed') return [{ status: 'failed', reasons: FAIL_REASONS }];
  if (status === 'couldnt_complete') return [{ status: 'couldnt_complete', reasons: CC_REASONS }];
  if (status === 'all') return [{ status: 'failed', reasons: FAIL_REASONS }, { status: 'couldnt_complete', reasons: CC_REASONS }];
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

/**
 * BR-LIST-03 (D87): how many rows each reason option would show, given every other filter (status, mode, search,
 * Worth a look). Computed from the rows, never hard-coded; the current reason choice does not change the counts.
 */
export function reasonCounts(rows: Pick<ResultRow, 'status' | 'reason' | 'mode' | 'displayId' | 'title' | 'worthALook'>[], f: ResultFilterState): Record<Reason, number> {
  const counts = Object.fromEntries([...FAIL_REASONS, ...CC_REASONS].map((r) => [r, 0])) as Record<Reason, number>;
  const others = { ...f, reason: 'all' as const };
  for (const row of rows) if (row.reason && matchesResultFilters(row, others)) counts[row.reason] += 1;
  return counts;
}

/** BR-LIST-03 + BR-LIST-04: the rows shown (filtered, sorted); "Select all shown" selects exactly these. */
export function shownRows<R extends ResultRow>(rows: R[], f: ResultFilterState): R[] {
  return sortResultRows(rows.filter((r) => matchesResultFilters(r, f)));
}

// ---------- reason guidance (BR-REASON-04, 04 · F5) ----------
export const reasonGuidance: Record<Reason, { explanation: string; action: string }> = {
  product_bug: { explanation: 'The platform clearly does not work (an error, crash, missing element or wrong data), or a linked document confirms the expected result.', action: 'Copy the bug report into ClickUp; re-run the test after the fix.' },
  needs_confirmation: { explanation: 'The behaviour looks deliberate and no linked document confirms the expected result.', action: 'Confirm with the BA or PM, then report a bug or edit the test.' },
  test_data_problem: { explanation: 'The account or data the test needs did not work.', action: 'Fix the account in Environments or the test data in Suites, then re-run.' },
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

/**
 * Short browser names for row marks ("Chrome ✓ Safari ✕"), BR-STATUS-03: only when the browsers disagree (D85).
 * When every browser has the same status, the row's status icon already says it.
 */
export function browserMarks(perBrowser: { browser: Browser; status: Status }[]): { label: string; status: Status }[] {
  if (perBrowser.length < 2 || perBrowser.every((b) => b.status === perBrowser[0]!.status)) return [];
  return perBrowser.map((b) => ({ label: browserShortLabels[b.browser], status: b.status }));
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

// ---------- evidence per browser (D86, BR-STATUS-03, BR-RUN-03) ----------
const BROWSER_ORDER: Browser[] = ['chrome', 'firefox', 'webkit'];

/** The browser the result's status comes from: the first, in run order, with the rolled-up status (BR-STATUS-03). */
export function leadBrowser(perBrowser: { browser: Browser; status: Status }[]): Browser | undefined {
  const status = rollUpBrowsers(perBrowser);
  return (perBrowser.find((b) => b.status === status) ?? perBrowser[0])?.browser;
}

export interface BrowserEvidence {
  browser: Browser;
  status: Status;
  /** True for the lead browser: its evidence is the result-level evidence (and the AI verdict describes it). */
  lead: boolean;
  reason?: Reason;
  failure?: Result['failure'];
  /** null: nothing stored for this browser (Not run, or Not recorded when it ran). */
  steps: ResultStep[] | null;
  durationMs?: number;
}

/**
 * D86: one browser's evidence (default: the lead browser). A multi-browser result stores each browser's own steps,
 * failure and reason; the result-level evidence is the lead browser's, so a single-browser result needs nothing more.
 */
export function browserEvidence(result: Pick<Result, 'perBrowser' | 'steps' | 'failure' | 'reason' | 'durationMs'>, browser?: Browser): BrowserEvidence {
  const lead = leadBrowser(result.perBrowser);
  const entry = result.perBrowser.find((b) => b.browser === (browser ?? lead)) ?? result.perBrowser[0];
  const which = entry?.browser ?? browser ?? lead ?? 'chrome';
  const isLead = which === lead || result.perBrowser.length < 2;
  if (entry?.steps) {
    return { browser: which, status: entry.status, lead: isLead, steps: entry.steps, ...(entry.reason ? { reason: entry.reason } : {}), ...(entry.failure ? { failure: entry.failure } : {}), ...(entry.durationMs !== undefined ? { durationMs: entry.durationMs } : {}) };
  }
  if (isLead) {
    return { browser: which, status: entry?.status ?? 'not_run', lead: true, steps: result.steps, ...(result.reason ? { reason: result.reason } : {}), ...(result.failure ? { failure: result.failure } : {}), durationMs: result.durationMs };
  }
  return { browser: which, status: entry?.status ?? 'not_run', lead: false, steps: null };
}

/** Every step of a result in every browser (finding which result a screenshot belongs to). */
export function allBrowserSteps(result: Pick<Result, 'perBrowser' | 'steps'>): ResultStep[] {
  return [...result.steps, ...result.perBrowser.flatMap((b) => b.steps ?? [])];
}

/** Why a browser has no evidence (D86). BR-RUN-03: other browsers replay the script only after the AI run in Chrome passed. */
export function browserNotRunNote(result: Pick<Result, 'mode' | 'perBrowser'>, browser: Browser): string {
  const name = browserLabels[browser];
  const chrome = result.perBrowser.find((b) => b.browser === 'chrome');
  if (result.mode === 'ai' && browser !== 'chrome' && chrome && chrome.status !== 'passed' && chrome.status !== 'not_run') {
    return `Not run in ${name}: the AI run in Chrome ${chrome.status === 'failed' ? 'failed' : "couldn't complete"}, so there was no script to replay.`;
  }
  return `Not run in ${name}.`;
}

/**
 * D86 (Suites › "By browser"): each browser's most recent result of a test, from its history (newest first), in browser
 * order. Empty unless the test has results in more than one browser. The test's status stays its latest result.
 */
export function latestByBrowser<R extends Pick<Result, 'perBrowser'>>(history: R[]): { browser: Browser; status: Status; result: R }[] {
  const seen = new Map<Browser, { browser: Browser; status: Status; result: R }>();
  for (const r of history) for (const b of r.perBrowser) if (!seen.has(b.browser)) seen.set(b.browser, { browser: b.browser, status: b.status, result: r });
  if (seen.size < 2) return [];
  return BROWSER_ORDER.filter((b) => seen.has(b)).map((b) => seen.get(b)!);
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

/**
 * BR-VISUAL-01/02 (D88): why a step's screenshot is not compared, written on the step when the result is created.
 * Only script replays are compared, with the previous replay of the same test, environment, browser and viewport.
 * undefined: the step is compared, or (data rows replayed by script) the engine does not record a reason.
 */
export function notComparedReason(o: { mode: Mode; dataRowsReplayed?: boolean; comparisonOn: boolean; excluded: boolean; hasPrevious: boolean }): NotComparedReason | undefined {
  if (!o.comparisonOn) return 'comparison_off';
  if (o.mode === 'ai' || (o.mode === 'data_rows' && !o.dataRowsReplayed)) return 'ai_run';
  if (o.mode === 'data_rows') return undefined;
  if (o.excluded) return 'test_excluded';
  if (!o.hasPrevious) return 'no_previous';
  return undefined;
}

/** D88: the line the screenshot viewer shows when a step has no comparison. */
export function notComparedText(step: Pick<ResultStep, 'notCompared'>, environmentName: string, browser: Browser): string {
  switch (step.notCompared) {
    case 'ai_run':
      return 'AI runs are not compared. Only script replays are compared with the previous replay.';
    case 'no_previous':
      return `No earlier replay on ${environmentName} · ${browserLabels[browser]} to compare with.`;
    case 'test_excluded':
      return 'Visual check is off for this test.';
    case 'comparison_off':
      return 'Visual comparison was off for this project.';
    default:
      return 'Not compared. Reason not recorded.';
  }
}

/**
 * D88: the visual mark on a step's screenshot (top-right corner). Only what needs attention is marked: open changes
 * ("changed") and changes someone marked Looks fine ("looks_fine"). No change or no comparison → no mark.
 */
export type VisualMark = { kind: 'changed'; areas: number } | { kind: 'looks_fine' } | null;
export function visualMark(step: Pick<ResultStep, 'visual'>): VisualMark {
  const v = step.visual;
  if (!v?.previousScreenshotId || v.changedAreas === 0) return null;
  return v.dismissed ? { kind: 'looks_fine' } : { kind: 'changed', areas: v.changedAreas };
}

/**
 * D89: the result text for a step in Suites › Visual check, where the comparison is the content, so it says more than the
 * mark: "3 areas changed" · "Looks fine · <user> · <date>" · "No change · 3 areas ignored" · "No change" · "No previous run"
 * · "Not run" (the step has no screenshot). Ignored areas come from the comparison (`visual.ignoredAreas`), never from
 * today's ignore areas, which may have been added later.
 */
export function visualResultText(step: Pick<ResultStep, 'visual' | 'screenshotId'>): { text: string; tone: 'cc' | 'passed' | 'neutral' } {
  const v = step.visual;
  if (!step.screenshotId) return { text: 'Not run', tone: 'neutral' };
  if (!v?.previousScreenshotId) return { text: 'No previous run', tone: 'neutral' };
  if (v.changedAreas > 0) return v.dismissed ? { text: `Looks fine · ${v.dismissed.by} · ${formatDate(v.dismissed.at)}`, tone: 'passed' } : { text: `${plural(v.changedAreas, 'area')} changed`, tone: 'cc' };
  return { text: v.ignoredAreas ? `No change · ${plural(v.ignoredAreas, 'area')} ignored` : 'No change', tone: 'passed' };
}

/**
 * "Looks fine" (dismiss) or Undo: the decision is stored with who and when (CLAUDE.md rule 10). `browser` (D86): the
 * browser whose step it is (default: the lead browser); its stored steps change, and the result-level steps when it leads.
 */
export function setVisualDismissed(result: Result, stepIndex: number, dismissed: { by: string; at: string } | null, browser?: Browser): Result {
  const mark = (steps: ResultStep[]) =>
    steps.map((s) => {
      if (s.index !== stepIndex || !s.visual) return s;
      const { dismissed: _d, ...visual } = s.visual;
      return { ...s, visual: dismissed ? { ...visual, dismissed } : visual };
    });
  const lead = leadBrowser(result.perBrowser);
  const which = browser ?? lead;
  const steps = !browser || which === lead || result.perBrowser.length < 2 ? mark(result.steps) : result.steps;
  const perBrowser = result.perBrowser.map((b) => (b.browser === which && b.steps ? { ...b, steps: mark(b.steps) } : b));
  // Flags count every browser's open changes (each browser that ran once; the lead's are the result-level steps).
  const count = visualFlagCount(steps) + perBrowser.filter((b) => b.browser !== lead && b.steps).reduce((n, b) => n + visualFlagCount(b.steps!), 0);
  const { visualChanges: _v, ...flags } = result.flags;
  return { ...result, steps, perBrowser, flags: count > 0 ? { ...flags, visualChanges: count } : flags };
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
  /** env · platform · browser · viewport · run · date */
  environment: string;
  steps: string[];
  expected: string;
  actual: string;
  screenshots: { stepIndex: number; screenshotId: ID }[];
}

/** Bug reports describe platform problems: Failed results only (D63). Visual compare › Mark as bug reports a visual change for any status. */
export const hasBugReport = (r: Pick<Result, 'status'>) => r.status === 'failed';

/** The platform a test uses: the one whose URL (in any environment) has the test's start page host. */
export function platformForStartPage(startPage: string | undefined, platforms: Pick<Platform, 'id' | 'name' | 'urls'>[]): Pick<Platform, 'id' | 'name' | 'urls'> | undefined {
  if (!startPage) return undefined;
  const host = (u: string) => {
    try {
      return new URL(u).host;
    } catch {
      return null;
    }
  };
  const h = host(startPage);
  return h ? platforms.find((a) => Object.values(a.urls).some((u) => u && host(u) === h)) : undefined;
}

/**
 * BR-ACTION-03: generated per result — title, environment (env · platform · browser · viewport · run · date), steps to
 * reproduce in plain language (up to the failing step), expected, actual, screenshots. `visualStep` → a report of
 * a visual change at that step (6.2 Mark as bug).
 */
export function buildBugReportFor(opts: {
  result: Result;
  test: { testId: string; title: string; expectedResult?: string } ;
  platformName?: string;
  run: Pick<Run, 'number' | 'environment' | 'viewport' | 'startedAt'>;
  visualStep?: { index: number; previousRunNumber?: number };
  /** D86: whose evidence the report describes (default: the lead browser, the one the status comes from). */
  browser?: Browser;
}): BugReport {
  const { test, run } = opts;
  const ev = browserEvidence(opts.result, opts.browser);
  const result = { ...opts.result, steps: ev.steps ?? opts.result.steps, failure: ev.failure, reason: ev.reason };
  const failing = opts.visualStep?.index ?? result.failure?.stepIndex ?? [...result.steps].reverse().find((s) => s.status !== 'not_run')?.index ?? result.steps.length;
  const upTo = result.steps.filter((s) => s.index <= failing);
  const step = result.steps.find((s) => s.index === failing);
  const browser = ev.browser;
  const environment = [run.environment.name, opts.platformName, `${browserLabels[browser]} ${run.viewport.width}×${run.viewport.height}`, `Run #${run.number}, ${formatDate(run.startedAt)}`]
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
