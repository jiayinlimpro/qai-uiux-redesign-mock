import type { TestCase } from '@/data/types';
import { browsersFor, planTest, preflight, scopeLabel, scopeTitle, scopeWithCount, visualSummary } from './runPlan';

const base = { id: 't1', version: 2, testData: undefined, browserPreference: undefined } as Pick<TestCase, 'id' | 'version' | 'script' | 'testData' | 'browserPreference'>;
const runNumber = (id: string) => ({ 'run-9': 9 })[id];
const opts = { forceAi: false, browsers: ['chrome' as const], runNumber };

describe('BR-RUN-02 planTest: mode and reason', () => {
  it('script replay when a valid script exists', () => {
    expect(planTest({ ...base, script: { state: 'recorded', fromRunId: 'run-9' } }, opts)).toMatchObject({ mode: 'script', reason: 'Valid script from run #9' });
    expect(planTest({ ...base, script: { state: 'recorded' } }, opts).reason).toBe('Valid script from AI explore');
  });
  it('AI run otherwise, with the reason', () => {
    expect(planTest({ ...base, script: { state: 'none' } }, opts)).toMatchObject({ mode: 'ai', reason: 'No script yet' });
    expect(planTest({ ...base, script: { state: 'reset' } }, opts).reason).toBe('Edited after last run (v2), script reset');
    expect(planTest({ ...base, script: { state: 'failed_ai' } }, opts).reason).toBe('Last AI run failed, so no valid script');
    expect(planTest({ ...base, script: { state: 'recorded', fromRunId: 'run-9' } }, { ...opts, forceAi: true })).toMatchObject({ mode: 'ai', reason: 'Force AI is on' });
  });
  it('data rows', () => {
    const testData = { fields: [], rows: [{ use: true }, { use: true }, { use: false }] } as unknown as TestCase['testData'];
    expect(planTest({ ...base, testData, script: { state: 'reset' } }, opts)).toMatchObject({ mode: 'data_rows', reason: '2 data rows: row 1 by AI, the others replay its script' });
  });
});

describe('D53 browsersFor / no allowed browser', () => {
  it('uses the dialog browsers the test allows; no preference allows all', () => {
    expect(browsersFor({ browserPreference: ['chrome', 'webkit'] }, ['chrome', 'firefox'])).toEqual(['chrome']);
    expect(browsersFor({}, ['firefox', 'chrome'])).toEqual(['chrome', 'firefox']);
  });
  it('none allowed → Not run with the reason', () => {
    expect(planTest({ ...base, script: { state: 'none' }, browserPreference: ['chrome', 'webkit'] }, { ...opts, browsers: ['firefox'] })).toMatchObject({
      browsers: [],
      notRunReason: 'No allowed browser selected (test allows Chrome, Safari)',
    });
  });
});

describe('scope', () => {
  const tests = [
    { id: 'a', suiteId: 's1', testId: 'CNT-01' },
    { id: 'b', suiteId: 's1', testId: 'CNT-02' },
    { id: 'c', suiteId: 's2', testId: 'FTR-01' },
    { id: 'd', suiteId: 's3', testId: 'NAV-01' },
  ];
  const suites = [
    { id: 's1', name: '09 Contact Us' },
    { id: 's2', name: '10 Footer' },
    { id: 's3', name: '01 Navigation' },
  ];
  it('names all suites, one suite, whole suites, one test, or a selection', () => {
    expect(scopeLabel(['a', 'b', 'c', 'd'], tests, suites)).toBe('All tests');
    expect(scopeLabel(['a', 'b'], tests, suites)).toBe('09 Contact Us');
    expect(scopeLabel(['a', 'b', 'c'], tests, suites)).toBe('2 suites');
    expect(scopeLabel(['b'], tests, suites)).toBe('CNT-02 only');
    expect(scopeLabel(['a', 'c'], tests, suites)).toBe('2 selected tests');
    expect(scopeTitle('09 Contact Us', 2, true)).toBe('Suite: 09 Contact Us · 2 tests');
    expect(scopeTitle('All tests', 4, false)).toBe('All tests · 4');
    expect(scopeWithCount('All tests', 85)).toBe('All tests · 85');
    expect(scopeWithCount('09 Contact Us', 1)).toBe('09 Contact Us · 1 test');
    expect(scopeWithCount('3 suites', 10)).toBe('3 suites · 10 tests');
    expect(scopeWithCount('CNT-04 only', 1)).toBe('CNT-04 only');
    expect(scopeWithCount('3 selected tests', 3)).toBe('3 selected tests');
  });
});

describe('BR-VISUAL-01 visualSummary', () => {
  it('counts replays compared and tests excluded', () => {
    const plans = [
      { testId: 'a', mode: 'script' as const, reason: 'Valid script from run #9', browsers: ['chrome' as const] },
      { testId: 'b', mode: 'script' as const, reason: 'Valid script from run #9', browsers: ['chrome' as const] },
      { testId: 'c', mode: 'ai' as const, reason: 'No script yet', browsers: ['chrome' as const] },
    ];
    const tests = [
      { id: 'a', visual: { excluded: false, ignoreAreas: [] } },
      { id: 'b', visual: { excluded: true, ignoreAreas: [] } },
      { id: 'c', visual: { excluded: false, ignoreAreas: [] } },
    ];
    expect(visualSummary(plans, tests)).toEqual({ compared: 1, excluded: 1 });
  });
});

describe('BR-RUN-09 preflight', () => {
  const project = {
    environments: [{ id: 'uat', name: 'UAT' }, { id: 'dev', name: 'Dev' }],
    platforms: [{ id: 'web', name: 'Customer website', urls: { uat: 'https://uat', dev: null } }],
  };
  const providers = [{ defaultModel: 'gpt-4.1', hasSecret: true, label: 'OpenAI' }];
  it('passes with a key, an offered model and URLs', () => {
    expect(preflight(project, 'uat', 'gpt-4.1', providers, ['gpt-4.1']).map((c) => c.status)).toEqual(['pass', 'pass', 'pass']);
  });
  it('warns for a platform without a URL; blocks a model no provider offers', () => {
    const checks = preflight(project, 'dev', 'old-model', providers, ['gpt-4.1']);
    expect(checks.map((c) => c.status)).toEqual(['block', 'warn', 'pass']);
    expect(checks[1]!.label).toBe('Customer website has no URL for Dev');
  });
});
