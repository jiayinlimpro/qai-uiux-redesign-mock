import * as api from './api';
import { getDb, resetMockDb, setMockLatency } from './mock/store';

const advanced = { headless: false, parallel: false, workers: 2, maxAiSteps: 40, maxActionsPerStep: 10 };
const waitFor = async (cond: () => boolean, ms = 4000) => {
  for (let t = 0; t < ms && !cond(); t += 10) await new Promise((r) => setTimeout(r, 10));
  return cond();
};

beforeAll(() => {
  setMockLatency(0);
  api.setRunSpeedForTests(5);
});
beforeEach(() => resetMockDb());
afterEach(async () => {
  for (const r of getDb().runs) if (r.state === 'running') await api.stopRun(r.id);
});

describe('listResults filters (BR-LIST-03)', () => {
  it('status, reason, mode, search, Worth a look', async () => {
    expect(await api.listResults('run-12')).toHaveLength(83);
    expect(await api.listResults('run-12', { status: 'failed' })).toHaveLength(8);
    expect((await api.listResults('run-12', { reason: 'ai_couldnt_finish' })).map((r) => r.testSnapshot.testId).sort()).toEqual(['FTR-02', 'GEN-02']);
    expect((await api.listResults('run-12', { status: 'failed', mode: 'ai' })).length).toBe(8);
    expect((await api.listResults('run-12', { search: 'cnt-0' })).length).toBe(4);
    expect((await api.listResults('run-12', { worthALook: true })).map((r) => r.testSnapshot.testId).sort()).toEqual(['CNT-03', 'CNT-04', 'GEN-02']);
  });
});

describe('overrideResult (BR-ACTION-01, BR-STATUS-05)', () => {
  it('needs reason + proof; replaces the status; keeps the AI verdict; stores who and when', async () => {
    await expect(api.overrideResult('res-12-cnt-04', { status: 'passed', reason: '', proofName: 'p.png' })).rejects.toThrow('Enter the reason.');
    await expect(api.overrideResult('res-12-cnt-04', { status: 'passed', reason: 'ok', proofName: '' })).rejects.toThrow('Add a proof file.');
    const r = await api.overrideResult('res-12-cnt-04', { status: 'passed', reason: 'PM confirmed', proofName: 'p.png' });
    expect(r.status).toBe('passed');
    expect(r.reason).toBeUndefined();
    expect(r.aiVerdict).toEqual({ status: 'failed', reason: 'needs_confirmation', confidence: 'high' });
    expect(r.overrides).toHaveLength(1);
    expect(r.overrides![0]).toMatchObject({ status: 'passed', reason: 'PM confirmed', proofName: 'p.png', by: 'Jia Yin' });
    expect((await api.listResults('run-12', { status: 'failed' })).length).toBe(7);
    // D62: a second override is added to the history; the newest applies.
    const again = await api.overrideResult('res-12-cnt-04', { status: 'failed', reason: 'PM changed their mind', proofName: 'q.png' });
    expect(again.overrides!.map((o) => o.status)).toEqual(['passed', 'failed']);
    expect(again.status).toBe('failed');
    expect(again.reason).toBe('needs_confirmation');
    expect((await api.listResults('run-12', { status: 'failed' })).length).toBe(8);
  });
});

describe('markKnownIssue (BR-ACTION-02, BR-STATUS-06)', () => {
  it('marks tests with who and when; no new version; results keep their status', async () => {
    const [t] = await api.markKnownIssue(['t-abt-03'], { note: ' Reported ', ticketRef: 'CU-1' });
    expect(t!.knownIssue).toMatchObject({ note: 'Reported', ticketRef: 'CU-1', by: 'Jia Yin' });
    expect(t!.version).toBe(1);
    expect((await api.getResult('res-12-abt-03')).status).toBe('failed');
  });
});

describe('buildBugReport (BR-ACTION-03)', () => {
  it('editable fields for a failed result', async () => {
    const r = await api.buildBugReport('res-12-cnt-04');
    expect(r).toMatchObject({
      title: 'Contact phone and email links: https://wa.link/mgz96d',
      expected: 'tel: link',
      actual: 'https://wa.link/mgz96d',
    });
    expect(r.environment).toMatch(/^UAT · Customer website · Chrome 1920×1080 · Run #12, 3 Nov 2026$/);
    expect(r.steps).toHaveLength(2);
    expect(r.screenshots.map((s) => s.stepIndex)).toEqual([1, 2]);
  });
  it('a visual change report names the previous run', async () => {
    const r = await api.buildBugReport('res-12-nav-01', { visualStepIndex: 2 });
    expect(r.expected).toBe('The page looks as it did in Run #9.');
    expect(r.actual).toMatch(/^3 areas changed at step 2/);
  });
});

describe('dismissVisualFlag (D59)', () => {
  it('Looks fine stores who and when, keeps the change, drops it from the count; Undo restores', async () => {
    const r = await api.dismissVisualFlag('res-12-nav-01', 2, true);
    expect(r.steps[1]!.visual).toMatchObject({ changedAreas: 3, dismissed: { by: 'Jia Yin' } });
    expect(r.flags.visualChanges).toBeUndefined();
    const u = await api.dismissVisualFlag('res-12-nav-01', 2, false);
    expect(u.steps[1]!.visual!.dismissed).toBeUndefined();
    expect(u.flags.visualChanges).toBe(3);
  });
});

describe('result evidence written when the result is created (D58)', () => {
  it('seed: steps source, actions with locators, URLs, AI thoughts, tokens, knowledge, logs', async () => {
    const cnt04 = await api.getResult('res-12-cnt-04');
    expect(cnt04.stepsSource).toBe('test'); // v2 has 3 numbered steps
    expect((await api.getResult('res-8-cnt-04')).stepsSource).toBe('ai_derived'); // v1 was one paragraph
    expect(cnt04.steps[1]!.actions[0]).toEqual({ text: "Found phone '+60123933860' on the page", raw: 'click(index=218)', locator: 'a[href="https://wa.link/mgz96d"]' });
    expect(cnt04.steps[1]!.url).toBe('https://uat.qcfixer.com/contact-us/');
    expect(cnt04.steps[1]!.aiThought).toMatch(/^Step 2 of 3/);
    expect(cnt04.steps[2]!.url).toBeUndefined(); // not run
    expect(cnt04.usage).toEqual({ inputTokens: 24500, outputTokens: 2625 });
    expect(cnt04.knowledgeUsed?.sort()).toEqual(['k-contact-frs', 'k-testing-rules', 'k-user-stories']);
    expect(cnt04.logs?.at(-1)?.text).toBe('Result: Failed (Needs confirmation)');
    const replay = await api.getResult('res-12-nav-02');
    expect(replay.mode).toBe('script');
    expect(replay.steps.every((s) => s.aiThought === undefined)).toBe(true); // a script replay has no AI
    expect(replay.usage).toEqual({ inputTokens: 0, outputTokens: 0 });
  });
  it('the mock engine writes the same evidence', async () => {
    const run = await api.startRun({ projectId: 'p-qcfixer', testIds: ['t-cnt-04'], environmentId: 'env-uat', browsers: ['chrome'], model: 'gpt-4.1', forceAi: false, advanced });
    expect(await waitFor(() => getDb().runs.find((r) => r.id === run.id)!.state === 'completed')).toBe(true);
    const [r] = await api.listResults(run.id);
    expect(r!.stepsSource).toBe('test');
    expect(r!.usage!.inputTokens).toBeGreaterThan(0);
    expect(r!.knowledgeUsed).toContain('k-contact-frs');
    expect(r!.logs![0]!.text).toBe('Started AI on Chrome 1920×1080 (UAT)');
    expect(r!.steps[0]!.url).toBe('https://uat.qcfixer.com/contact-us/');
  });
});
