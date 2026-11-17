import { isThemeChoice, resolveTheme } from './theme';

describe('resolveTheme (D79)', () => {
  it('follows the system setting when the choice is system', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });
  it('keeps an explicit choice whatever the system says', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
});

describe('isThemeChoice', () => {
  it('accepts the three choices only', () => {
    expect(['system', 'light', 'dark'].every(isThemeChoice)).toBe(true);
    expect(isThemeChoice('blue')).toBe(false);
    expect(isThemeChoice(null)).toBe(false);
  });
});
