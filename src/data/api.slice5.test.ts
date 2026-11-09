import * as api from './api';
import { resetMockDb, setMockLatency } from './mock/store';

beforeAll(() => setMockLatency(0));
beforeEach(() => resetMockDb());

const csv = (text: string, name = 'tests.csv') => new File([text], name, { type: 'text/csv' });
const sample = () => api.sampleImportFileForPrototype();

describe('import check (3.3, BR-IMPORT)', () => {
  it('reads the sample: 83 rows, recognised and ignored columns, all duplicates in qcfixer.com', async () => {
    const c = await api.importCheck('p-qcfixer', sample());
    expect(c).toMatchObject({ rowsRead: 83, missingRequired: false, simulatedExcel: false, rowsWithoutSteps: 0, repeatedInFile: [] });
    expect(c.recognised).toEqual(['task_id', 'task_content', 'base_url', 'expected_result', 'expected_keywords', 'title', 'description', 'category', 'Browser Type']);
    expect(c.ignored).toEqual(['Copilot Mode']);
    expect(c.duplicates).toHaveLength(83);
    expect(c.previews.skip).toEqual({ suites: [], skipped: 83, fieldsCleared: 0 });
    expect(c.previews.update.suites).toHaveLength(12);
    expect(c.previews.update.suites.every((s) => !s.isNew && s.create === 0)).toBe(true);
    expect(c.previews.import_as_new.suites.reduce((n, s) => n + s.create, 0)).toBe(83);
  });
  it('an Excel file is read as the sample (prototype); other types are refused', async () => {
    expect(await api.importCheck('p-hrms', new File(['x'], 'tasks.xlsx'))).toMatchObject({ simulatedExcel: true, rowsRead: 83 });
    await expect(api.importCheck('p-hrms', new File(['x'], 'tasks.txt'))).rejects.toBeInstanceOf(api.UnsupportedImportFileError);
  });
  it('no task_content column → blocking', async () => {
    const c = await api.importCheck('p-hrms', csv('task_id,title\nA-1,Hello\n'));
    expect(c.missingRequired).toBe(true);
    await expect(api.importCommit('p-hrms', csv('task_id,title\nA-1,Hello\n'), 'update')).rejects.toBeInstanceOf(api.InvalidFileError);
  });
});

describe('import commit (BR-IMPORT-05/06)', () => {
  it('into an empty project: 83 tests, 12 suites from the categories with the ID prefixes', async () => {
    const r = await api.importCommit('p-hrms', sample(), 'update');
    expect(r).toEqual({ created: 83, updated: 0, skipped: 0, suitesCreated: 12 });
    const suites = await api.listSuites('p-hrms');
    expect(suites.map((s) => s.idPrefix).sort()).toEqual(['ABT', 'CNT', 'CONS', 'FTR', 'GEN', 'HOME', 'NAV', 'NWS', 'PRC', 'PRT', 'SVC', 'WA']);
    const t = (await api.listTests('p-hrms', { search: 'CNT-04' }))[0]!;
    expect(t).toMatchObject({ source: 'import', version: 1, script: { state: 'none' }, suiteId: suites.find((s) => s.idPrefix === 'CNT')!.id });
  });
  it('update: unchanged tests keep their version; changed ones get a new version (script per BR-SCRIPT-02)', async () => {
    const r = await api.importCommit('p-qcfixer', sample(), 'update');
    expect(r).toMatchObject({ created: 0, updated: 83, suitesCreated: 0 });
    expect((await api.getTest('t-nav-01')).version).toBe(1); // same content as the file
    const cnt04 = await api.getTest('t-cnt-04'); // v2 had 3 steps; the file has the original paragraph
    expect(cnt04.version).toBe(3);
    expect(cnt04.steps).toHaveLength(1);
  });
  it('skip leaves everything; import as new adds copies with new IDs', async () => {
    expect(await api.importCommit('p-qcfixer', sample(), 'skip')).toEqual({ created: 0, updated: 0, skipped: 83, suitesCreated: 0 });
    const r = await api.importCommit('p-qcfixer', csv('task_id,category,task_content\nCNT-01,09 Contact Us,Open contact page\n'), 'import_as_new');
    expect(r.created).toBe(1);
    expect((await api.listTests('p-qcfixer', { search: 'CNT-05' }))[0]!.title).toBe('Open contact page');
  });
  it('rows without a category go to Not in a suite', async () => {
    await api.importCommit('p-hrms', csv('task_content\nCheck the leave form\n'), 'update');
    const [t] = await api.listTests('p-hrms');
    expect(t).toMatchObject({ suiteId: null, testId: 'T-01', title: 'Check the leave form' });
  });
});

describe('createTest (3.2)', () => {
  it('creates v1 Written with no script; ID must be free; steps required', async () => {
    const t = await api.createTest({ projectId: 'p-qcfixer', suiteId: null, testId: 'T-03', title: '', steps: ['Open the homepage', ''], linkedKnowledge: [] });
    expect(t).toMatchObject({ version: 1, source: 'written', script: { state: 'none' }, title: 'Open the homepage', steps: ['Open the homepage'] });
    await expect(api.createTest({ projectId: 'p-qcfixer', suiteId: null, testId: 't-03', title: 'x', steps: ['a'], linkedKnowledge: [] })).rejects.toBeInstanceOf(api.DuplicateTestIdError);
  });
});

describe('D50 import Update: missing column keeps, empty cell clears', () => {
  it('counts and clears fields with empty cells; keeps fields whose column is missing', async () => {
    const before = await api.getTest('t-cnt-04');
    expect(before.expectedResult).toBeTruthy();
    const file = csv('task_id,category,task_content,expected_result,description\nCNT-04,,Check the phone link,,\n');
    const c = await api.importCheck('p-qcfixer', file);
    // expected result + suite (empty category cell) + description if CNT-04 had one
    expect(c.previews.update.fieldsCleared).toBe(2 + (before.description ? 1 : 0));
    await api.importCommit('p-qcfixer', file, 'update');
    const after = await api.getTest('t-cnt-04');
    expect(after.expectedResult).toBeUndefined();
    expect(after.suiteId).toBeNull(); // category column present, empty → Not in a suite
    expect(after.title).toBe(before.title); // title column missing → kept
    expect(after.steps).toEqual(['Check the phone link']);
  });
});
