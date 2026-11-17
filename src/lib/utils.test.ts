import { cn } from './utils';

describe('cn', () => {
  it('keeps a token font size next to a text colour', () => {
    expect(cn('text-label text-text-muted')).toBe('text-label text-text-muted');
  });
  it('lets a later font size win', () => {
    expect(cn('text-label', 'text-h1')).toBe('text-h1');
  });
});

describe('cn with design-token names (D79)', () => {
  it('keeps a token font size and a token colour together', () => {
    expect(cn('text-text', 'text-dense')).toBe('text-text text-dense');
    expect(cn('text-base', 'text-dense')).toBe('text-dense');
  });
  it('keeps the select chevron image and the surface colour together', () => {
    expect(cn('bg-surface', 'bg-select-chevron')).toBe('bg-surface bg-select-chevron');
  });
  it('treats token shadows as shadows', () => {
    expect(cn('shadow-popover', 'shadow-overlay')).toBe('shadow-overlay');
  });
});
