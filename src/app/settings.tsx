import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getGlobalSettings } from '@/data/api';
import type { GlobalSettings } from '@/data/types';
import { ErrorState, LoadingState } from '@/components/StateViews';
import { resolveTheme, THEME_STORAGE_KEY, type ThemeChoice } from '@/lib/theme';
import { useAsync } from './hooks/useAsync';
import { paths, to } from './routes';

/**
 * Applies the Appearance choice as <html data-theme="light|dark"> (D79). "Follow system" tracks the OS while it is chosen.
 * The choice is also remembered on this device so index.html can set the theme before the first paint.
 * Returns a cleanup that stops tracking the OS.
 */
function applyTheme(choice: ThemeChoice): () => void {
  try {
    globalThis.localStorage?.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // Storage unavailable: the theme still applies; only the first paint of the next start may differ.
  }
  const media = globalThis.matchMedia?.('(prefers-color-scheme: dark)');
  const apply = () => {
    document.documentElement.dataset.theme = resolveTheme(choice, media?.matches ?? false);
  };
  apply();
  if (choice !== 'system' || !media) return () => {};
  media.addEventListener('change', apply);
  return () => media.removeEventListener('change', apply);
}

interface SettingsContextValue {
  settings: GlobalSettings;
  /** Re-read after a change (save, reset, restore). The current settings stay on screen meanwhile. */
  reload: () => Promise<GlobalSettings>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function useGlobalSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useGlobalSettings must be used inside SettingsRoot');
  return value;
}

/** Loads global settings once for the whole of QAI and applies the theme choice to <html data-theme>. */
export function SettingsRoot({ children }: { children?: ReactNode }) {
  const initial = useAsync(getGlobalSettings, []);
  const [latest, setLatest] = useState<GlobalSettings | null>(null);
  const settings = latest ?? (initial.status === 'ready' ? initial.data : null);

  const reload = useCallback(async () => {
    const next = await getGlobalSettings();
    setLatest(next);
    return next;
  }, []);

  const themeChoice = settings?.theme;
  useEffect(() => {
    if (themeChoice) return applyTheme(themeChoice);
  }, [themeChoice]);

  if (!settings) {
    if (initial.status === 'error') {
      return (
        <main className="flex h-full items-start justify-center bg-bg pt-24">
          <ErrorState title="Couldn't load your settings" message={initial.error.message} onRetry={initial.retry} />
        </main>
      );
    }
    return <LoadingState label="Starting QAI…" />;
  }
  return <SettingsContext.Provider value={{ settings, reload }}>{children ?? <Outlet />}</SettingsContext.Provider>;
}

/**
 * First launch (03): with no AI provider configured every screen goes to Welcome,
 * and Welcome is only shown while no provider exists.
 */
export function FirstLaunchGate() {
  const { settings } = useGlobalSettings();
  const onWelcome = useLocation().pathname === paths.welcome;
  const firstLaunch = settings.providers.length === 0;
  if (firstLaunch && !onWelcome) return <Navigate to={to.welcome()} replace />;
  if (!firstLaunch && onWelcome) return <Navigate to={to.projects()} replace />;
  return <Outlet />;
}
