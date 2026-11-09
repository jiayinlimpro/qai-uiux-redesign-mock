/**
 * One consistent fake world (docs/07-data-model.md § Sample data).
 *
 * Built as a timeline: the CSV import, then runs #1–#14 and test edits in date order. Each run uses the
 * business rules to decide each test's mode (BR-RUN-02), records or keeps scripts (BR-SCRIPT-01/02) and
 * compares screenshots with the previous replay (BR-VISUAL-02). So scripts, modes, versions and visual
 * history always agree with each other. Deterministic: no Date.now(), no randomness.
 */
import seedCsv from '../../../docs/fixtures/qcfixer-tests-seed.csv?raw';
import type {
  Account,
  Browser,
  CcReason,
  Chat,
  FailReason,
  GlobalSettings,
  ID,
  KnowledgeItem,
  Mode,
  Project,
  Result,
  ResultStep,
  Run,
  RunState,
  Status,
  Suite,
  TestCase,
} from '../types';
import { contentToSteps, idPrefixOf, parseBrowserList, readTemplateCsv } from '@/lib/importRules';
import { snapshotEnvironment } from '@/lib/runRules';
import { modeFor } from '@/lib/runRules';
import { sumCost } from '@/lib/status';

export const SEED_VERSION = 9;

/**
 * Mock engine pace for seeded demo runs: timer ticks per work tick (normal runs: 1). Run #14 has 14 work ticks left
 * (CNT-03 Data rows 5, CNT-04 AI run 9), so 14 × 260 × 0.5 s ≈ 30 minutes until it completes.
 */
export const SEED_RUN_PACE: Record<string, number> = { 'run-14': 260 };

export interface MockDb {
  seedVersion: number;
  globalSettings: GlobalSettings;
  projects: Project[];
  accounts: Account[];
  knowledge: KnowledgeItem[];
  suites: Suite[];
  tests: TestCase[];
  runs: Run[];
  results: Result[];
  chats: Chat[];
  /** Mock-only secret store: account passwords by account ID. Never part of a domain type (07: hasPassword only). */
  accountPasswords: Record<ID, string>;
}

// ---------- ids and constants ----------
const P_QC = 'p-qcfixer';
const P_HRMS = 'p-hrms';
const ENV = { dev: 'env-dev', uat: 'env-uat', prod: 'env-prod' } as const;
const APP = { customer: 'app-customer', admin: 'app-admin' } as const;
const testKey = (displayId: string): ID => `t-${displayId.toLowerCase()}`;
const runKey = (n: number): ID => `run-${n}`;
const resultKey = (runNumber: number, displayId: string): ID => `res-${runNumber}-${displayId.toLowerCase()}`;
const shotKey = (runNumber: number, displayId: string, step: number): ID =>
  `shot-${runNumber}-${displayId.toLowerCase()}-${step}`;
const addMs = (iso: string, ms: number): string => new Date(Date.parse(iso) + ms).toISOString();

const PROJECT_CREATED = '2026-09-01T09:00:00.000Z';
const IMPORTED_AT = '2026-09-01T10:00:00.000Z';
const DEFAULT_MODEL = 'gpt-4.1';
const CURRENT_USER = 'Jia Yin';
const SCRIPT_REPLAY_COST = 0.02;
const DEFAULT_VIEWPORT = { width: 1920, height: 1080 }; // D27: every run, until users can choose
const VP = `${DEFAULT_VIEWPORT.width}x${DEFAULT_VIEWPORT.height}`;
const CHAT_T_TESTS = 'chat-3'; // the chat T-01 and T-02 were added from
const CHAT_T_TESTS_READY_INDEX = 2;

/** Deterministic pseudo-values so lists look varied. */
const durationFor = (n: number, mode: Mode): number =>
  mode === 'script' ? 20_000 + ((n * 7919) % 40_000) : 90_000 + ((n * 12_347) % 150_000);
const aiCostFor = (n: number): number => Math.round(5 + ((n * 37) % 20)) / 100; // $0.05–$0.24

// ---------- global settings ----------
// No provider configured → first launch shows Welcome (03 · First launch).
const globalSettings: GlobalSettings = {
  providers: [],
  costSaving: { enabled: false, typeSafeModel: 'jev-latest', reasoning: 'none', hasKey: false },
  theme: 'system',
  developerMode: false,
};

// ---------- projects and accounts ----------
const runDefaults = { headless: false, parallel: false, workers: 2, maxAiSteps: 40, maxActionsPerStep: 10 }; // 2.2, BR-RUN-12

const projects: Project[] = [
  {
    id: P_QC,
    name: 'qcfixer.com',
    createdAt: PROJECT_CREATED,
    defaultModel: DEFAULT_MODEL,
    environments: [
      { id: ENV.dev, name: 'Dev' },
      { id: ENV.uat, name: 'UAT' },
      { id: ENV.prod, name: 'Prod' },
    ],
    apps: [
      {
        id: APP.customer,
        name: 'Customer website',
        urls: { [ENV.dev]: null, [ENV.uat]: 'https://uat.qcfixer.com', [ENV.prod]: 'https://www.qcfixer.com' },
      },
      { id: APP.admin, name: 'Admin portal', urls: { [ENV.dev]: null, [ENV.uat]: 'https://uat-admin.qcfixer.com', [ENV.prod]: null } },
    ],
    settings: { visualComparison: true /* BR-VISUAL-01 */, runDefaults },
  },
  {
    id: P_HRMS,
    name: 'Client HRMS',
    createdAt: '2026-10-10T09:00:00.000Z',
    defaultModel: DEFAULT_MODEL,
    environments: [
      { id: 'env-hrms-sit', name: 'SIT' },
      { id: 'env-hrms-uat', name: 'UAT' },
      { id: 'env-hrms-prod', name: 'Prod' },
    ],
    apps: [
      {
        id: 'app-hrms-portal',
        name: 'HR portal',
        urls: { 'env-hrms-sit': 'https://sit.hrms.example.com', 'env-hrms-uat': 'https://uat.hrms.example.com', 'env-hrms-prod': null },
      },
    ],
    settings: { visualComparison: true, runDefaults },
  },
];

const accounts: Account[] = [
  { id: 'acc-admin', projectId: P_QC, role: 'Admin', appId: APP.admin, environmentId: ENV.uat, username: 'qa.admin', hasPassword: true },
  { id: 'acc-customer', projectId: P_QC, role: 'Registered customer', appId: APP.customer, environmentId: ENV.uat, username: 'qa.customer@qcfixer.test', hasPassword: true },
];

// ---------- suites and tests from the CSV (BR-IMPORT-*) ----------
const parsed = readTemplateCsv(seedCsv);

const suites: Suite[] = [];
const suiteIdByName = new Map<string, ID>();
for (const row of parsed.rows) {
  const name = row.category ?? '';
  if (!name || suiteIdByName.has(name)) continue;
  const id = `suite-${suites.length + 1}`;
  suiteIdByName.set(name, id);
  suites.push({ id, projectId: P_QC, name, idPrefix: idPrefixOf(row.task_id ?? '') });
}
const suiteIdOf = (prefix: string): ID => suites.find((s) => s.idPrefix === prefix)!.id;

// ---------- knowledge (2.1) ----------
// The Contact form FRS covers the enquiry form only (fields, validation, confirmation), not how the phone number is
// linked, so CNT-04 stays "Needs confirmation": no linked document confirms which link is right (BR-REASON-05).
const K_CONTACT_FRS = 'k-contact-frs';
const knowledge: KnowledgeItem[] = [
  { id: K_CONTACT_FRS, projectId: P_QC, kind: 'document', docType: 'frs', name: 'Contact form FRS.pdf', scope: { kind: 'suite', suiteId: suiteIdOf('CNT') }, uploadedAt: '2026-09-01T11:00:00.000Z' },
  { id: 'k-user-stories', projectId: P_QC, kind: 'document', docType: 'user_stories', name: 'Customer website user stories.docx', scope: { kind: 'project' }, uploadedAt: '2026-09-01T11:05:00.000Z' },
  { id: 'k-testing-rules', projectId: P_QC, kind: 'skill', skillKind: 'instructions', name: 'testing-rules.md', scope: { kind: 'project' }, usedBy: ['runs', 'ai_explore'], uploadedAt: '2026-09-01T11:10:00.000Z' },
  { id: 'k-codebase', projectId: P_QC, kind: 'skill', skillKind: 'codebase', name: 'qcfixer-web', scope: { kind: 'suite', suiteId: suiteIdOf('NAV') }, usedBy: ['ai_explore'], uploadedAt: '2026-09-01T11:15:00.000Z' },
];
const accountPasswords: Record<ID, string> = { 'acc-admin': 'Uat-Admin-2026!', 'acc-customer': 'Uat-Customer-2026!' };

const tests: TestCase[] = parsed.rows.map((row) => {
  const displayId = row.task_id ?? '';
  const steps = contentToSteps(row.task_content ?? '');
  return {
    id: testKey(displayId),
    projectId: P_QC,
    suiteId: suiteIdByName.get(row.category ?? '') ?? null, // BR-IMPORT-05
    testId: displayId,
    title: row.title || (steps[0] ?? '').slice(0, 40), // BR-TEST-02
    description: row.description || undefined,
    preconditions: row.preconditions || undefined,
    steps,
    expectedResult: row.expected_result || undefined,
    expectedKeywords: row.expected_keywords || undefined,
    startPage: row.base_url || undefined,
    browserPreference: parseBrowserList(row.browser_type),
    linkedKnowledge: [],
    version: 1,
    source: 'import',
    isNew: false,
    script: { state: 'none' },
    visual: { excluded: false, ignoreAreas: [] },
    createdAt: IMPORTED_AT,
    updatedAt: IMPORTED_AT,
  };
});
const csvIds = tests.map((t) => t.testId);

function T(displayId: string): TestCase {
  const t = tests.find((x) => x.testId === displayId);
  if (!t) throw new Error(`Seed: test ${displayId} not found`);
  return t;
}
const idsOfSuites = (...prefixes: string[]): string[] => csvIds.filter((id) => prefixes.includes(idPrefixOf(id)));

/**
 * 6.1: when a test is a single paragraph, the AI derives intent steps from it.
 * Simulated by splitting on sentence ends (an ellipsis "..." is not a sentence end).
 */
export function deriveSteps(paragraph: string): string[] {
  return paragraph
    .split(/(?<=[^.][.!?])\s+(?=[A-Z'"(])/)
    .map((s) => s.trim())
    .filter(Boolean);
}
const intentSteps = (t: TestCase): string[] => (t.steps.length > 1 ? t.steps : deriveSteps(t.steps[0] ?? ''));

// ---------- timeline: edits ----------
// BR-VISUAL-02: previous replay of the same test, environment, browser and viewport.
const replayKey = (testId: ID, environmentId: ID, browser: Browser): string => `${testId}|${environmentId}|${browser}|${VP}`;
const replayHistory = new Map<string, number>(); // replayKey → last replay run number

// BR-SCRIPT-02 / BR-VERSION-01 / BR-VISUAL-05: an edit to a reset field bumps the version, resets the script
// and restarts visual history.
function editTest(displayId: string, at: string, change: (t: TestCase) => void): void {
  const t = T(displayId);
  change(t);
  t.version += 1;
  t.updatedAt = at;
  if (t.script.state === 'recorded') t.script = { state: 'reset' };
  for (const key of [...replayHistory.keys()]) if (key.startsWith(`${t.id}|`)) replayHistory.delete(key);
}

// ---------- timeline: runs ----------
interface Outcome {
  status: Exclude<Status, 'not_run'>;
  reason?: FailReason | CcReason;
  /** 1-based step where it failed / stopped; default last step. */
  atStep?: number;
  expected?: string;
  found?: string;
  /** One-line AI reasoning on the failing step. */
  note?: string;
  cost?: number;
  durationMs?: number;
  confidence?: 'high' | 'medium' | 'low';
  worthALook?: string;
  aiVerdict?: Result['aiVerdict'];
  override?: Result['override'];
  actions?: Record<number, ResultStep['actions']>;
  visualChanges?: Record<number, number>; // step → changed areas
}
const PASSED: Outcome = { status: 'passed' };

interface RunSpec {
  number: number;
  startedAt: string;
  environmentId: ID;
  scopeLabel: string;
  testIds: string[]; // display IDs, frozen list (BR-RUN-01)
  browsers?: Browser[];
  state?: RunState;
  pauseReason?: Run['pauseReason'];
  /** Tests executed so far (running / interrupted runs). */
  done?: number;
  outcomes?: Record<string, Outcome>;
}

const runs: Run[] = [];
const results: Result[] = [];

function buildSteps(runNumber: number, t: TestCase, mode: Mode, o: Outcome, durationMs: number, environmentId: ID): ResultStep[] {
  const texts = intentSteps(t);
  const stopAt = o.status === 'passed' ? texts.length + 1 : Math.min(o.atStep ?? texts.length, texts.length);
  const executed = Math.min(stopAt, texts.length);
  const each = Math.round(durationMs / Math.max(executed, 1));
  const previous = mode === 'script' ? replayHistory.get(replayKey(t.id, environmentId, 'chrome')) : undefined;
  return texts.map((text, i) => {
    const index = i + 1;
    const status: Status = index < stopAt ? 'passed' : index === stopAt ? o.status : 'not_run';
    const ran = status !== 'not_run';
    const step: ResultStep = {
      index,
      text,
      status,
      durationMs: ran ? each : 0,
      actions: o.actions?.[index] ?? [],
      ...(ran ? { screenshotId: shotKey(runNumber, t.testId, index) } : {}),
    };
    if (index === stopAt && o.expected && o.found) step.check = { expected: o.expected, found: o.found, ok: false };
    if (index === stopAt && o.note) step.aiReasoning = o.note;
    // BR-VISUAL-01/02: script replays compare each step with the previous replay (same test, environment, browser).
    if (ran && previous !== undefined && !t.visual.excluded) {
      step.visual = { previousScreenshotId: shotKey(previous, t.testId, index), changedAreas: o.visualChanges?.[index] ?? 0 };
    }
    return step;
  });
}

function simulateRun(spec: RunSpec): void {
  const browsers = spec.browsers ?? ['chrome'];
  const state = spec.state ?? 'completed';
  const executed = spec.testIds.slice(0, spec.done ?? spec.testIds.length);
  const runResults: Result[] = [];

  executed.forEach((displayId, i) => {
    const t = T(displayId);
    const mode = modeFor({ scriptState: t.script.state, hasTestData: !!t.testData }, false); // BR-RUN-02
    const o = spec.outcomes?.[displayId] ?? PASSED;
    const n = spec.number * 100 + i;
    const durationMs = o.durationMs ?? durationFor(n, mode);
    const aiVerdict = o.aiVerdict ?? { status: o.status, reason: o.reason, confidence: o.confidence ?? 'high' };
    // Steps show what the AI saw; an override (BR-STATUS-05) changes the result status, not the evidence.
    const seen: Outcome = o.override && aiVerdict.status !== 'not_run' ? { ...o, status: aiVerdict.status } : o;
    const steps = buildSteps(spec.number, t, mode, seen, durationMs, spec.environmentId);
    const visualChanges = steps.reduce((sum, s) => sum + (s.visual?.changedAreas ?? 0), 0);
    // BR-WORTH [PROPOSAL]: Needs confirmation or a low-confidence verdict.
    const worthALook =
      o.worthALook ??
      (o.reason === 'needs_confirmation' ? 'Needs confirmation' : aiVerdict.confidence === 'low' ? 'Low confidence verdict' : undefined);
    const failStep = seen.status === 'passed' ? undefined : Math.min(seen.atStep ?? steps.length, steps.length);

    runResults.push({
      id: resultKey(spec.number, displayId),
      runId: runKey(spec.number),
      testId: t.id,
      testSnapshot: { testId: t.testId, title: t.title }, // D46
      testVersion: t.version,
      mode,
      status: o.status,
      reason: o.reason,
      aiVerdict,
      // BR-RUN-03: AI runs use Chrome; other browsers replay only if the AI run passed.
      perBrowser: browsers.map((browser) => ({
        browser,
        status: mode === 'script' || browser === 'chrome' || o.status === 'passed' ? o.status : 'not_run',
      })),
      ...(failStep && o.expected && o.found ? { failure: { stepIndex: failStep, expected: o.expected, found: o.found } } : {}),
      steps,
      cost: o.cost ?? (mode === 'script' ? SCRIPT_REPLAY_COST : aiCostFor(n)),
      durationMs,
      flags: { ...(worthALook ? { worthALook } : {}), ...(visualChanges > 0 ? { visualChanges } : {}) },
      ...(o.override ? { override: o.override } : {}),
    });

    // After the test: scripts (BR-SCRIPT-01) and replay history (BR-VISUAL-02).
    if (mode === 'script') {
      for (const b of browsers) replayHistory.set(replayKey(t.id, spec.environmentId, b), spec.number);
    } else if (aiVerdict.status === 'passed') {
      t.script = { state: 'recorded', fromRunId: runKey(spec.number) };
    } else if (aiVerdict.status === 'failed') {
      t.script = { state: 'failed_ai' };
    }
  });

  const durationMs = runResults.reduce((a, r) => a + r.durationMs, 0);
  const next = spec.testIds[executed.length];
  runs.push({
    id: runKey(spec.number),
    projectId: P_QC,
    number: spec.number,
    environmentId: spec.environmentId,
    browsers,
    viewport: { ...DEFAULT_VIEWPORT },
    environment: snapshotEnvironment(projects[0]!, spec.environmentId), // BR-ENV-04
    model: DEFAULT_MODEL,
    forceAi: false,
    state,
    scopeLabel: spec.scopeLabel,
    testIds: spec.testIds.map(testKey),
    progress: {
      done: executed.length,
      total: spec.testIds.length,
      ...(state === 'running' && next ? { currentTestId: testKey(next) } : {}),
    },
    ...(spec.pauseReason ? { pauseReason: spec.pauseReason } : {}),
    startedAt: spec.startedAt,
    ...(state === 'completed' ? { finishedAt: addMs(spec.startedAt, durationMs) } : {}),
    durationMs, // active time so far (running) or in total
    cost: sumCost(runResults.map((r) => r.cost)), // computed (CLAUDE.md rule 5)
  });
  results.push(...runResults);
}

// Recurring outcomes (the same problems show up run after run until fixed).
const OUT = {
  'ABT-03': { status: 'failed', reason: 'product_bug', expected: 'Our Services page opens (URL contains our-services)', found: 'Stayed on https://www.qcfixer.com/about-us/#' },
  'FTR-04': { status: 'failed', reason: 'product_bug', expected: 'Career opens a page with openings or a clear message', found: 'Career opens a 404 page' },
  'NWS-02': { status: 'failed', reason: 'test_case_unclear', expected: 'Back returns to the News Feed', found: 'The article opened in a new tab, so Back was not available', note: 'The steps assume the article opens in the same tab.' },
  'CONS-02': { status: 'failed', reason: 'test_case_unclear', expected: 'Consistent naming', found: "Menu 'One Page Website' · heading 'Landing Page Design' · tab 'Landing Page Design | QC Fixer'", note: 'The expected result describes both consistent naming and the current difference.' },
  'PRT-01': { status: 'failed', reason: 'product_bug', atStep: 2, expected: 'Portfolio content within about 5 seconds', found: 'Loading screen still shown after 15 seconds' },
  'PRT-02': { status: 'failed', reason: 'blocked', atStep: 1, expected: 'Portfolio projects listed', found: 'Portfolio never finished loading', note: 'Blocked by PRT-01: the portfolio page did not load, so the test could not reach its checks.' },
  'PRT-03': { status: 'failed', reason: 'blocked', atStep: 1, expected: 'Portfolio projects listed', found: 'Portfolio never finished loading', note: 'Blocked by PRT-01: the portfolio page did not load, so the test could not reach its checks.' },
  'FTR-02': { status: 'couldnt_complete', reason: 'ai_couldnt_finish', expected: 'All 7 Quick Links checked', found: 'Stopped at the 40 AI step limit after 4 of 7 links' },
  'GEN-02': { status: 'couldnt_complete', reason: 'ai_couldnt_finish', confidence: 'low', expected: 'Loading time judged for 6 pages', found: 'Could not judge loading time reliably' },
} satisfies Record<string, Outcome>;

// #1–#6: first AI runs after import, suite by suite on UAT. Passing AI runs record scripts (BR-SCRIPT-01).
simulateRun({ number: 1, startedAt: '2026-09-02T09:00:00.000Z', environmentId: ENV.uat, scopeLabel: '01 Navigation', testIds: idsOfSuites('NAV') });
simulateRun({ number: 2, startedAt: '2026-09-03T09:00:00.000Z', environmentId: ENV.uat, scopeLabel: '02 Services Menu', testIds: idsOfSuites('SVC') });
simulateRun({
  number: 3, startedAt: '2026-09-04T09:00:00.000Z', environmentId: ENV.uat, scopeLabel: '3 suites',
  testIds: idsOfSuites('HOME', 'ABT', 'PRC'), outcomes: { 'ABT-03': OUT['ABT-03'] },
});
simulateRun({
  number: 4, startedAt: '2026-09-08T09:00:00.000Z', environmentId: ENV.uat, scopeLabel: '3 suites',
  testIds: idsOfSuites('CONS', 'PRT', 'NWS'),
  outcomes: { 'CONS-02': OUT['CONS-02'], 'NWS-02': OUT['NWS-02'], 'PRT-01': OUT['PRT-01'], 'PRT-02': OUT['PRT-02'], 'PRT-03': OUT['PRT-03'] },
});
simulateRun({
  number: 5, startedAt: '2026-09-10T09:00:00.000Z', environmentId: ENV.uat, scopeLabel: '2 suites',
  testIds: idsOfSuites('CNT', 'FTR'),
  outcomes: {
    'CNT-04': { status: 'couldnt_complete', reason: 'service_problem', atStep: 1, expected: 'Contact Us page checked', found: 'AI provider returned errors after 3 retries' },
    'FTR-04': OUT['FTR-04'],
    'FTR-02': OUT['FTR-02'],
  },
});
simulateRun({
  number: 6, startedAt: '2026-09-11T09:00:00.000Z', environmentId: ENV.uat, scopeLabel: '2 suites',
  testIds: idsOfSuites('WA', 'GEN'), outcomes: { 'GEN-02': OUT['GEN-02'] },
});

// #7: Navigation on Prod in three browsers (script replays; no Prod visual history yet).
simulateRun({
  number: 7, startedAt: '2026-10-06T09:00:00.000Z', environmentId: ENV.prod, scopeLabel: '01 Navigation',
  testIds: idsOfSuites('NAV'), browsers: ['chrome', 'firefox', 'webkit'],
});

// #8: CNT-04 re-run. AI said Needs confirmation; the tester overrode it to Passed. No script (AI verdict not passed).
simulateRun({
  number: 8, startedAt: '2026-10-14T09:00:00.000Z', environmentId: ENV.uat, scopeLabel: 'CNT-04 only', testIds: ['CNT-04'],
  outcomes: {
    'CNT-04': {
      status: 'passed',
      atStep: 2,
      expected: 'tel: link',
      found: 'https://wa.link/mgz96d',
      aiVerdict: { status: 'failed', reason: 'needs_confirmation', confidence: 'medium' },
      override: { status: 'passed', reason: 'Business confirmed the phone number should open WhatsApp on this release.', proofName: 'cnt-04-confirmation.png', by: CURRENT_USER, at: '2026-10-14T11:00:00.000Z' },
    },
  },
});

// 20 Oct: testers rewrite CNT-03 and CNT-04 (v2). CNT-03's script resets; CNT-04 had none.
editTest('CNT-03', '2026-10-20T10:00:00.000Z', (t) => {
  t.expectedResult = 'Submission is blocked and an invalid email message is shown next to the email field.';
});
// CNT-04 v2: the paragraph split into 3 numbered steps; expected result stays as in the CSV.
editTest('CNT-04', '2026-10-20T11:00:00.000Z', (t) => {
  t.steps = deriveSteps(t.steps[0] ?? '');
});

// #9: Navigation on UAT, first UAT replays (become the visual "previous run" for #12).
simulateRun({ number: 9, startedAt: '2026-10-22T09:00:00.000Z', environmentId: ENV.uat, scopeLabel: '01 Navigation', testIds: idsOfSuites('NAV') });
// #10: re-check of the content suites after a site update: same problems remain.
simulateRun({
  number: 10, startedAt: '2026-10-24T09:00:00.000Z', environmentId: ENV.uat, scopeLabel: '3 suites',
  testIds: idsOfSuites('CONS', 'PRT', 'NWS'),
  outcomes: { 'CONS-02': OUT['CONS-02'], 'NWS-02': OUT['NWS-02'], 'PRT-01': OUT['PRT-01'], 'PRT-02': OUT['PRT-02'], 'PRT-03': OUT['PRT-03'] },
});

// CNT-04 evidence (07): step 2 failed, expected tel: link, found wa.link; $0.07; 2m 54s.
const CNT04_FAIL: Outcome = {
  status: 'failed',
  // BR-REASON-05: the app consistently links the phone to WhatsApp, not tel:, and no linked document says which is right.
  reason: 'needs_confirmation',
  atStep: 2,
  expected: 'tel: link',
  found: 'https://wa.link/mgz96d',
  note: 'The phone number links to WhatsApp instead of starting a call; unclear whether that is intended.',
  actions: {
    2: [
      { text: "Found phone '+60123933860' on the page", raw: 'click(index=218)' },
      { text: 'Read its link target', raw: 'evaluate(...)' },
    ],
  },
};
simulateRun({ number: 11, startedAt: '2026-10-28T09:00:00.000Z', environmentId: ENV.uat, scopeLabel: 'CNT-04 only', testIds: ['CNT-04'], outcomes: { 'CNT-04': { ...CNT04_FAIL, cost: 0.08, durationMs: 171_000 } } });

// #12: all suites, UAT, 83 tests → 72 passed · 8 failed · 3 couldn't complete, $3.47.
// AI-run costs are set so the total is $3.47 (script replays cost $0.02 each).
simulateRun({
  number: 12, startedAt: '2026-11-03T08:30:00.000Z', environmentId: ENV.uat, scopeLabel: 'All tests', testIds: csvIds,
  outcomes: {
    'NAV-01': { status: 'passed', visualChanges: { 2: 3 } }, // hero word, counters and carousel changed vs Run #9
    'CNT-03': { status: 'passed', cost: 0.51, worthALook: 'Passed using 38 of 40 AI steps' },
    'CNT-04': { ...CNT04_FAIL, cost: 0.07, durationMs: 174_000 },
    'ABT-03': { ...OUT['ABT-03'], cost: 0.18 },
    'FTR-04': { ...OUT['FTR-04'], cost: 0.17 },
    'NWS-02': { ...OUT['NWS-02'], cost: 0.19 },
    'CONS-02': { ...OUT['CONS-02'], cost: 0.16 },
    'PRT-01': { ...OUT['PRT-01'], cost: 0.21 },
    'PRT-02': { ...OUT['PRT-02'], cost: 0.03 },
    'PRT-03': { ...OUT['PRT-03'], cost: 0.03 },
    'FTR-02': { ...OUT['FTR-02'], cost: 0.22 },
    'GEN-02': { ...OUT['GEN-02'], cost: 0.26 },
    'WA-02': { status: 'couldnt_complete', reason: 'environment_down', atStep: 1, expected: 'Homepage loads', found: 'UAT site did not respond within 30 seconds' },
  },
});

// After reviewing #12: ignore areas on NAV-01, and CNT-03 becomes data-driven (v3, script reset).
// Drawn on the screenshot in Visual compare (rect = share of the screenshot, D45).
T('NAV-01').visual.ignoreAreas = [
  { id: 'ia-nav01-1', stepIndex: 2, label: 'Hero rotating word', rect: { x: 0.18, y: 0.3, width: 0.32, height: 0.08 } },
  { id: 'ia-nav01-2', stepIndex: 2, label: 'Statistics counters', rect: { x: 0.1, y: 0.62, width: 0.8, height: 0.12 } },
  { id: 'ia-nav01-3', stepIndex: 2, label: 'Team carousel', rect: { x: 0.05, y: 0.8, width: 0.9, height: 0.15 } },
];
editTest('CNT-03', '2026-11-03T15:00:00.000Z', (t) => {
  t.steps = [
    "Click 'Contact Us' in the header.",
    'Fill the name field with {name}, put {email} in the email field and choose {topic} as the topic.',
    'Click submit and report the messages shown.',
  ];
  t.expectedResult = 'Valid details are accepted; invalid details are blocked with a message next to the field.';
  const base = { name: 'QA Test - please ignore', email: 'qa.test@example.com', topic: 'General enquiry' };
  t.testData = {
    fields: [
      { name: 'name', type: 'text' },
      { name: 'email', type: 'text' },
      { name: 'topic', type: 'select', options: ['General enquiry', 'Website design', 'Digital marketing'] },
    ],
    rows: [
      { id: 'row-cnt03-1', index: 1, values: base, expected: 'accepted', pageShows: 'Thank you', use: true, generated: false },
      { id: 'row-cnt03-2', index: 2, values: { ...base, email: 'not-an-email' }, expected: 'rejected', pageShows: 'valid email', use: true, generated: false, variedField: 'email' },
      { id: 'row-cnt03-3', index: 3, values: { ...base, email: '' }, expected: 'rejected', pageShows: 'required', use: true, generated: false, variedField: 'email' },
      { id: 'row-cnt03-4', index: 4, values: { ...base, name: '' }, expected: 'rejected', pageShows: 'required', use: true, generated: false, variedField: 'name' },
      { id: 'row-cnt03-5', index: 5, values: { ...base, topic: '' }, expected: 'rejected', pageShows: 'select a topic', use: true, generated: false, variedField: 'topic' },
    ],
  };
});

// #13: all suites again, interrupted when QAI closed at 34/83 → 31 passed · 3 failed · 49 not run, $1.12.
// The 3 failed replays cost more because the failure is classified by AI.
simulateRun({
  number: 13, startedAt: '2026-11-04T08:30:00.000Z', environmentId: ENV.uat, scopeLabel: 'All tests', testIds: csvIds,
  state: 'interrupted', pauseReason: 'app_closed', done: 34,
  outcomes: {
    'SVC-17': { status: 'failed', reason: 'product_bug', cost: 0.17, expected: "Page about 'Brand Collaterals Design'", found: '404 Page not found' },
    'HOME-01': { status: 'failed', reason: 'product_bug', atStep: 2, cost: 0.17, expected: 'Hero word rotates through at least two words', found: 'No word shown in the hero area' },
    'HOME-02': { status: 'failed', reason: 'product_bug', cost: 0.16, expected: 'URL contains contact-us', found: 'https://uat.qcfixer.com/#' },
  },
});

// 4 Nov afternoon: two tests added from AI explore → Not in a suite, New, prefix "T-" (BR-TEST-01, BR-EXPLORE-05).
const AI_EXPLORE_AT = '2026-11-04T14:30:00.000Z';
const T01 = {
  title: 'Message field enforces length limit',
  steps: ["Click 'Contact Us' in the header.", 'Type more text into the message field than it should accept.', 'Report whether the field stops input or shows a length message.'],
  expectedResult: 'The message field limits the length or shows a clear message.',
};
const T02 = {
  title: 'Back to top button returns to the top',
  steps: ['On the homepage, scroll to the footer.', "Click the 'back to top' arrow at the bottom right.", 'Report where the page ends up.'],
  expectedResult: 'The page scrolls back to the top.',
};
const aiExploreTest = (testId: string, p: typeof T01, extra: Partial<TestCase>): TestCase => ({
  id: testKey(testId),
  projectId: P_QC,
  suiteId: null,
  testId,
  ...p,
  linkedKnowledge: [],
  version: 1,
  source: 'ai_explore',
  isNew: true,
  script: { state: 'none' },
  visual: { excluded: false, ignoreAreas: [] },
  createdAt: AI_EXPLORE_AT,
  updatedAt: AI_EXPLORE_AT,
  ...extra,
});
tests.push(
  // Validated in AI explore → keeps its generated script, so its first run can replay (BR-EXPLORE-06).
  aiExploreTest('T-01', T01, { script: { state: 'recorded' } }),
  // Likely bug → Not run, with a "Likely bug" badge until its first run (BR-EXPLORE-05, D25).
  aiExploreTest('T-02', T02, { aiExploreFinding: { kind: 'likely_bug', chatId: CHAT_T_TESTS, messageIndex: CHAT_T_TESTS_READY_INDEX } }),
);

// #14: running now, 09 Contact Us on UAT, on test 3 of 4 (CNT-03 as Data rows). It runs slowly (SEED_RUN_PACE) so the
// Running state stays visible for demos.
simulateRun({
  number: 14, startedAt: '2026-11-05T08:50:00.000Z', environmentId: ENV.uat, scopeLabel: '09 Contact Us',
  testIds: idsOfSuites('CNT'), state: 'running', done: 2,
});

// ---------- AI explore chats (BR-EXPLORE-*) ----------
const chats: Chat[] = [
  {
    id: 'chat-1',
    projectId: P_QC,
    title: 'Contact Us · explore on UAT',
    updatedAt: '2026-11-04T16:00:00.000Z',
    running: false,
    messages: [
      { kind: 'user', text: 'Explore the Contact Us page on UAT and propose tests for the form and the contact details.' },
      { kind: 'plan', suites: 2, scenarios: 5, pagesExplored: 4, usedKnowledge: [K_CONTACT_FRS] },
      {
        kind: 'tests_ready',
        proposals: [
          { id: 'prop-1.1', title: 'Contact form blocks empty submission', steps: ["Click 'Contact Us' in the header.", 'Click submit without filling any field.'], expectedResult: 'Required-field messages are shown.', validation: 'validated', duplicateOf: testKey('CNT-02'), ticked: true },
          { id: 'prop-1.2', title: 'Contact form accepts a valid enquiry', steps: ["Click 'Contact Us' in the header.", 'Fill every field with valid values and submit.'], expectedResult: 'A confirmation message is shown.', validation: 'validated', ticked: true },
          { id: 'prop-1.3', title: 'Form keeps entered values after an error', steps: ["Click 'Contact Us' in the header.", 'Fill the form with an invalid email and submit.'], expectedResult: 'The other fields keep their values.', validation: 'validated', ticked: true },
          { id: 'prop-2.1', title: 'Office address opens a map', steps: ["Click 'Contact Us' in the header.", 'Click the office address.'], expectedResult: 'A map opens at the office location.', validation: 'likely_bug', ticked: true },
          { id: 'prop-2.2', title: 'Opening hours are shown', steps: ["Click 'Contact Us' in the header.", 'Look for opening hours.'], expectedResult: 'Opening hours are visible.', validation: 'needs_attention', ticked: false }, // BR-EXPLORE-03
        ],
      },
    ],
  },
  {
    id: 'chat-2',
    projectId: P_QC,
    title: 'Footer links · explore on UAT',
    updatedAt: '2026-11-05T09:10:00.000Z',
    running: true, // BR-EXPLORE-02: AI turn still active
    messages: [{ kind: 'user', text: 'Check every link in the footer on UAT and propose tests for anything not covered yet.' }],
  },
  {
    id: CHAT_T_TESTS,
    projectId: P_QC,
    title: 'Homepage and Contact Us · explore on UAT',
    updatedAt: AI_EXPLORE_AT,
    running: false,
    messages: [
      { kind: 'user', text: 'Explore the homepage and Contact Us on UAT and propose tests for anything the suites miss.' },
      { kind: 'plan', suites: 2, scenarios: 2, pagesExplored: 2, usedKnowledge: [] },
      // index 2 = CHAT_T_TESTS_READY_INDEX; both proposals were added as T-01 and T-02
      {
        kind: 'tests_ready',
        proposals: [
          { id: 'prop-3-1', ...T01, validation: 'validated', ticked: true, outcome: { kind: 'added', testId: testKey('T-01') } },
          { id: 'prop-3-2', ...T02, validation: 'likely_bug', ticked: true, outcome: { kind: 'added', testId: testKey('T-02') } },
        ],
      },
    ],
  },
];

export function createSeed(): MockDb {
  return structuredClone({
    seedVersion: SEED_VERSION,
    globalSettings,
    projects,
    accounts,
    knowledge,
    accountPasswords,
    suites,
    tests,
    runs,
    results,
    chats,
  });
}
