import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import * as api from './api';
import { getDb, resetMockDb, setMockLatency } from './mock/store';
import { buildSuiteTree } from '@/lib/suiteRules';

const P = 'p-qcfixer';
const TRAY = ['t-ai-c1-1', 't-ai-c1-2', 't-ai-c1-3', 't-ai-c1-4', 't-ai-c1-5'];
const advanced = { headless: false, parallel: false, workers: 2, maxAiSteps: 40, maxActionsPerStep: 10 };
const runOptions = (testIds: string[]) => ({ projectId: P, testIds, environmentId: 'env-uat', browsers: ['chrome' as const], model: 'gpt-4.1', forceAi: false, advanced });

beforeAll(() => {
  setMockLatency(0);
  api.setRunSpeedForTests(5);
  api.setAiTurnDelayForTests(30);
});
beforeEach(() => resetMockDb());
afterEach(async () => {
  for (const r of getDb().runs) if (r.state === 'running') await api.stopRun(r.id);
});

/** BR-EXPLORE-07 / D65: AI cases in Ready for Suites or discarded never appear in Suites, runs or counts. */
describe('library only: tray and discarded tests never appear in Suites, runs or counts', () => {
  const notLibrary = async () => {
    await api.discardCases(['t-ai-c1-3']); // one discarded, four still in the tray
    return TRAY;
  };

  it('listLibraryTests (every Suites list and filter)', async () => {
    const hidden = await notLibrary();
    const all = await api.listLibraryTests(P);
    expect(all).toHaveLength(85);
    expect(all.some((t) => hidden.includes(t.id))).toBe(false);
    for (const latestStatus of ['passed', 'failed', 'couldnt_complete', 'not_run'] as const) {
      expect((await api.listLibraryTests(P, { latestStatus })).some((t) => hidden.includes(t.id))).toBe(false);
    }
    expect((await api.listLibraryTests(P, { search: 'contact form' })).some((t) => hidden.includes(t.id))).toBe(false);
  });

  it('Suites tree and counts: 85 tests (83 in 12 suites + 2 Not in a suite)', async () => {
    await notLibrary();
    const [suites, tests] = await Promise.all([api.listSuites(P), api.listLibraryTests(P)]);
    const tree = buildSuiteTree(suites, tests, () => 'not_run', { search: '', status: 'all' });
    expect(tree.reduce((n, g) => n + g.tests.length, 0)).toBe(85);
    expect(tree.at(-1)!.tests.map((t) => t.testId)).toEqual(['T-01', 'T-02']);
  });

  it('latest results, run picker (planRun), run start and "All tests" scope', async () => {
    const hidden = await notLibrary();
    const latest = await api.listLatestResults(P);
    expect(Object.keys(latest).some((id) => hidden.includes(id))).toBe(false);
    await expect(api.planRun(['t-ai-c1-1'], { forceAi: false, browsers: ['chrome'] })).rejects.toBeInstanceOf(api.NotFoundError);
    await expect(api.startRun(runOptions(['t-cnt-01', 't-ai-c1-2']))).rejects.toBeInstanceOf(api.NotFoundError);
    const all = (await api.listLibraryTests(P)).map((t) => t.id);
    const run = await api.startRun(runOptions(all));
    expect(run.scopeLabel).toBe('All tests');
    expect(run.progress.total).toBe(85);
    expect(run.testIds.some((id) => hidden.includes(id))).toBe(false);
  });

  it('library actions refuse AI cases that are not in the library', async () => {
    await notLibrary();
    await expect(api.cloneTests(['t-ai-c1-1'])).rejects.toBeInstanceOf(api.NotFoundError);
    await expect(api.moveTests(['t-ai-c1-1'], null)).rejects.toBeInstanceOf(api.NotFoundError);
    await expect(api.markKnownIssue(['t-ai-c1-3'], {})).rejects.toBeInstanceOf(api.NotFoundError);
  });

  it('test IDs: the next T- ID ignores AI cases without one', async () => {
    const [copy] = await api.cloneTests(['t-t-01']);
    expect(copy!.testId).toBe('T-03');
  });

  it('screens and components never read tray or discarded cases outside AI explore (source check)', () => {
    const root = join(__dirname, '..');
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f)) files.push(p);
      }
    };
    walk(join(root, 'screens'));
    walk(join(root, 'components'));
    walk(join(root, 'app'));
    const offenders = files.filter((f) => !f.includes('3-4-ai-explore') && /\b(listTrayCases|listDiscardedCases)\b/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
    // There is no other way to list tests: the old listTests is gone.
    expect('listTests' in api).toBe(false);
  });
});

describe('Ready for Suites (BR-EXPLORE-04/05/08/09)', () => {
  it('lists the 5 tray cases; discarded ones only under Show discarded', async () => {
    expect((await api.listTrayCases(P)).map((t) => t.id)).toEqual(TRAY);
    await api.discardCases(['t-ai-c1-3', 't-ai-c1-4']);
    expect((await api.listTrayCases(P)).map((t) => t.id)).toEqual(['t-ai-c1-1', 't-ai-c1-2', 't-ai-c1-5']);
    const discarded = await api.listDiscardedCases(P);
    expect(discarded.map((t) => t.id)).toEqual(['t-ai-c1-3', 't-ai-c1-4']);
    expect(discarded[0]!.locationChange).toMatchObject({ by: 'Jia Yin' }); // record kept with who and when
    await api.restoreToTray(['t-ai-c1-4']);
    const restored = (await api.listTrayCases(P)).find((t) => t.id === 't-ai-c1-4')!;
    expect(restored.aiValidationStatus).toBe('needs_fixing'); // keeps its validation status
  });

  it('Move to Suites: Not in a suite, T- IDs, New, who/when; blocked cases are reported', async () => {
    await api.resolveDuplicate('t-ai-c1-1', 'keep_both');
    const r = await api.moveToSuites(['t-ai-c1-1', 't-ai-c1-2', 't-ai-c1-5']);
    expect(r.moved.map((t) => [t.title, t.testId, t.suiteId, t.isNew, t.location])).toEqual([
      ['Contact form blocks empty submission', 'T-03', null, true, 'suites'],
      ['Contact form accepts a valid enquiry', 'T-04', null, true, 'suites'],
    ]);
    expect(r.moved[0]!.locationChange?.by).toBe('Jia Yin');
    expect(r.blocked).toEqual([{ testId: 't-ai-c1-5', title: 'Opening hours are shown', reasons: ['Missing: steps'] }]);
    expect(await api.listLibraryTests(P)).toHaveLength(87);
    expect((await api.listTrayCases(P)).map((t) => t.id)).toEqual(['t-ai-c1-3', 't-ai-c1-4', 't-ai-c1-5']);
    // Checked cases keep their script (BR-EXPLORE-06); version 1 starts in the library
    expect(r.moved[0]!.script.state).toBe('recorded');
    expect(r.moved[0]!.version).toBe(1);
  });

  it('an unresolved duplicate cannot move', async () => {
    const r = await api.moveToSuites(['t-ai-c1-1']);
    expect(r.moved).toEqual([]);
    expect(r.blocked[0]!.reasons).toEqual(['Possible duplicate: choose Keep both, Replace existing or Discard']);
  });

  it('Replace existing updates the library test like an import Update; Undo gives it back', async () => {
    const before = await api.getTest('t-cnt-02');
    await api.resolveDuplicate('t-ai-c1-1', 'replace');
    const r = await api.moveToSuites(['t-ai-c1-1']);
    expect(r.replaced.map((t) => [t.testId, t.title, t.version])).toEqual([['CNT-02', 'Contact form blocks empty submission', before.version + 1]]);
    expect(r.replaced[0]!.steps).toEqual(["Click 'Contact Us' in the header.", 'Click submit without filling any field.']);
    const c = await api.getTest('t-ai-c1-1');
    expect(c.location).toBe('discarded');
    expect(c.locationChange?.replacedTestId).toBe('t-cnt-02');
    expect(await api.listLibraryTests(P)).toHaveLength(85); // the case is not a library test of its own
    expect((await api.listDiscardedCases(P)).map((t) => t.id)).not.toContain('t-ai-c1-1');
    await api.restoreToTray(['t-ai-c1-1']);
    expect(await api.getTest('t-cnt-02')).toEqual(before);
    expect((await api.getTest('t-ai-c1-1')).location).toBe('tray');
  });

  it('Undo of Move to Suites puts the cases back in the tray', async () => {
    const r = await api.moveToSuites(['t-ai-c1-2']);
    await api.restoreToTray(r.moved.map((t) => t.id));
    const c = await api.getTest('t-ai-c1-2');
    expect([c.location, c.testId, c.isNew]).toEqual(['tray', '', false]);
    expect(await api.listLibraryTests(P)).toHaveLength(85);
  });

  it('Discard as a duplicate choice applies at once; Restore asks for a choice again', async () => {
    await api.resolveDuplicate('t-ai-c1-1', 'discard');
    expect((await api.getTest('t-ai-c1-1')).location).toBe('discarded');
    await api.restoreToTray(['t-ai-c1-1']);
    expect((await api.getTest('t-ai-c1-1')).duplicateChoice).toBeUndefined();
  });

  it('inline edit changes only the small fields; no version (BR-EXPLORE-08)', async () => {
    const c = await api.getTest('t-ai-c1-2');
    const saved = await api.updateTrayCase({ ...c, title: ' Valid enquiry is accepted ', expectedKeywords: 'Thank you', steps: ['changed'], preconditions: 'x' });
    expect(saved.title).toBe('Valid enquiry is accepted');
    expect(saved.expectedKeywords).toBe('Thank you');
    expect(saved.steps).toEqual(c.steps);
    expect(saved.preconditions).toBeUndefined();
    expect(saved.version).toBe(1);
  });
});

describe('AI explore chats (BR-EXPLORE-01/02, D66 simulated turn)', () => {
  const settle = () => new Promise((r) => setTimeout(r, 80));

  it('lists only this project’s chats, newest first', async () => {
    expect((await api.listChats(P)).map((c) => c.id)).toEqual(['chat-2', 'chat-1', 'chat-3']);
    expect(await api.listChats('p-hrms')).toEqual([]);
  });

  it('a new chat runs a simulated turn that writes 3 AI cases into the tray', async () => {
    const chat = await api.createChat(P, 'Explore the search on UAT');
    expect(chat.running).toBe(true);
    expect(chat.title).toBe('Explore the search on UAT');
    await expect(api.sendChatMessage(chat.id, 'again')).rejects.toBeInstanceOf(api.AiTurnRunningError); // one turn at a time
    await settle();
    const done = await api.getChat(chat.id);
    expect(done.running).toBe(false);
    expect(done.messages.map((m) => m.kind)).toEqual(['user', 'ai', 'cases']);
    const card = done.messages[2]!;
    if (card.kind !== 'cases') throw new Error('no cases card');
    expect(card.simulated).toBe(true);
    const cases = (await api.listTrayCases(P)).filter((t) => card.testIds.includes(t.id));
    expect(cases.map((t) => t.aiValidationStatus)).toEqual(['not_checked', 'needs_fixing', 'checked']);
    expect(cases[1]!.steps).toEqual([]); // Missing: steps
    expect(cases[2]!.duplicateOf).toBeTruthy(); // possible duplicate
    expect(cases.every((t) => t.aiOrigin?.chatId === chat.id && t.aiOrigin.messageIndex === 2)).toBe(true);
    expect(await api.listLibraryTests(P)).toHaveLength(85); // nothing reaches the library without Move to Suites
  });
});
