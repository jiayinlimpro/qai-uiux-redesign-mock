import {
  contentToSteps,
  idPrefixOf,
  isBlankRow,
  normaliseHeader,
  parseBrowserList,
  readTemplateCsv,
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
