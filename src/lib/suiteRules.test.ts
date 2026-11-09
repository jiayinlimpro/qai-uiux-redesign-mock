import type { Suite, TestCase } from '@/data/types';
import {
  buildSuiteTree,
  changeEffect,
  cloneTestCase,
  idAfterMove,
  latestComparison,
  deleteImpact,
  resultTestLabel,
  rowsUsingOldValue,
  followRecordedValue,
  nextTestId,
  placeholdersIn,
  rowsPassed,
  suggestPrefix,
  validateSuite,
  variedFields,
} from './suiteRules';

const test = (over: Partial<TestCase>): TestCase => ({
  id: over.id ?? `t-${over.testId?.toLowerCase()}`,
  projectId: 'p',
  suiteId: 's-cnt',
  testId: 'CNT-01',
  title: 'Title',
  steps: ['Open the page.'],
  linkedKnowledge: [],
  version: 1,
  source: 'import',
  isNew: false,
  script: { state: 'recorded', fromRunId: 'run-1' },
  visual: { excluded: false, ignoreAreas: [] },
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  ...over,
});
const suites: Suite[] = [
  { id: 's-ftr', projectId: 'p', name: '10 Footer', idPrefix: 'FTR' },
  { id: 's-cnt', projectId: 'p', name: '09 Contact Us', idPrefix: 'CNT' },
  { id: 's-nav', projectId: 'p', name: '01 Navigation', idPrefix: 'NAV' },
];

describe('BR-LIST-01 buildSuiteTree', () => {
  const tests = [
    test({ testId: 'CNT-10', title: 'Ten' }),
    test({ testId: 'CNT-02', title: 'Form blocks empty submission' }),
    test({ testId: 'FTR-01', suiteId: 's-ftr', title: 'Footer links' }),
    test({ testId: 'T-01', suiteId: null, title: 'Message field' }),
  ];
  const status = (id: string) => (id === 't-cnt-02' ? 'failed' : 'passed');
  it('orders suites by name, Not in a suite last, tests by ID (natural)', () => {
    const tree = buildSuiteTree(suites, tests, status, { search: '', status: 'all' });
    expect(tree.map((g) => g.name)).toEqual(['01 Navigation', '09 Contact Us', '10 Footer', 'Not in a suite']);
    expect(tree[1]!.tests.map((t) => t.testId)).toEqual(['CNT-02', 'CNT-10']);
  });
  it('hides an empty Not in a suite group', () => {
    expect(buildSuiteTree(suites, tests.slice(0, 3), status, { search: '', status: 'all' }).map((g) => g.name)).not.toContain('Not in a suite');
  });
  it('filters by ID or title and latest status; only groups with matches stay', () => {
    expect(buildSuiteTree(suites, tests, status, { search: 'form', status: 'all' }).map((g) => [g.name, g.tests.length, g.total])).toEqual([['09 Contact Us', 1, 2]]);
    expect(buildSuiteTree(suites, tests, status, { search: 'ftr-', status: 'all' }).map((g) => g.name)).toEqual(['10 Footer']);
    expect(buildSuiteTree(suites, tests, status, { search: '', status: 'failed' }).flatMap((g) => g.tests.map((t) => t.testId))).toEqual(['CNT-02']);
  });
});

describe('BR-TEST-01 nextTestId', () => {
  it('uses the prefix and the next free number', () => {
    expect(nextTestId('CNT', ['CNT-01', 'CNT-04', 'NAV-09'])).toBe('CNT-05');
    expect(nextTestId('T', [])).toBe('T-01');
    expect(nextTestId('NAV', ['NAV-15'])).toBe('NAV-16');
  });
});

describe('BR-CLONE cloneTestCase', () => {
  const original = test({
    testId: 'CNT-03',
    preconditions: 'None',
    expectedResult: 'Blocked',
    linkedKnowledge: ['k1'],
    testData: { fields: [{ name: 'email', type: 'text' }], rows: [{ id: 'r1', index: 1, values: { email: 'a' }, expected: 'accepted', use: true, generated: false }] },
    version: 3,
    script: { state: 'recorded', fromRunId: 'run-9' },
    visual: { excluded: true, ignoreAreas: [{ id: 'i', stepIndex: 1, label: 'Banner' }] },
    knownIssue: { note: 'x', markedAt: '2026' },
  });
  const copy = cloneTestCase(original, 't-new', 'CNT-05', '2026-11-09');
  it('copies template fields, test data and linked knowledge with the same title', () => {
    expect(copy).toMatchObject({ title: 'Title', preconditions: 'None', expectedResult: 'Blocked', linkedKnowledge: ['k1'], suiteId: 's-cnt', testId: 'CNT-05' });
    expect(copy.testData).toEqual(original.testData);
    expect(copy.testData).not.toBe(original.testData);
  });
  it('does not copy script, visual settings, known issue; starts at v1; records the original', () => {
    expect(copy).toMatchObject({ version: 1, source: 'clone', clonedFromId: original.id, script: { state: 'none' }, visual: { excluded: false, ignoreAreas: [] } });
    expect(copy.knownIssue).toBeUndefined();
  });
});

describe('BR-TEST-05 idAfterMove', () => {
  const cnt = { idPrefix: 'CNT' };
  it('renumbers T- tests into the destination prefix', () => {
    expect(idAfterMove({ testId: 'T-01' }, cnt, ['CNT-01', 'CNT-04'])).toBe('CNT-05');
  });
  it('keeps suite-prefixed IDs, and anything moved to Not in a suite', () => {
    expect(idAfterMove({ testId: 'NAV-02' }, cnt, ['CNT-01'])).toBe('NAV-02');
    expect(idAfterMove({ testId: 'T-01' }, null, [])).toBe('T-01');
  });
});

describe('BR-SUITE-01 validateSuite', () => {
  it('needs a unique name and a valid unique prefix that is not T', () => {
    expect(validateSuite({ name: 'Login', idPrefix: 'LOG' }, suites)).toEqual({});
    expect(validateSuite({ name: '09 contact us', idPrefix: 'CNT' }, suites)).toEqual({
      name: 'A suite with this name already exists.',
      idPrefix: 'Another suite uses this prefix.',
    });
    expect(validateSuite({ name: 'X', idPrefix: 'T' }, suites).idPrefix).toBe('"T" is used for tests not in a suite.');
    expect(validateSuite({ name: 'X', idPrefix: 'cnt1' }, suites).idPrefix).toBeDefined();
    expect(validateSuite({ name: '09 Contact Us', idPrefix: 'CNT' }, suites, 's-cnt')).toEqual({}); // renaming itself
  });
  it('suggests a prefix from the name', () => {
    expect(suggestPrefix('Login and Signup')).toBe('LAS');
    expect(suggestPrefix('Footer')).toBe('FOO');
  });
});

describe('BR-SCRIPT-02 / BR-DATA-07 changeEffect', () => {
  const td = {
    fields: [{ name: 'email', type: 'text' as const }],
    rows: [
      { id: 'r1', index: 1, values: { email: 'a@x.test' }, expected: 'accepted' as const, use: true, generated: false },
      { id: 'r2', index: 2, values: { email: 'bad' }, expected: 'rejected' as const, use: true, generated: false },
    ],
  };
  const base = test({ testData: td });
  const eff = (after: TestCase) => changeEffect(base, after);
  it('steps / expected result / fields / recorded row → new version + reset', () => {
    expect(eff({ ...base, steps: ['Other'] })).toMatchObject({ bumpVersion: true, resetScript: true, resetBecause: ['steps'] });
    expect(eff({ ...base, expectedResult: 'x' }).resetScript).toBe(true);
    expect(eff({ ...base, testData: { ...td, fields: [...td.fields, { name: 'name', type: 'text' }] } }).resetBecause).toEqual(['test data fields']);
    expect(eff({ ...base, testData: { ...td, rows: [{ ...td.rows[0]!, values: { email: 'b@x.test' } }, td.rows[1]!] } }).resetBecause).toEqual(['the recorded row']);
  });
  it('rows 2+, title, linked knowledge → new version, no reset', () => {
    expect(eff({ ...base, testData: { ...td, rows: [td.rows[0]!] } })).toEqual({ bumpVersion: true, resetScript: false, resetBecause: [] });
    expect(eff({ ...base, title: 'New title' })).toMatchObject({ bumpVersion: true, resetScript: false });
    expect(eff({ ...base, linkedKnowledge: ['k9'] })).toMatchObject({ bumpVersion: true, resetScript: false });
  });
  it('Use toggles, visual settings, known issue, New badge, move → nothing', () => {
    expect(eff({ ...base, testData: { ...td, rows: td.rows.map((r) => ({ ...r, use: false })) } })).toEqual({ bumpVersion: false, resetScript: false, resetBecause: [] });
    expect(eff({ ...base, visual: { excluded: true, ignoreAreas: [] }, isNew: true, suiteId: null, testId: 'X-1', knownIssue: { markedAt: 'x' } }).bumpVersion).toBe(false);
  });
});

describe('test data helpers', () => {
  it('BR-DATA-04 variedFields', () => {
    expect(variedFields({ values: { a: '1', b: '2' } }, { values: { a: '1', b: '3' } })).toEqual(['b']);
  });
  it('BR-STATUS-04 rowsPassed', () => {
    expect(rowsPassed({ dataRows: [{ rowId: 'a', status: 'passed' }, { rowId: 'b', status: 'failed' }] })).toEqual({ passed: 1, total: 2 });
    expect(rowsPassed({})).toBeNull();
  });
  it('BR-TEST-03 placeholdersIn', () => {
    expect(placeholdersIn(['Fill {name} and {email}', 'Choose {topic}, then {name}'])).toEqual(['name', 'email', 'topic']);
  });
});

describe('BR-VISUAL-02 latestComparison', () => {
  const step = (visual?: { changedAreas: number; previousScreenshotId?: string }) => ({ index: 1, text: 's', status: 'passed' as const, durationMs: 1, actions: [], ...(visual ? { visual } : {}) });
  const runs = [
    { id: 'r12', environmentId: 'uat' },
    { id: 'r9', environmentId: 'uat' },
    { id: 'r7', environmentId: 'prod' },
    { id: 'r1', environmentId: 'uat' },
  ];
  it('takes the newest replay with comparisons and the previous replay on the same environment', () => {
    const history = [
      { runId: 'r12', mode: 'script' as const, steps: [step({ changedAreas: 3, previousScreenshotId: 'x' })] },
      { runId: 'r7', mode: 'script' as const, steps: [step({ changedAreas: 0 })] },
      { runId: 'r9', mode: 'script' as const, steps: [step({ changedAreas: 0 })] },
      { runId: 'r1', mode: 'ai' as const, steps: [step()] },
    ];
    const c = latestComparison(history, runs)!;
    expect([c.run.id, c.previousRun?.id]).toEqual(['r12', 'r9']);
  });
  it('is null without replays', () => {
    expect(latestComparison([{ runId: 'r1', mode: 'ai' as const, steps: [step()] }], runs)).toBeNull();
  });
});

describe('BR-TEST-06 deleteImpact / resultTestLabel', () => {
  it('counts knowledge scoped to the test and its results', () => {
    const knowledge = [
      { kind: 'document' as const, scope: { kind: 'test', testId: 't1' } },
      { kind: 'document' as const, scope: { kind: 'test', testId: 't1' } },
      { kind: 'skill' as const, scope: { kind: 'test', testId: 't1' } },
      { kind: 'document' as const, scope: { kind: 'project' } },
    ];
    expect(deleteImpact('t1', knowledge, [{ testId: 't1' }, { testId: 't2' }])).toEqual({ documents: 2, skills: 1, results: 1 });
  });
  it('uses the current test while it exists, the snapshot after deletion', () => {
    const r = { testId: 't1', testSnapshot: { testId: 'T-01', title: 'Old title' } };
    expect(resultTestLabel(r, new Map([['t1', { testId: 'CNT-06', title: 'New title' }]]))).toEqual({ testId: 'CNT-06', title: 'New title', deleted: false });
    expect(resultTestLabel(r, new Map())).toEqual({ testId: 'T-01', title: 'Old title', deleted: true });
  });
});

describe('BR-DATA-08 row 1 changes follow into other rows', () => {
  const rows = [
    { id: 'r1', index: 1, values: { email: 'a@x', name: 'QA' }, expected: 'accepted' as const, use: true, generated: false },
    { id: 'r2', index: 2, values: { email: 'bad', name: 'QA' }, expected: 'rejected' as const, use: true, generated: false },
    { id: 'r3', index: 3, values: { email: 'a@x', name: '' }, expected: 'rejected' as const, use: true, generated: false },
  ];
  it('finds rows 2+ using the old value and updates only them', () => {
    expect(rowsUsingOldValue(rows, 'email', 'a@x').map((r) => r.id)).toEqual(['r3']);
    expect(rowsUsingOldValue(rows, 'name', 'QA').map((r) => r.id)).toEqual(['r2']);
    const next = followRecordedValue(rows, 'email', 'a@x', 'b@x');
    expect(next.map((r) => r.values.email)).toEqual(['a@x', 'bad', 'b@x']); // row 1 is set by the caller
  });
});
