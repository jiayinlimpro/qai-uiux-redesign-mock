import { formatDate, plural } from './format';

describe('format', () => {
  it('formats dates the same everywhere', () => {
    expect(formatDate('2026-09-01T11:00:00.000Z')).toBe('1 Sep 2026');
  });
  it('pluralises', () => {
    expect(plural(1, 'run')).toBe('1 run');
    expect(plural(3, 'run')).toBe('3 runs');
  });
});
