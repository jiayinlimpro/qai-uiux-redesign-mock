import { modeFor } from '@/lib/runRules';
import { showsNeedsFixingBadge } from '@/lib/exploreRules';
import { countRunStatuses, latestStatus, passRate, sumCost } from '@/lib/status';
import seedCsv from '../../../docs/fixtures/qcfixer-tests-seed.csv?raw';
import { readTemplateCsv } from '@/lib/importRules';
import type { Result } from '../types';
import { createSeed, deriveSteps } from './seed';

const db = createSeed();
const qc = db.projects.find((p) => p.name === 'qcfixer.com')!;
const run = (n: number) => db.runs.find((r) => r.number === n)!;
const resultsOf = (n: number) => db.results.filter((r) => r.runId === run(n).id);
const test = (displayId: string) => db.tests.find((t) => t.testId === displayId)!;
const displayId = (testId: string) => db.tests.find((t) => t.id === testId)!.testId;
const resultFor = (n: number, id: string) => resultsOf(n).find((r) => r.testId === test(id).id)!;
const runNumberOf = (r: Result) => db.runs.find((x) => x.id === r.runId)!.number;

describe('Slice 0 acceptance', () => {
  it('has 83 tests in 12 suites plus 2 Not in a suite', () => {
    const tests = db.tests.filter((t) => t.projectId === qc.id && t.location === 'suites'); // the library (BR-EXPLORE-07)
    expect(db.suites.filter((s) => s.projectId === qc.id)).toHaveLength(12);
    expect(tests.filter((t) => t.suiteId !== null)).toHaveLength(83);
    expect(tests.filter((t) => t.suiteId === null).map((t) => t.testId)).toEqual(['T-01', 'T-02']);
  });

  it("Run #12 computes to 72 passed / 8 failed / 3 couldn't complete, $3.47", () => {
    const r12 = run(12);
    expect(r12.testIds).toHaveLength(83);
    expect(countRunStatuses(r12.testIds, resultsOf(12))).toEqual({ passed: 72, failed: 8, couldnt_complete: 3, not_run: 0 });
    expect(r12.cost).toBe(3.47);
    expect(passRate({ passed: 72, failed: 8 })).toBeCloseTo(0.9);
  });
});

describe('sample data matches docs/07', () => {
  it('Run #12 non-passed results and Worth a look', () => {
    const nonPassed = resultsOf(12)
      .filter((r) => r.status !== 'passed')
      .map((r) => `${displayId(r.testId)}:${r.reason}`)
      .sort();
    expect(nonPassed).toEqual(
      [
        'ABT-03:product_bug',
        'FTR-04:product_bug',
        'PRT-01:product_bug',
        'CNT-04:needs_confirmation',
        'NWS-02:test_case_unclear',
        'CONS-02:test_case_unclear',
        'PRT-02:blocked',
        'PRT-03:blocked',
        'FTR-02:ai_couldnt_finish',
        'GEN-02:ai_couldnt_finish',
        'WA-02:environment_down',
      ].sort(),
    );
    const worth = resultsOf(12).filter((r) => r.flags.worthALook).map((r) => displayId(r.testId)).sort();
    expect(worth).toEqual(['CNT-03', 'CNT-04', 'GEN-02']);
  });

  it('Run #13 is interrupted at 34/83: 31 / 3 / 49 not run, $1.12', () => {
    const r13 = run(13);
    expect(r13.state).toBe('interrupted');
    expect(r13.progress).toMatchObject({ done: 34, total: 83 });
    expect(countRunStatuses(r13.testIds, resultsOf(13))).toEqual({ passed: 31, failed: 3, couldnt_complete: 0, not_run: 49 });
    expect(r13.cost).toBe(1.12);
  });

  it('Run #14 is running 09 Contact Us, on test 3 of 4 (CNT-03)', () => {
    const r14 = run(14);
    expect(r14.state).toBe('running');
    expect(r14.progress).toEqual({ done: 2, total: 4, currentTestId: test('CNT-03').id });
    expect(r14.finishedAt).toBeUndefined();
  });

  it('runs are numbered 1–14 without gaps, in date order', () => {
    const sorted = [...db.runs].sort((a, b) => a.number - b.number);
    expect(sorted.map((r) => r.number)).toEqual(Array.from({ length: 14 }, (_, i) => i + 1));
    for (let i = 1; i < sorted.length; i++) expect(sorted[i]!.startedAt > sorted[i - 1]!.startedAt).toBe(true);
  });

  it('CNT-04: v2, no valid script, full evidence and history', () => {
    const cnt04 = test('CNT-04');
    expect(cnt04.version).toBe(2);
    const csvRow = readTemplateCsv(seedCsv).rows.find((r) => r.task_id === 'CNT-04')!;
    expect(cnt04.expectedResult).toBe(csvRow.expected_result); // original expected result (D28)
    expect(cnt04.script.state).toBe('failed_ai');
    const r = resultFor(12, 'CNT-04');
    expect(r.steps).toHaveLength(3);
    expect(r.steps.map((s) => s.status)).toEqual(['passed', 'failed', 'not_run']);
    expect(r.failure).toEqual({ stepIndex: 2, expected: 'tel: link', found: 'https://wa.link/mgz96d' });
    expect(r.steps[1]!.actions.map((a) => a.raw)).toEqual(['click(index=218)', 'evaluate(...)']);
    expect(r.cost).toBe(0.07);
    expect(r.durationMs).toBe(174_000);
    const history = db.results
      .filter((x) => x.testId === cnt04.id)
      .map((x) => `#${runNumberOf(x)} v${x.testVersion} ${x.status}${x.overrides?.length ? ' (overridden)' : ''}`);
    expect(history).toEqual(['#5 v1 couldnt_complete', '#8 v1 passed (overridden)', '#11 v2 failed', '#12 v2 failed']);
  });

  it('CNT-03: v3 with test data and a reset script; ran on v2 in #12', () => {
    const cnt03 = test('CNT-03');
    expect(cnt03.version).toBe(3);
    expect(cnt03.script.state).toBe('reset');
    expect(resultFor(12, 'CNT-03').testVersion).toBe(2);
    expect(cnt03.testData?.rows.map((r) => r.variedField ?? 'recorded')).toEqual(['recorded', 'email', 'email', 'name', 'topic']);
    // BR-TEST-03: every field is a {placeholder} in the steps
    for (const f of cnt03.testData!.fields) expect(cnt03.steps.join(' ')).toContain(`{${f.name}}`);
  });

  it('NAV-01: 3 changed areas at step 2 in #12, compared with the previous UAT replay (#9)', () => {
    const r = resultFor(12, 'NAV-01');
    expect(r.flags.visualChanges).toBe(3);
    expect(r.steps[1]!.visual).toMatchObject({ previousScreenshotId: 'shot-9-nav-01-2', changedAreas: 3 });
    // D64: where they changed — the hero word, counters and carousel, later ignored at the same places
    expect(r.steps[1]!.visual!.changedRegions).toHaveLength(3);
    const ignored = db.tests.find((t) => t.testId === 'NAV-01')!.visual.ignoreAreas.map((a) => a.rect);
    expect(r.steps[1]!.visual!.changedRegions!.map((g) => ({ x: g.x, y: g.y, width: g.w, height: g.h }))).toEqual(ignored);
    expect(test('NAV-01').visual.ignoreAreas.map((a) => a.label)).toEqual(['Hero rotating word', 'Statistics counters', 'Team carousel']);
  });

  it('PRT-02 and PRT-03 are Blocked by PRT-01', () => {
    expect(resultFor(12, 'PRT-02').steps[0]!.aiReasoning).toContain('PRT-01');
    expect(resultFor(12, 'PRT-03').steps[0]!.aiReasoning).toContain('PRT-01');
  });

  it('second project has no runs; chats include a running one and a cases card with the 5 tray cases', () => {
    const hrms = db.projects.find((p) => p.id !== qc.id)!;
    expect(db.runs.filter((r) => r.projectId === hrms.id)).toHaveLength(0);
    expect(db.chats.some((c) => c.running)).toBe(true);
    const card = db.chats[0]!.messages.find((m) => m.kind === 'cases');
    if (card?.kind !== 'cases') throw new Error('cases card missing');
    expect(card.testIds.map((id) => db.tests.find((t) => t.id === id)!.location)).toEqual(['tray', 'tray', 'tray', 'tray', 'tray']);
  });
});

describe('sample data follows the business rules', () => {
  it('every result step list is non-empty and step indexes run 1..n', () => {
    for (const r of db.results) {
      expect(r.steps.length).toBeGreaterThan(0);
      expect(r.steps.map((s) => s.index)).toEqual(r.steps.map((_, i) => i + 1));
    }
  });

  it('BR-REASON-01/02/03: every failed or couldn\'t-complete result has one matching reason; passed has none', () => {
    const failReasons = ['product_bug', 'needs_confirmation', 'test_data_problem', 'test_case_unclear', 'blocked'];
    const ccReasons = ['environment_down', 'service_problem', 'ai_couldnt_finish'];
    for (const r of db.results) {
      if (r.status === 'failed') expect(failReasons).toContain(r.reason);
      else if (r.status === 'couldnt_complete') expect(ccReasons).toContain(r.reason);
      else expect(r.reason).toBeUndefined();
    }
  });

  it('BR-STATUS-05: overrides keep the AI verdict', () => {
    const overridden = db.results.filter((r) => r.overrides?.length);
    expect(overridden.length).toBeGreaterThan(0);
    for (const r of overridden) {
      expect(r.status).toBe(r.overrides!.at(-1)!.status);
      expect(r.aiVerdict.status).not.toBe(r.status);
    }
  });

  it('BR-SCRIPT-01 / BR-EXPLORE-06: every recorded script comes from a passing AI run, or from AI explore validation', () => {
    for (const t of db.tests.filter((x) => x.script.state === 'recorded')) {
      if (t.source === 'ai_explore' && !t.script.fromRunId) continue; // validated in AI explore
      const from = db.results.find((r) => r.runId === t.script.fromRunId && r.testId === t.id);
      expect(from?.mode).toBe('ai');
      expect(from?.aiVerdict.status).toBe('passed');
    }
  });

  it('BR-STATUS-01: every test has a latest status; tests that never ran are Not run', () => {
    const latestOf = (id: string) =>
      latestStatus(db.results.filter((r) => r.testId === test(id).id).map((r) => ({ status: r.status, runNumber: runNumberOf(r) })));
    expect(latestOf('T-01')).toBe('not_run');
    expect(latestOf('T-02')).toBe('not_run');
    expect(latestOf('CNT-04')).toBe('failed');
    expect(latestOf('SVC-17')).toBe('failed'); // #13 is newer than #12
  });

  it('BR-EXPLORE-05: T-02 (Needs fixing) is Not run with a "Needs fixing" badge and points to its cases card', () => {
    const t02 = test('T-02');
    const hasRun = db.results.some((r) => r.testId === t02.id);
    expect(hasRun).toBe(false); // never counted as failed
    expect(showsNeedsFixingBadge(t02, hasRun)).toBe(true);
    const o = t02.aiOrigin!;
    const msg = db.chats.find((c) => c.id === o.chatId)!.messages[o.messageIndex];
    if (msg?.kind !== 'cases') throw new Error('aiOrigin does not point to a cases card');
    expect(msg.testIds).toContain(t02.id);
    expect(showsNeedsFixingBadge(test('T-01'), false)).toBe(false); // Checked: no badge
  });

  it('D65: every test has a location; the library is the 83 CSV tests + T-01/T-02; 5 AI cases wait in the tray', () => {
    const qcTests = db.tests.filter((t) => t.projectId === qc.id);
    expect(qcTests.every((t) => ['tray', 'suites', 'discarded'].includes(t.location))).toBe(true);
    expect(qcTests.filter((t) => t.location === 'suites')).toHaveLength(85);
    const tray = qcTests.filter((t) => t.location === 'tray');
    expect(tray.map((t) => [t.title, t.aiValidationStatus])).toEqual([
      ['Contact form blocks empty submission', 'checked'],
      ['Contact form accepts a valid enquiry', 'checked'],
      ['Form keeps entered values after an error', 'not_checked'],
      ['Office address opens a map', 'needs_fixing'],
      ['Opening hours are shown', 'not_checked'],
    ]);
    expect(tray.every((t) => t.testId === '' && t.source === 'ai_explore' && !t.isNew)).toBe(true); // no display ID until moved
    expect(tray[0]!.duplicateOf).toBe(test('CNT-02').id);
    expect(tray[4]!.steps).toEqual([]); // "Missing: steps"
    // BR-EXPLORE-06: Checked cases keep their script; the others have none.
    expect(tray.map((t) => t.script.state)).toEqual(['recorded', 'recorded', 'none', 'none', 'none']);
  });

  it('D65: chat cases cards point to real AI cases; moved ones are library tests', () => {
    const cards = db.chats.flatMap((c) => c.messages.flatMap((m) => (m.kind === 'cases' ? [m] : [])));
    const ids = cards.flatMap((m) => m.testIds);
    for (const id of ids) expect(db.tests.find((t) => t.id === id)?.source).toBe('ai_explore');
    const moved = ids.map((id) => db.tests.find((t) => t.id === id)!).filter((t) => t.location === 'suites');
    expect(moved.map((t) => t.testId)).toEqual(['T-01', 'T-02']);
    expect(moved.every((t) => t.isNew && t.suiteId === null && t.locationChange?.by)).toBe(true);
  });

  it('Prod runs contain only read-only tests (no form submissions or data entry)', () => {
    // A test writes data if a step clicks submit, fills/types into a field or form, or signs up / registers / uploads / orders.
    const writesData = (steps: string[]) =>
      steps.some(
        (s) =>
          /\bclick[^.]*\bsubmit/i.test(s) ||
          /\b(fill|put|type|enter)\b[^.]*\b(field|form)\b/i.test(s) ||
          /\b(sign up|register|upload|subscribe|check ?out|place an order|book)\b/i.test(s),
      );
    // The check is not vacuous: it catches the Contact Us form tests.
    expect(writesData(test('CNT-02').steps)).toBe(true);
    expect(writesData(test('CNT-03').steps)).toBe(true);
    expect(writesData(test('NAV-01').steps)).toBe(false);

    const prodEnvIds = qc.environments.filter((e) => e.name === 'Prod').map((e) => e.id);
    const prodRuns = db.runs.filter((r) => prodEnvIds.includes(r.environmentId));
    expect(prodRuns.map((r) => r.number)).toEqual([7]);
    for (const r of prodRuns) {
      const writers = r.testIds.filter((id) => writesData(db.tests.find((t) => t.id === id)!.steps)).map(displayId);
      expect(writers, `Run #${r.number} on Prod includes data-writing tests`).toEqual([]);
    }
  });

  it('D27: every run has a viewport (1920×1080)', () => {
    for (const r of db.runs) expect(r.viewport).toEqual({ width: 1920, height: 1080 });
  });

  it('BR-RUN-02: tests run by script in #12 are exactly those with a recorded script', () => {
    for (const r of resultsOf(12)) {
      const scriptRecordedBefore = db.results.some(
        (x) => x.testId === r.testId && x.mode === 'ai' && x.aiVerdict.status === 'passed' && runNumberOf(x) < 12 && x.testVersion === r.testVersion,
      );
      expect(r.mode).toBe(modeFor({ scriptState: scriptRecordedBefore ? 'recorded' : 'none', hasTestData: false }, false));
    }
  });

  it('BR-RUN-05: run cost is the sum of its result costs', () => {
    for (const r of db.runs) {
      const costs = db.results.filter((x) => x.runId === r.id).map((x) => x.cost);
      expect(r.cost).toBe(sumCost(costs));
    }
  });

  it('BR-VISUAL-01: only script replays have visual comparisons', () => {
    for (const r of db.results.filter((x) => x.mode !== 'script')) {
      expect(r.steps.every((s) => !s.visual)).toBe(true);
    }
  });

  it('BR-TEST-01: test IDs are unique and use the suite prefix, or "T-" when not in a suite', () => {
    const library = db.tests.filter((t) => t.location === 'suites'); // tray cases get an ID when moved (D65)
    expect(new Set(library.map((t) => t.testId)).size).toBe(library.length);
    for (const t of library) {
      const prefix = t.suiteId ? db.suites.find((s) => s.id === t.suiteId)!.idPrefix : 'T';
      expect(t.testId.startsWith(`${prefix}-`)).toBe(true);
    }
  });

  it('BR-ENV-02: every run environment has a URL for the Customer website', () => {
    const customer = qc.apps.find((a) => a.name === 'Customer website')!;
    for (const r of db.runs) expect(customer.urls[r.environmentId]).toBeTruthy();
  });
});

describe('deriveSteps (AI-derived steps, simulated)', () => {
  it('splits sentences but not an ellipsis', () => {
    expect(deriveSteps("Open it. Check 'WE BRING YOUR ... TO LIFE' is visible. Report it.")).toEqual([
      'Open it.',
      "Check 'WE BRING YOUR ... TO LIFE' is visible.",
      'Report it.',
    ]);
  });
});

describe('knowledge and accounts sample data (Slice 3)', () => {
  it('scopes point at existing suites and tests', () => {
    for (const k of db.knowledge) {
      if (k.scope.kind === 'suite') expect(db.suites.some((s) => s.id === (k.scope as { suiteId: string }).suiteId)).toBe(true);
      if (k.scope.kind === 'test') expect(db.tests.some((t) => t.id === (k.scope as { testId: string }).testId)).toBe(true);
    }
  });
  it('documents have a type, skills a kind and where they are used', () => {
    expect(db.knowledge.filter((k) => k.kind === 'document').every((k) => k.docType && !k.skillKind)).toBe(true);
    expect(db.knowledge.filter((k) => k.kind === 'skill').every((k) => k.skillKind && (k.usedBy?.length ?? 0) > 0)).toBe(true);
  });
  it('every account with hasPassword has a stored password, and no other passwords exist', () => {
    expect(Object.keys(db.accountPasswords).sort()).toEqual(db.accounts.filter((a) => a.hasPassword).map((a) => a.id).sort());
  });
  it('BR-ENV-03: account role + app + environment is unique', () => {
    const keys = db.accounts.map((a) => `${a.projectId}|${a.role.toLowerCase()}|${a.appId}|${a.environmentId}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it('AI explore plans only cite knowledge that exists', () => {
    const ids = new Set(db.knowledge.map((k) => k.id));
    for (const c of db.chats) for (const m of c.messages) if (m.kind === 'plan') expect(m.usedKnowledge.every((id) => ids.has(id))).toBe(true);
  });
});

describe('BR-ENV-04 run environment snapshot', () => {
  it('every run stores its environment name and the app URLs it used', () => {
    for (const r of db.runs) {
      const env = qc.environments.find((e) => e.id === r.environmentId)!;
      expect(r.environment.name).toBe(env.name);
      expect(r.environment.apps).toEqual(qc.apps.map((a) => ({ appId: a.id, name: a.name, url: a.urls[r.environmentId] ?? null })));
    }
    expect(run(7).environment).toMatchObject({ name: 'Prod', apps: [{ name: 'Customer website', url: 'https://www.qcfixer.com' }, { name: 'Admin portal', url: null }] });
  });
});

describe('D46 result test snapshots', () => {
  it('every result records the display ID and title the test had when it ran', () => {
    for (const r of db.results) {
      const t = db.tests.find((x) => x.id === r.testId)!;
      expect(r.testSnapshot.testId).toBe(t.testId);
      expect(typeof r.testSnapshot.title).toBe('string');
    }
  });
});
