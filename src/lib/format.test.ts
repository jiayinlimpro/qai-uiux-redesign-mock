import { formatDate, formatDuration, formatStarted, plural } from './format';

describe('format', () => {
  it('formats dates the same everywhere', () => {
    expect(formatDate('2026-09-01T11:00:00.000Z')).toBe('1 Sep 2026');
  });
  it('pluralises', () => {
    expect(plural(1, 'run')).toBe('1 run');
    expect(plural(3, 'run')).toBe('3 runs');
  });
});

describe('run formats', () => {
  it('formatDuration', () => {
    expect(formatDuration(45_000)).toBe('45s');
    expect(formatDuration(174_000)).toBe('2m 54s');
    expect(formatDuration(3_900_000)).toBe('1h 05m');
  });
  it('formatStarted', () => {
    const now = new Date(2026, 10, 10, 12, 0);
    expect(formatStarted(new Date(2026, 10, 10, 10, 2).toISOString(), now)).toBe('Today 10:02');
    expect(formatStarted(new Date(2026, 10, 9, 16, 40).toISOString(), now)).toBe('Yesterday 16:40');
    expect(formatStarted(new Date(2026, 9, 16, 9, 0).toISOString(), now)).toBe('16 Oct');
    expect(formatStarted(new Date(2025, 9, 16, 9, 0).toISOString(), now)).toBe('16 Oct 2025');
  });
});
