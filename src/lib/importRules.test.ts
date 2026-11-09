import {
  contentToSteps,
  idPrefixOf,
  isBlankRow,
  normaliseHeader,
  parseBrowserList,
  planImport,
  readTemplateCsv,
  recognisedColumns,
  TEMPLATE_COLUMNS,
  templateCsv,
  updateFromRow,
} from './importRules';

describe('BR-IMPORT-02 normaliseHeader', () => {
  it('treats case, spaces, hyphens and underscores as equivalent', () => {
    expect(normaliseHeader('Browser Type')).toBe('browser_type');
    expect(normaliseHeader('task-content')).toBe('task_content');
    expect(normaliseHeader(' EXPECTED_result ')).toBe('expected_result');
  });
});

describe('BR-IMPORT-04 isBlankRow', () => {
  it('detects rows with only whitespace', () => {
    expect(isBlankRow(['', ' ', ''])).toBe(true);
    expect(isBlankRow(['', 'x'])).toBe(false);
  });
});

describe('BR-IMPORT-03 contentToSteps', () => {
  it('turns numbered lines into steps', () => {
    expect(contentToSteps('1. Open page\n2) Click\n   and wait\n3. Check')).toEqual([
      'Open page',
      'Click and wait',
      'Check',
    ]);
  });
  it('keeps un-numbered content as one step', () => {
    expect(contentToSteps('Open the page. Click the button.')).toEqual(['Open the page. Click the button.']);
    expect(contentToSteps('  ')).toEqual([]);
  });
});

describe('BR-IMPORT-03 parseBrowserList', () => {
  it('maps safari to webkit and drops unknown names', () => {
    expect(parseBrowserList('chrome, Firefox,safari,opera')).toEqual(['chrome', 'firefox', 'webkit']);
    expect(parseBrowserList('')).toBeUndefined();
  });
});

describe('readTemplateCsv', () => {
  it('matches headers leniently, lists unknown columns and removes blank rows', () => {
    const csv = 'Task ID,Task-Content,Copilot Mode\nA-01,Do it,TRUE\n,,\nA-02,Do more,FALSE\n';
    const parsed = readTemplateCsv(csv);
    expect(parsed.rowsRead).toBe(2);
    expect(parsed.ignoredColumns).toEqual(['Copilot Mode']);
    expect(parsed.rows[0]).toEqual({ task_id: 'A-01', task_content: 'Do it' });
  });
});

describe('BR-TEST-01 idPrefixOf', () => {
  it('takes the part before the last hyphen', () => {
    expect(idPrefixOf('CNT-04')).toBe('CNT');
    expect(idPrefixOf('CONS-02')).toBe('CONS');
  });
});

describe('BR-IMPORT-05/06 planImport', () => {
  const tests = [
    { id: 't-cnt-01', testId: 'CNT-01', suiteId: 's-cnt' },
    { id: 't-cnt-02', testId: 'CNT-02', suiteId: 's-cnt' },
  ];
  const suites = [{ id: 's-cnt', name: '09 Contact Us', idPrefix: 'CNT' }];
  const rows = [
    { task_id: 'CNT-01', category: '09 contact us', task_content: 'Open contact' }, // existing ID, existing suite (case-insensitive)
    { task_id: 'LOG-01', category: 'Login', task_content: '1. Open login\n2. Sign in' }, // new suite from the ID prefix
    { task_id: '', category: 'Login', task_content: 'Open login and fail' }, // no ID → next of the suite prefix
    { task_id: 'X-9', category: '', task_content: 'Free test' }, // no category → Not in a suite, keeps its free ID
    { task_id: 'LOG-01', category: 'Login', task_content: 'Again' }, // repeated in the file → new ID
    { task_id: 'Z-1', category: 'Login', task_content: '   ' }, // no steps → skipped
  ];
  it('update: existing IDs update; suites reused or created; IDs per BR-TEST-01', () => {
    const plan = planImport(rows, tests, suites, 'update');
    expect(plan.rows.map((r) => (r.action === 'skip' ? `skip:${r.reason}` : `${r.action}:${r.testId}:${r.suite ?? '-'}`))).toEqual([
      'update:CNT-01:09 contact us',
      'create:LOG-01:Login',
      'create:LOG-02:Login',
      'create:X-9:-',
      'create:LOG-03:Login',
      'skip:no_steps',
    ]);
    expect(plan.newSuites).toEqual([{ name: 'Login', idPrefix: 'LOG' }]);
    expect(plan).toMatchObject({ duplicates: ['CNT-01'], repeatedInFile: ['LOG-01'], rowsWithoutSteps: 1 });
  });
  it('skip and import as new', () => {
    expect(planImport(rows.slice(0, 1), tests, suites, 'skip').rows[0]).toMatchObject({ action: 'skip', reason: 'duplicate' });
    expect(planImport(rows.slice(0, 1), tests, suites, 'import_as_new').rows[0]).toMatchObject({ action: 'create', testId: 'CNT-03' });
  });
  it('a new suite never gets a taken prefix or "T"', () => {
    const plan = planImport([{ task_id: 'CNT-50', category: 'Contact 2', task_content: 'x' }, { task_id: 'T-50', category: 'Temp', task_content: 'y' }], tests, suites, 'update');
    expect(plan.newSuites).toEqual([
      { name: 'Contact 2', idPrefix: 'CNT2' },
      { name: 'Temp', idPrefix: 'TS' },
    ]);
  });
});

describe('BR-IMPORT-01 template / recognised columns', () => {
  it('the template parses back with every column recognised and one row', () => {
    const parsed = readTemplateCsv(templateCsv());
    expect(recognisedColumns(parsed.header)).toEqual([...TEMPLATE_COLUMNS]);
    expect(parsed.rows).toHaveLength(1);
    expect(contentToSteps(parsed.rows[0]!.task_content!)).toHaveLength(3);
  });
});

describe('D50 updateFromRow (import Update)', () => {
  const current = { title: 'Old title', description: 'Old description', startPage: 'https://uat.x', browserPreference: ['chrome' as const], expectedResult: 'Shown' };
  it('missing columns keep values; empty cells clear them; filled cells replace them', () => {
    const { next, cleared } = updateFromRow(current, { title: 'New title', description: '', base_url: '' });
    expect(next).toEqual({ title: 'New title', browserPreference: ['chrome'], expectedResult: 'Shown' });
    expect(cleared).toEqual(['description', 'start page']);
  });
  it('an empty title cell clears the title (the first step is used instead)', () => {
    expect(updateFromRow(current, { title: '' })).toEqual({ next: { ...current, title: '' }, cleared: ['title'] });
  });
  it('clearing an already empty field is not counted', () => {
    expect(updateFromRow({ title: 'T' }, { description: '', preconditions: '' }).cleared).toEqual([]);
  });
  it('browser_type with no known browser clears the preference', () => {
    expect(updateFromRow(current, { browser_type: 'opera' })).toMatchObject({ cleared: ['browser preference'] });
  });
});
