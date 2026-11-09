import { cn } from './utils';

describe('cn', () => {
  it('keeps a token font size next to a text colour', () => {
    expect(cn('text-label text-text-muted')).toBe('text-label text-text-muted');
  });
  it('lets a later font size win', () => {
    expect(cn('text-label', 'text-h1')).toBe('text-h1');
  });
});
