/**
 * Run dialog rules (screens/06-runs.md 5.1): how each test will run (BR-RUN-02/03), where it replays (D53),
 * scope label, visual comparison line (BR-VISUAL-01) and pre-flight checks (BR-RUN-09).
 */
import type { AiProvider, Browser, ID, Mode, Project, Suite, TestCase } from '@/data/types';
import { browserLabels } from './labels';
import { modeFor } from './runRules';

export interface TestPlan {
  testId: ID;
  mode: Mode;
  /** Why this mode, in plain words (BR-RUN-02). */
  reason: string;
  /** Browsers this test runs in: the dialog's browsers that the test allows (D53). Empty → Not run. */
  browsers: Browser[];
  /** Set when the test will not run in this run (D53). */
  notRunReason?: string;
}

const ALL: Browser[] = ['chrome', 'firefox', 'webkit'];

/**
 * BR-RUN-13 / D53: replays use the dialog's browsers that the test allows (its browser preference); no preference = all allowed.
 * None allowed → the test is Not run in this run. This also covers the parked "run on one browser only" need.
 */
export function browsersFor(test: Pick<TestCase, 'browserPreference'>, selected: Browser[]): Browser[] {
  const allowed = test.browserPreference?.length ? test.browserPreference : ALL;
  return ALL.filter((b) => selected.includes(b) && allowed.includes(b));
}

/** BR-RUN-02: mode + reason. `runNumber` resolves "Valid script from run #N". */
export function planTest(
  test: Pick<TestCase, 'id' | 'version' | 'script' | 'testData' | 'browserPreference'>,
  opts: { forceAi: boolean; browsers: Browser[]; runNumber: (runId: ID) => number | undefined },
): TestPlan {
  const mode = modeFor({ scriptState: test.script.state, hasTestData: Boolean(test.testData) }, opts.forceAi);
  const browsers = browsersFor(test, opts.browsers);
  const recorded = test.script.state === 'recorded';
  const from = test.script.fromRunId ? opts.runNumber(test.script.fromRunId) : undefined;
  const scriptSource = from ? `run #${from}` : 'AI explore';

  let reason: string;
  if (mode === 'data_rows') {
    const rows = test.testData?.rows.filter((r) => r.use).length ?? 0;
    reason = recorded && !opts.forceAi ? `${rows} data rows, replayed with the script from ${scriptSource}` : `${rows} data rows: row 1 by AI, the others replay its script`;
  } else if (mode === 'script') {
    reason = `Valid script from ${scriptSource}`;
  } else if (opts.forceAi && recorded) {
    reason = 'Force AI is on';
  } else if (test.script.state === 'reset') {
    reason = `Edited after last run (v${test.version}), script reset`;
  } else if (test.script.state === 'failed_ai') {
    reason = 'Last AI run failed, so no valid script';
  } else {
    reason = 'No script yet';
  }

  const plan: TestPlan = { testId: test.id, mode, reason, browsers };
  if (browsers.length === 0) {
    plan.notRunReason = `No allowed browser selected (test allows ${(test.browserPreference ?? []).map((b) => browserLabels[b].replace(' (WebKit)', '')).join(', ')})`;
  }
  return plan;
}

/**
 * Scope of a run (Run.scopeLabel): "All tests" (every test in the project, incl. Not in a suite; D56), one suite's name, "3 suites" (whole suites), "CNT-04 only" (one test),
 * or "<n> selected tests".
 */
export function scopeLabel(testIds: ID[], tests: Pick<TestCase, 'id' | 'suiteId' | 'testId'>[], suites: Pick<Suite, 'id' | 'name'>[]): string {
  const ids = new Set(testIds);
  if (tests.length > 0 && ids.size === tests.length && tests.every((t) => ids.has(t.id))) return 'All tests';
  if (ids.size === 1) return `${tests.find((t) => ids.has(t.id))?.testId ?? 'One test'} only`;
  const picked = tests.filter((t) => ids.has(t.id));
  const suiteIds = new Set(picked.map((t) => t.suiteId));
  const whole = [...suiteIds].every((sid) => sid !== null && tests.filter((t) => t.suiteId === sid).every((t) => ids.has(t.id)));
  if (whole && suiteIds.size === 1) return suites.find((s) => s.id === [...suiteIds][0])?.name ?? `${ids.size} selected tests`;
  if (whole && suiteIds.size > 1) return `${suiteIds.size} suites`;
  return `${ids.size} selected tests`;
}

/** Runs list wording: "All tests · 85", "09 Contact Us · 4 tests", "3 suites · 10 tests", "CNT-04 only", "3 selected tests". */
export function scopeWithCount(label: string, count: number): string {
  if (label === 'All tests') return `All tests · ${count}`;
  if (/ only$/.test(label) || / selected tests$/.test(label)) return label;
  return `${label} · ${count} ${count === 1 ? 'test' : 'tests'}`;
}

/** Dialog wording: "Suite: 09 Contact Us · 4 tests", "All tests · 85", "3 suites · 10 tests", "3 selected tests". */
export function scopeTitle(label: string, count: number, isSuite: boolean): string {
  return isSuite ? `Suite: ${scopeWithCount(label, count)}` : scopeWithCount(label, count);
}

/** BR-VISUAL-01: script replays of tests that are not excluded are compared. */
export function visualSummary(plans: TestPlan[], tests: Pick<TestCase, 'id' | 'visual'>[]): { compared: number; excluded: number } {
  const byId = new Map(tests.map((t) => [t.id, t]));
  const replaying = plans.filter((p) => !p.notRunReason && (p.mode === 'script' || (p.mode === 'data_rows' && p.reason.includes('replayed'))));
  return {
    compared: replaying.filter((p) => !byId.get(p.testId)?.visual.excluded).length,
    excluded: plans.filter((p) => byId.get(p.testId)?.visual.excluded).length,
  };
}

export interface PreflightCheck {
  id: 'ai' | 'environment' | 'browser';
  label: string;
  status: 'pass' | 'warn' | 'block';
  detail?: string;
}

/**
 * BR-RUN-09 [DEV-CONFIRM] pre-flight after Start run: AI key/model (block), environment URL reachable (warn), browser
 * launches (block). Prototype: the model must be offered by an AI provider with a key; the environment warns for apps
 * with no URL in it (BR-ENV-02); browsers always launch.
 */
export function preflight(project: Pick<Project, 'apps' | 'environments'>, environmentId: ID, model: string, providers: Pick<AiProvider, 'defaultModel' | 'hasSecret' | 'label'>[], offeredModels: string[]): PreflightCheck[] {
  const env = project.environments.find((e) => e.id === environmentId);
  const keyOk = providers.some((p) => p.hasSecret);
  const modelOk = offeredModels.includes(model);
  const missing = project.apps.filter((a) => !a.urls[environmentId]);
  return [
    keyOk && modelOk
      ? { id: 'ai', label: 'API key accepted, model available', status: 'pass' }
      : { id: 'ai', label: 'AI model not available', status: 'block', detail: keyOk ? `${model} is not offered by your AI providers. Choose another model or add a provider in Global settings.` : 'No AI provider key. Add one in Global settings.' },
    missing.length === 0
      ? { id: 'environment', label: `${env?.name ?? 'Environment'} apps reachable`, status: 'pass' }
      : {
          id: 'environment',
          label: `${missing.map((a) => a.name).join(', ')} ${missing.length === 1 ? 'has' : 'have'} no URL for ${env?.name ?? 'this environment'}`,
          status: 'warn',
          detail: 'Tests that need it will fail to open the app. Add the URL in Knowledge › Apps and environments.',
        },
    { id: 'browser', label: 'Browser launches', status: 'pass' },
  ];
}
