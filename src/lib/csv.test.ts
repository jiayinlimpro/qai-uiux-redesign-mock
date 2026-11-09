import { parseCsv } from './csv';

describe('parseCsv', () => {
  it('parses quoted fields with commas, quotes and newlines', () => {
    const text = 'a,b,c\r\n1,"x, y","say ""hi"""\n2,"line1\nline2",\n';
    expect(parseCsv(text)).toEqual([
      ['a', 'b', 'c'],
      ['1', 'x, y', 'say "hi"'],
      ['2', 'line1\nline2', ''],
    ]);
  });

  it('strips a UTF-8 BOM and handles a missing final newline', () => {
    expect(parseCsv('\uFEFFa,b\n1,2')).toEqual([['a', 'b'], ['1', '2']]);
  });
});
