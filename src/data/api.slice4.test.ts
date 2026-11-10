import * as api from './api';
import { resetMockDb, setMockLatency } from './mock/store';

beforeAll(() => setMockLatency(0));
beforeEach(() => resetMockDb());

describe('latest results and history (Slice 4)', () => {
  it('latest result per test comes from the highest run number; never-run tests are absent', async () => {
    const latest = await api.listLatestResults('p-qcfixer');
    const runNo = async (resultRunId: string) => (await api.getRun(resultRunId)).number;
    expect(await runNo(latest['t-cnt-04']!.runId)).toBe(12);
    expect(await runNo(latest['t-cnt-01']!.runId)).toBe(14); // done in the running run
    expect(await runNo(latest['t-svc-17']!.runId)).toBe(13);
    expect(latest['t-t-01']).toBeUndefined();
    expect(latest['t-t-02']).toBeUndefined();
  });
  it('history is newest first', async () => {
    const h = await api.getTestHistory('t-cnt-04');
    const numbers = await Promise.all(h.map(async (r) => (await api.getRun(r.runId)).number));
    expect(numbers).toEqual([12, 11, 8, 5]);
  });
  it('listTests filters by latest status', async () => {
    const failed = await api.listLibraryTests('p-qcfixer', { latestStatus: 'failed' });
    expect(failed.map((t) => t.testId).sort()).toEqual(['ABT-03', 'CNT-04', 'CONS-02', 'FTR-04', 'HOME-01', 'HOME-02', 'NWS-02', 'PRT-01', 'PRT-02', 'PRT-03', 'SVC-17']);
    expect((await api.listLibraryTests('p-qcfixer', { latestStatus: 'not_run' })).map((t) => t.testId)).toEqual(['T-01', 'T-02']);
  });
});

describe('saveTest rules (BR-VERSION-01, BR-SCRIPT-02, BR-DATA-07)', () => {
  it('Use toggle: no new version, no reset', async () => {
    const t = await api.getTest('t-cnt-03');
    const saved = await api.saveTest({ ...t, testData: { ...t.testData!, rows: t.testData!.rows.map((r) => (r.index === 5 ? { ...r, use: false } : r)) } });
    expect(saved.version).toBe(t.version);
  });
  it('rows 2+: new version, script kept', async () => {
    const nav = await api.getTest('t-nav-01');
    expect(nav.script.state).toBe('recorded');
    const t = await api.getTest('t-cnt-03');
    const saved = await api.saveTest({ ...t, testData: { ...t.testData!, rows: t.testData!.rows.filter((r) => r.index !== 5) } });
    expect(saved).toMatchObject({ version: 4, script: t.script });
  });
  it('steps on a recorded test: new version + script reset', async () => {
    const t = await api.getTest('t-nav-01');
    const saved = await api.saveTest({ ...t, steps: [...t.steps, 'Check the footer.'] });
    expect(saved).toMatchObject({ version: t.version + 1, script: { state: 'reset' } });
  });
  it('visual settings, New badge: no new version; callers cannot set version or script', async () => {
    const t = await api.getTest('t-t-01');
    const saved = await api.saveTest({ ...t, isNew: false, visual: { ...t.visual, excluded: true }, version: 99, script: { state: 'none' } });
    expect(saved).toMatchObject({ version: t.version, script: t.script, isNew: false, visual: { excluded: true } });
  });
  it('test IDs are unique within the project', async () => {
    const t = await api.getTest('t-cnt-03');
    await expect(api.saveTest({ ...t, testId: 'cnt-04' })).rejects.toBeInstanceOf(api.DuplicateTestIdError);
  });
});

describe('clone, move, delete (Slice 4)', () => {
  it('BR-CLONE: copies get the next IDs, same title, v1, clonedFromId', async () => {
    const copies = await api.cloneTests(['t-cnt-02', 't-cnt-04']);
    expect(copies.map((c) => c.testId)).toEqual(['CNT-05', 'CNT-06']);
    expect(copies[0]).toMatchObject({ title: (await api.getTest('t-cnt-02')).title, version: 1, source: 'clone', clonedFromId: 't-cnt-02', script: { state: 'none' } });
    expect((await api.getTestHistory(copies[0]!.id)).length).toBe(0);
  });
  it('clones in Not in a suite get T- IDs', async () => {
    expect((await api.cloneTests(['t-t-01']))[0]!.testId).toBe('T-03');
  });
  it('BR-TEST-05: moving renumbers T- tests only; references use the internal id', async () => {
    const cnt = (await api.listSuites('p-qcfixer')).find((s) => s.idPrefix === 'CNT')!;
    const moved = await api.moveTests(['t-t-01', 't-nav-02'], cnt.id);
    expect(moved.map((t) => t.testId)).toEqual(['CNT-05', 'NAV-02']);
    const chat = await api.getChat('chat-3');
    const card = chat.messages.find((m) => m.kind === 'cases');
    expect(card && card.kind === 'cases' && card.testIds[0]).toBe('t-t-01'); // internal id: shows CNT-05 now
    expect((await api.getTest('t-t-01')).suiteId).toBe(cnt.id);
  });
  it('deletes tests; their results stay in the runs', async () => {
    await api.deleteTests(['t-cnt-04']);
    await expect(api.getTest('t-cnt-04')).rejects.toBeInstanceOf(api.NotFoundError);
    expect((await api.listResults('run-12')).some((r) => r.testId === 't-cnt-04')).toBe(true);
  });
});

describe('suites (BR-SUITE)', () => {
  it('creates, renames and deletes an empty suite; refuses a non-empty one', async () => {
    const s = await api.createSuite('p-qcfixer', 'Login', 'LOG');
    const renamed = await api.renameSuite(s.id, 'Login and signup', 'LS');
    expect(renamed).toMatchObject({ name: 'Login and signup', idPrefix: 'LS' });
    await api.deleteSuite(s.id);
    await expect(api.deleteSuite('suite-1')).rejects.toBeInstanceOf(api.SuiteNotEmptyError);
  });
  it('rejects duplicate names and prefixes', async () => {
    const cnt = (await api.listSuites('p-qcfixer')).find((x) => x.idPrefix === 'CNT')!;
    await expect(api.createSuite('p-qcfixer', cnt.name.toUpperCase(), 'NEW')).rejects.toBeInstanceOf(api.InvalidSuiteError);
    await expect(api.createSuite('p-qcfixer', 'Other', 'CNT')).rejects.toBeInstanceOf(api.InvalidSuiteError);
  });
});

describe('suggest rows (BR-DATA-06, simulated)', () => {
  it('suggests generated rows that change one field, based on the suite FRS', async () => {
    const { rows, basedOn } = await api.suggestTestDataRows('t-cnt-03', ['boundary', 'equivalence']);
    expect(basedOn).toBe('Contact form FRS.pdf');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.generated && r.variedField)).toBe(true);
    const t = await api.getTest('t-cnt-03');
    const existing = t.testData!.rows.map((r) => JSON.stringify(r.values));
    expect(rows.some((r) => existing.includes(JSON.stringify(r.values)))).toBe(false); // no duplicates of existing rows
  });
});

describe('BR-TEST-06 delete with Undo and result snapshots', () => {
  it('deleting returns the tests; restore puts them back with their history', async () => {
    const removed = await api.deleteTests(['t-cnt-04']);
    expect(removed.map((t) => t.testId)).toEqual(['CNT-04']);
    const r12 = (await api.listResults('run-12')).find((r) => r.testId === 't-cnt-04')!;
    expect(r12.testSnapshot).toEqual({ testId: 'CNT-04', title: 'Contact phone and email links' });
    await api.restoreTests(removed);
    expect((await api.getTest('t-cnt-04')).testId).toBe('CNT-04');
    expect((await api.getTestHistory('t-cnt-04')).length).toBe(4);
  });
  it('a display ID taken meanwhile gets the next free one', async () => {
    const removed = await api.deleteTests(['t-cnt-04']);
    await api.cloneTests(['t-cnt-01']); // the copy takes the free CNT-04
    const [restored] = await api.restoreTests(removed);
    expect(restored!.testId).toBe('CNT-05');
  });
});
