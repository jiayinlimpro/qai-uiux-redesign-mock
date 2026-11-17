import type { GlobalSettings } from '@/data/types';

export type ThemeChoice = GlobalSettings['theme'];
export type Theme = 'light' | 'dark';

/** Global settings › Appearance (D79): "Follow system" takes the operating system's light or dark setting. */
export function resolveTheme(choice: ThemeChoice, systemPrefersDark: boolean): Theme {
  if (choice === 'system') return systemPrefersDark ? 'dark' : 'light';
  return choice;
}

/** Key for the last theme choice on this device, read before the app starts (index.html) so the first paint matches. */
export const THEME_STORAGE_KEY = 'qai.theme';

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return value === 'system' || value === 'light' || value === 'dark';
}
