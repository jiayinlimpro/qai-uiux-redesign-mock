import * as api from './api';
import { getDb, resetMockDb, setMockLatency } from './mock/store';

const advanced = { headless: false, parallel: false, workers: 2, maxAiSteps: 40, maxActionsPerStep: 10 };
const waitFor = async (cond: () => boolean, ms = 4000) => {
  for (let t = 0; t < ms && !cond(); t += 10) await new Promise((r) => setTimeout(r, 10));
  return cond();
};
const runState = (id: string) => getDb().runs.find((r) => r.id === id)!.state;

beforeAll(() => {
  setMockLatency(0);
  api.setRunSpeedForTests(5);
});
beforeEach(() => resetMockDb());
afterEach(async () => {
  for (const r of getDb().runs) if (r.state === 'running') await api.stopRun(r.id);
  api.setRunSpeedForTests(5);
});

describe('planRun (BR-RUN-02, D53)', () => {
  it('mode and reason per test', async () => {
    const plans = await api.planRun(['t-cnt-01', 't-cnt-03', 't-cnt-04', 't-t-01'], { forceAi: false, browsers: ['chrome'] });
    expect(plans.map((p) => [p.mode, p.reason])).toEqual([
      ['script', 'Valid script from run #5'], // its first passing AI run in the seed
      ['data_rows', '5 data rows: row 1 by AI, the others replay its script'],
      ['ai', 'Last AI run failed, so no valid script'],
      ['script', 'Valid script from AI explore'],
    ]);
  });
  it('Force AI turns replays into AI runs', async () => {
    const [p] = await api.planRun(['t-cnt-01'], { forceAi: true, browsers: ['chrome'] });
    expect(p).toMatchObject({ mode: 'ai', reason: 'Force AI is on' });
  });
});

describe('preflight (BR-RUN-09)', () => {
  it('warns for apps without a URL in the environment', async () => {
    await api.saveProvider({ kind: 'openai', label: 'OpenAI', defaultModel: 'gpt-4.1' }, { apiKey: 'k' });
    expect((await api.runPreflight('p-qcfixer', 'env-uat', 'gpt-4.1')).map((c) => c.status)).toEqual(['pass', 'pass', 'pass']);
    expect((await api.runPreflight('p-qcfixer', 'env-prod', 'gpt-4.1'))[1]).toMatchObject({ status: 'warn', label: 'Admin portal has no URL for Prod' });
  });
});

describe('a simulated run (BR-RUN-01/03/05, BR-SCRIPT-01)', () => {
  it('runs to completion with results, cost and a new run number', async () => {
    const run = await api.startRun({ projectId: 'p-qcfixer', testIds: ['t-cnt-01', 't-cnt-04', 't-t-02'], environmentId: 'env-uat', browsers: ['chrome', 'firefox'], model: 'gpt-4.1', forceAi: false, advanced });
    expect(run).toMatchObject({ number: 15, state: 'running', scopeLabel: '3 selected tests', environment: { name: 'UAT' } });
    expect(await waitFor(() => runState(run.id) === 'completed')).toBe(true);
    const results = await api.listResults(run.id);
    const by = (id: string) => results.find((r) => r.testId === id)!;
    expect(by('t-cnt-01')).toMatchObject({ mode: 'script', status: 'passed' });
    expect(by('t-cnt-01').perBrowser).toEqual([
      { browser: 'chrome', status: 'passed' },
      { browser: 'firefox', status: 'passed' },
    ]);
    expect(by('t-cnt-04')).toMatchObject({ mode: 'ai', status: 'failed', reason: 'needs_confirmation' }); // the app has not changed
    expect(by('t-cnt-04').perBrowser).toEqual([
      { browser: 'chrome', status: 'failed' },
      { browser: 'firefox', status: 'not_run' }, // BR-RUN-03
    ]);
    expect(by('t-t-02')).toMatchObject({ status: 'failed', reason: 'product_bug' }); // the run confirms the Likely bug
    const done = await api.getRun(run.id);
    expect(done.cost).toBeCloseTo(results.reduce((n, r) => n + r.cost, 0), 5);
    expect(done.progress.done).toBe(3);
  });
  it('a passing AI run records a script (BR-SCRIPT-01); data rows are rolled up', async () => {
    await api.stopRun('run-14'); // the seed's running run would otherwise run CNT-03 first
    const run = await api.startRun({ projectId: 'p-qcfixer', testIds: ['t-cnt-03'], environmentId: 'env-uat', browsers: ['chrome'], model: 'gpt-4.1', forceAi: false, advanced });
    await waitFor(() => runState(run.id) === 'completed');
    expect((await api.getTest('t-cnt-03')).script).toEqual({ state: 'recorded', fromRunId: run.id });
    expect((await api.listResults(run.id))[0]!.dataRows).toHaveLength(5);
  });
  it('no allowed browser → Not run with the reason (D53)', async () => {
    getDb().tests.find((t) => t.id === 't-nav-01')!.browserPreference = ['chrome', 'webkit'];
    const run = await api.startRun({ projectId: 'p-qcfixer', testIds: ['t-nav-01'], environmentId: 'env-uat', browsers: ['firefox'], model: 'gpt-4.1', forceAi: false, advanced });
    await waitFor(() => runState(run.id) === 'completed');
    expect((await api.listResults(run.id))[0]).toMatchObject({ status: 'not_run', note: 'No allowed browser selected (test allows Chrome, Safari)' });
  });
});

describe('controls (D54, D55, BR-RUN-10)', () => {
  it('pause, resume, stop; a stopped run cannot resume', async () => {
    api.setRunSpeedForTests(40);
    const run = await api.startRun({ projectId: 'p-qcfixer', testIds: ['t-nav-01', 't-nav-02', 't-nav-03', 't-nav-04'], environmentId: 'env-uat', browsers: ['chrome'], model: 'gpt-4.1', forceAi: false, advanced });
    await api.pauseRun(run.id);
    expect(runState(run.id)).toBe('paused');
    await api.resumeRun(run.id);
    expect(runState(run.id)).toBe('running');
    expect(await api.stopRun(run.id)).toMatchObject({ state: 'completed', stoppedAt: { total: 4 } });
    await api.resumeRun(run.id);
    expect(runState(run.id)).toBe('completed');
  });
  it('skip ends the running test as Not run, "Skipped by user"', async () => {
    api.setRunSpeedForTests(40);
    const run = await api.startRun({ projectId: 'p-qcfixer', testIds: ['t-cnt-04', 't-cnt-01'], environmentId: 'env-uat', browsers: ['chrome'], model: 'gpt-4.1', forceAi: false, advanced });
    await waitFor(() => Boolean(getDb().runs.find((r) => r.id === run.id)!.progress.currentTestId));
    await api.skipTest(run.id, 't-cnt-04');
    api.setRunSpeedForTests(5);
    await waitFor(() => runState(run.id) === 'completed');
    expect((await api.listResults(run.id)).find((r) => r.testId === 't-cnt-04')).toMatchObject({ status: 'not_run', note: 'Skipped by user' });
  });
  it('the interrupted run #13 resumes', async () => {
    await api.resumeRun('run-13');
    expect(runState('run-13')).toBe('running');
  });
});

describe('seed run #14 pace (07 Sample data)', () => {
  it('stays Running far longer than a normal run: 14 work ticks × 260', async () => {
    const before = (await api.getRun('run-14')).durationMs ?? 0; // getRun starts the engine
    await new Promise((r) => setTimeout(r, 300)); // ~60 timer ticks at 5 ms
    const run = getDb().runs.find((r) => r.id === 'run-14')!;
    expect(run.state).toBe('running');
    expect(run.durationMs).toBeGreaterThan(before); // elapsed time still counts
    expect(run.progress.done).toBe(2); // a normal run would have finished CNT-03 (5 work ticks) by now
  });
});
